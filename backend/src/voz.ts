import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import type { ReadableStream as StreamWeb } from 'node:stream/web'
import type { Request, Response } from 'express'
import { config } from './config.ts'

// Voz en tiempo real: la app pide una frase y este backend se la pide al
// servidor de Pocket-TTS (que imita la voz de referencia), y la reenvía al
// navegador a medida que se genera. Cada frase se guarda en disco: la segunda
// vez que alguien la necesita sale al instante y no ocupa el procesador.

const MAX_CARACTERES = 300

mkdirSync(config.vozCache, { recursive: true })

// Frases que se están generando: si otro niño pide la misma, espera ese audio.
const enCurso = new Map<string, Promise<void>>()

const normalizar = (t: string) => t.replace(/\s+/g, ' ').trim()
const clave = (t: string) => createHash('sha1').update(normalizar(t)).digest('hex').slice(0, 20)

function detalleError(error: unknown, vistos = new Set<Error>()): string {
  if (!(error instanceof Error)) return String(error)
  if (vistos.has(error)) return error.name
  vistos.add(error)

  const detalle = [`${error.name}: ${error.message}`]
  if (error instanceof AggregateError && error.errors.length > 0) {
    detalle.push(...Array.from(error.errors, (causa) => detalleError(causa, vistos)))
  } else if (error.cause !== undefined) {
    detalle.push(detalleError(error.cause, vistos))
  }
  return detalle.join(' → ')
}

// ---------- Números en palabras (el modelo lee mejor «cincuenta» que «50») ----------

const UNIDADES =
  'cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho diecinueve veinte veintiuno veintidós veintitrés veinticuatro veinticinco veintiséis veintisiete veintiocho veintinueve'.split(
    ' ',
  )
const DECENAS: Record<number, string> = { 3: 'treinta', 4: 'cuarenta', 5: 'cincuenta', 6: 'sesenta', 7: 'setenta', 8: 'ochenta', 9: 'noventa' }
const CENTENAS: Record<number, string> = { 1: 'ciento', 2: 'doscientos', 3: 'trescientos', 4: 'cuatrocientos', 5: 'quinientos' }

function enPalabras(n: number): string {
  if (n < 30) return UNIDADES[n]
  if (n < 100) return DECENAS[Math.floor(n / 10)] + (n % 10 ? ` y ${UNIDADES[n % 10]}` : '')
  if (n === 100) return 'cien'
  if (n < 600) return `${CENTENAS[Math.floor(n / 100)]}${n % 100 ? ` ${enPalabras(n % 100)}` : ''}`
  return String(n)
}

export function paraLeer(texto: string) {
  return normalizar(texto)
    .replace(/\d+/g, (d) => enPalabras(Number(d)))
    .replace(/\buno(?= sílaba)/g, 'una')
    .replace(/\b(veinti)?uno(?= (monedas|globos))/g, (_, v) => (v ? 'veintiún' : 'un'))
}

// Un WAV transmitido mientras se genera no sabe su largo y declara uno enorme.
// Al guardarlo se corrigen los tamaños de la cabecera, para que el navegador
// sepa cuánto dura y avise al terminar.
function corregirCabeceraWav(archivo: string) {
  const b = readFileSync(archivo)
  if (b.toString('ascii', 0, 4) !== 'RIFF') return
  let i = 12
  while (i + 8 <= b.length) {
    if (b.toString('ascii', i, i + 4) === 'data') {
      b.writeUInt32LE(b.length - (i + 8), i + 4)
      b.writeUInt32LE(b.length - 8, 4)
      writeFileSync(archivo, b)
      return
    }
    i += 8 + b.readUInt32LE(i + 4)
  }
}

// ---------- Ruta ----------

// GET /api/voz?texto=… → audio/wav. 503 si el servidor de voz no responde:
// la app entonces usa los audios pregrabados o la voz del navegador.
export async function voz(req: Request, res: Response) {
  const texto = typeof req.query.texto === 'string' ? normalizar(req.query.texto) : ''
  if (!texto || texto.length > MAX_CARACTERES) {
    res.status(400).json({ error: 'texto_invalido' })
    return
  }
  const archivo = join(config.vozCache, `${clave(texto)}.wav`)
  const enviarGuardado = () => {
    res.setHeader('Content-Type', 'audio/wav')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    createReadStream(archivo).pipe(res)
  }

  if (existsSync(archivo)) return enviarGuardado()
  const pendiente = enCurso.get(texto)
  if (pendiente) {
    await pendiente
    if (existsSync(archivo)) return enviarGuardado()
    res.status(503).json({ error: 'voz_no_disponible' })
    return
  }

  let terminar!: () => void
  enCurso.set(texto, new Promise<void>((ok) => (terminar = ok)))
  const temporal = `${archivo}.${process.pid}.tmp`
  try {
    const formulario = new FormData()
    formulario.set('text', paraLeer(texto))
    const r = await fetch(`${config.pocketTtsUrl}/tts`, { method: 'POST', body: formulario, signal: AbortSignal.timeout(20_000) })
    if (!r.ok || !r.body) throw new Error(`pocket-tts respondió ${r.status}`)

    res.setHeader('Content-Type', 'audio/wav')
    res.setHeader('Cache-Control', 'no-store')
    const copia = createWriteStream(temporal)
    const audio = Readable.fromWeb(r.body as StreamWeb<Uint8Array>)
    // Se envía al niño mientras se genera, y a la vez se guarda en disco.
    audio.on('data', (trozo: Buffer) => {
      res.write(trozo)
      copia.write(trozo)
    })
    await new Promise<void>((ok, mal) => {
      audio.on('end', ok)
      audio.on('error', mal)
    })
    res.end()
    await new Promise<void>((ok) => copia.end(ok))
    corregirCabeceraWav(temporal)
    renameSync(temporal, archivo)
    terminar()
  } catch (e) {
    rmSync(temporal, { force: true })
    terminar()
    console.warn(`[voz] No se pudo generar desde ${config.pocketTtsUrl}: ${detalleError(e)}`)
    if (!res.headersSent) res.status(503).json({ error: 'voz_no_disponible' })
    else res.end()
  } finally {
    enCurso.delete(texto)
  }
}
