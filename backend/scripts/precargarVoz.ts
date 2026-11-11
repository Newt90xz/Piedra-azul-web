// Deja generadas de antemano las frases que la app dice una y otra vez
// (pantallas, instrucciones, premios, actividades y el saludo de cada niño), en
// la misma caché que usa GET /api/voz: así suenan al instante desde la primera vez.
//
//   pnpm voz:precargar                 # todo lo que falte (se puede cortar y retomar)
//   pnpm voz:precargar -- --listar     # solo cuenta lo que hay y lo que falta
//   pnpm voz:precargar -- --max 50     # unas pocas, para probar
//   pnpm voz:precargar -- --sin-nombres
//   pnpm voz:precargar -- --nombres "Sofía,Tomás"   # sin acceso a la base
//
// Levanta Pocket-TTS si no está corriendo (como el backend) y lo cierra al terminar.
// Qué frases son: frontend/src/lib/catalogoVoz.ts. Ver frontend/scripts/voz/README.md.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { frasesDeLaApp, type FraseVoz, type Fuente, type Origen } from '../../frontend/src/lib/catalogoVoz.ts'
import { config } from '../src/config.ts'
import { esperarServidorVoz, levantarServidorVoz } from '../src/servidorVoz.ts'
import { MAX_CARACTERES, archivoDeFrase, generarFrase } from '../src/voz.ts'

const args = process.argv.slice(2)
const soloListar = args.includes('--listar')
const sinNombres = args.includes('--sin-nombres')
const max = args.includes('--max') ? Number(args[args.indexOf('--max') + 1]) : Infinity
const nombresDados = args.includes('--nombres') ? (args[args.indexOf('--nombres') + 1] ?? '').split(',').map((n) => n.trim()).filter(Boolean) : null

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'src')
// Tras tantos fallos seguidos se asume que el servidor de voz se cayó.
const FALLOS_SEGUIDOS_MAX = 5

function leerFuentes(carpeta = SRC): Fuente[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre)
    if (statSync(ruta).isDirectory()) return leerFuentes(ruta)
    if (!/\.tsx?$/.test(nombre)) return []
    return [{ ruta: relative(SRC, ruta).split(sep).join('/'), texto: readFileSync(ruta, 'utf8') }]
  })
}

// Nombres de pila de los niños activos: su saludo también se dice cada día.
// Solo con la clave de servicio del backend (backend/.env); sin ella se omiten.
async function nombresDeLaBase(): Promise<string[]> {
  if (nombresDados) return nombresDados
  if (sinNombres || !config.supabaseUrl || !config.supabaseServiceRoleKey) return []
  try {
    const r = await fetch(`${config.supabaseUrl}/rest/v1/estudiantes?select=nombre&activo=eq.true`, {
      headers: { apikey: config.supabaseServiceRoleKey, Authorization: `Bearer ${config.supabaseServiceRoleKey}` },
      signal: AbortSignal.timeout(15_000),
    })
    // 401/403: la clave no es la service_role (p. ej. es la anon, que no puede leer estudiantes).
    if (r.status === 401 || r.status === 403) throw new Error('SUPABASE_SERVICE_ROLE_KEY no es la clave service_role; usa --nombres para pasarlos')
    if (!r.ok) throw new Error(`Supabase respondió ${r.status}`)
    const filas = (await r.json()) as { nombre: string }[]
    return [...new Set(filas.map((f) => f.nombre.trim()).filter(Boolean))]
  } catch (e) {
    console.warn(`[voz] No se pudieron leer los nombres de los niños (${(e as Error).message}): se omiten sus saludos.`)
    return []
  }
}

const ORDEN: Origen[] = ['pantallas', 'nombres', 'datos', 'premios', 'actividades']
const segundos = (ms: number) => `${Math.round(ms / 1000)} s`
const duracion = (ms: number) => (ms < 90_000 ? segundos(ms) : `${Math.round(ms / 60_000)} min`)

async function main() {
  console.log('[voz] Armando el catálogo de frases…')
  const nombres = await nombresDeLaBase()
  const frases = frasesDeLaApp(leerFuentes(), { nombres }).filter((f) => f.texto.length <= MAX_CARACTERES)
  // Primero lo que más suena: pantallas y saludos, al final las rondas.
  frases.sort((a, b) => ORDEN.indexOf(a.origen) - ORDEN.indexOf(b.origen))

  const pendientes: FraseVoz[] = []
  const resumen = new Map<Origen, { total: number; listas: number }>()
  for (const f of frases) {
    const r = resumen.get(f.origen) ?? { total: 0, listas: 0 }
    r.total++
    if (existsSync(archivoDeFrase(f.texto))) r.listas++
    else pendientes.push(f)
    resumen.set(f.origen, r)
  }

  console.log(`[voz] ${frases.length} frases recurrentes (${nombres.length} nombres de niños):`)
  for (const origen of ORDEN) {
    const r = resumen.get(origen)
    if (r) console.log(`        ${origen.padEnd(12)} ${String(r.total).padStart(5)}   ya generadas: ${r.listas}`)
  }
  const aGenerar = pendientes.slice(0, max)
  console.log(`[voz] Faltan ${pendientes.length}${aGenerar.length < pendientes.length ? `; se generan ${aGenerar.length}` : ''}. Caché: ${config.vozCache}`)
  if (soloListar || aGenerar.length === 0) return

  await levantarServidorVoz()
  if (!(await esperarServidorVoz())) throw new Error(`Pocket-TTS no respondió en ${config.pocketTtsUrl}. Revisa POCKET_TTS_COMANDO en backend/.env.`)

  const inicio = Date.now()
  let hechas = 0
  let fallidas = 0
  let seguidas = 0
  for (const [i, f] of aGenerar.entries()) {
    try {
      const t = Date.now()
      await generarFrase(f.texto, archivoDeFrase(f.texto))
      hechas++
      seguidas = 0
      const promedio = (Date.now() - inicio) / (i + 1)
      if (i < 5 || (i + 1) % 25 === 0 || i === aGenerar.length - 1)
        console.log(`[voz] ${i + 1}/${aGenerar.length} · ${segundos(Date.now() - t)} · faltan ~${duracion(promedio * (aGenerar.length - i - 1))} · «${f.texto}»`)
    } catch (e) {
      fallidas++
      seguidas++
      console.warn(`[voz] No se pudo generar «${f.texto}»: ${(e as Error).message}`)
      if (seguidas >= FALLOS_SEGUIDOS_MAX) throw new Error('El servidor de voz dejó de responder. Lo generado queda guardado: vuelve a correr el script para seguir.')
    }
  }
  console.log(`[voz] Listo en ${duracion(Date.now() - inicio)}: ${hechas} generadas${fallidas ? `, ${fallidas} con error (se generan en vivo cuando suenen)` : ''}.`)
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(`[voz] ${(e as Error).message}`)
    process.exit(1)
  })
