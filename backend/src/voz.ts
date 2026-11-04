import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Request, Response } from 'express'
import { config } from './config.ts'
import { esperarServidorVoz } from './servidorVoz.ts'

// Voz en tiempo real: la app pide una frase y este backend se la pide al
// servidor de Pocket-TTS (voz Lola o la voz de referencia clonada). Cada frase
// se guarda en disco: la segunda vez que alguien la necesita sale al instante y
// no ocupa el procesador.

const MAX_CARACTERES = 300

mkdirSync(config.vozCache, { recursive: true })

// Frases que se están generando: si otro niño pide la misma, espera ese audio.
// `esperando`: quiénes la esperan todavía (los que cerraron la conexión salen).
const enCurso = new Map<string, { promesa: Promise<void>; esperando: Set<Response> }>()

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

// Pocket-TTS transmite el WAV mientras lo genera y la cabecera declara un largo
// enorme. Al guardarlo se corrigen los tamaños, para que el navegador sepa
// cuánto dura y avise al terminar.
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

// ---------- Turnos ----------

// El modelo genera una frase a la vez. Lo que un niño está esperando oír pasa
// antes que lo que se pide de antemano (precarga de la siguiente ronda).
const cola: { urgente: boolean; empezar: () => void }[] = []
let ocupado = false

function esperarTurno(urgente: boolean) {
  return new Promise<void>((ok) => {
    const empezar = () => {
      ocupado = true
      ok()
    }
    if (!ocupado) return empezar()
    const i = urgente ? cola.findIndex((c) => !c.urgente) : -1
    if (i < 0) cola.push({ urgente, empezar })
    else cola.splice(i, 0, { urgente, empezar })
  })
}

function soltarTurno() {
  ocupado = false
  cola.shift()?.empezar()
}

const esConexionRechazada = (e: unknown) => /ECONNREFUSED|ECONNRESET|fetch failed/.test(detalleError(e))

// Pide la frase a Pocket-TTS y la guarda completa en `archivo`. Reintenta si el
// servidor aún no acepta conexiones (recién levantado).
async function generar(texto: string, archivo: string) {
  const temporal = `${archivo}.${process.pid}.tmp`
  for (let intento = 1; ; intento++) {
    try {
      const formulario = new FormData()
      formulario.set('text', paraLeer(texto))
      const r = await fetch(`${config.pocketTtsUrl}/tts`, { method: 'POST', body: formulario, signal: AbortSignal.timeout(30_000) })
      if (!r.ok) throw new Error(`pocket-tts respondió ${r.status}`)
      writeFileSync(temporal, Buffer.from(await r.arrayBuffer()))
      corregirCabeceraWav(temporal)
      renameSync(temporal, archivo)
      return
    } catch (e) {
      rmSync(temporal, { force: true })
      if (intento >= 3 || !esConexionRechazada(e)) throw e
      await new Promise((ok) => setTimeout(ok, 1500))
    }
  }
}

// ---------- Ruta ----------

// GET /api/voz?texto=…[&precarga=1] → audio/wav. 503 si el servidor de voz no
// responde: la app sigue sin voz (no hay voz de respaldo).
export async function voz(req: Request, res: Response) {
  const texto = typeof req.query.texto === 'string' ? normalizar(req.query.texto) : ''
  if (!texto || texto.length > MAX_CARACTERES) {
    res.status(400).json({ error: 'texto_invalido' })
    return
  }
  const archivo = resolve(config.vozCache, `${clave(texto)}.wav`)
  // Con el largo correcto y soporte de rangos: el navegador sabe cuándo termina
  // y no vuelve a pedir (ni a repetir) el audio.
  const enviar = () =>
    res.sendFile(archivo, { dotfiles: 'allow', headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'public, max-age=31536000, immutable' } })

  if (existsSync(archivo)) return enviar()

  let tarea = enCurso.get(texto)
  if (!tarea) {
    const precarga = req.query.precarga === '1'
    const esperando = new Set<Response>()
    const promesa = (async () => {
      await esperarServidorVoz()
      await esperarTurno(!precarga)
      try {
        // Nadie la espera ya (el niño pasó a otra frase): no se ocupa el modelo en ella.
        if (!precarga && esperando.size === 0) return
        if (!existsSync(archivo)) await generar(texto, archivo)
      } finally {
        soltarTurno()
      }
    })().finally(() => enCurso.delete(texto))
    tarea = { promesa, esperando }
    enCurso.set(texto, tarea)
  }
  const { esperando } = tarea
  esperando.add(res)
  // En la respuesta y no en `req`: desde Node 16 `req` avisa «close» apenas termina de llegar.
  res.on('close', () => esperando.delete(res))

  try {
    await tarea.promesa
  } catch (e) {
    console.warn(`[voz] No se pudo generar desde ${config.pocketTtsUrl}: ${detalleError(e)}`)
  }
  if (res.headersSent || res.destroyed) return
  if (existsSync(archivo)) return enviar()
  res.status(503).json({ error: 'voz_no_disponible' })
}
