import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { config } from './config.ts'

// Levanta el servidor de Pocket-TTS junto con el backend (POCKET_TTS_COMANDO,
// por defecto `pocket-tts serve --language spanish ...`). Si ya hay uno
// corriendo en POCKET_TTS_URL no levanta otro. Se cierra junto con el backend,
// también al reiniciarse con --watch.

let proceso: ChildProcess | null = null
// Se resuelve cuando el servidor de voz está listo para recibir frases (o
// cuando se sabe que no va a estarlo): las primeras peticiones lo esperan en
// vez de fallar mientras el modelo carga.
let avisarListo: (listo: boolean) => void = () => {}
let listo: Promise<boolean> = Promise.resolve(true)
const CARGA_MAXIMA_MS = 120_000

export function esperarServidorVoz() {
  return Promise.race([listo, new Promise<boolean>((ok) => setTimeout(() => ok(false), CARGA_MAXIMA_MS))])
}

async function yaCorre() {
  try {
    await fetch(config.pocketTtsUrl, { signal: AbortSignal.timeout(1500) })
    return true
  } catch {
    return false
  }
}

export async function levantarServidorVoz() {
  const comando = config.pocketTtsComando.trim()
  if (!comando || comando === 'no') return
  if (await yaCorre()) {
    console.log(`[voz] Pocket-TTS ya está corriendo en ${config.pocketTtsUrl}.`)
    return
  }
  listo = new Promise<boolean>((ok) => (avisarListo = ok))
  console.log(`[voz] Levantando Pocket-TTS: ${comando}`)
  proceso = spawn(comando, { shell: true, stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
  let puertoOcupado = false
  const mostrar = (linea: string) => {
    if (/10048|address already in use|attempting to bind/i.test(linea)) {
      puertoOcupado = true
      return
    }
    if (/Uvicorn running/.test(linea)) {
      console.log('[voz] Pocket-TTS listo.')
      avisarListo(true)
      return
    }
    // Solo los errores, no cada petición.
    if (/Error|error|Traceback|no se reconoce|not recognized|not found/.test(linea)) console.log(`[voz] ${linea.trim()}`)
  }
  proceso.stdout?.on('data', (d: Buffer) => d.toString().split('\n').forEach(mostrar))
  proceso.stderr?.on('data', (d: Buffer) => d.toString().split('\n').forEach(mostrar))
  proceso.on('exit', async (codigo) => {
    proceso = null
    // Puerto ocupado: queda vivo el de un reinicio anterior (--watch en Windows no
    // alcanza a cerrarlo). Se usa ese apenas termine de cargar.
    if (puertoOcupado) {
      console.log(`[voz] Ya hay un Pocket-TTS en ${config.pocketTtsUrl}: se usa ese.`)
      const hasta = Date.now() + CARGA_MAXIMA_MS
      while (!(await yaCorre()) && Date.now() < hasta) await new Promise((ok) => setTimeout(ok, 1000))
      avisarListo(await yaCorre())
      return
    }
    avisarListo(false)
    if (codigo !== null && codigo !== 0)
      console.warn(
        `[voz] Pocket-TTS se cerró (código ${codigo}). Sin él la app no tiene voz. ` +
          'Revisa que esté instalado (pip install pocket-tts) o pon la ruta completa en POCKET_TTS_COMANDO (backend/.env).',
      )
  })

  const cerrar = () => {
    if (!proceso?.pid) return
    // En Windows, con shell: true hay que cerrar el árbol entero (cmd → python).
    // Síncrono: al salir, Node ya no espera a un proceso lanzado con spawn y
    // Pocket-TTS quedaba vivo ocupando el puerto.
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(proceso.pid), '/T', '/F'], { stdio: 'ignore' })
    else proceso.kill()
  }
  process.on('exit', cerrar)
  for (const senal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(senal, () => {
      cerrar()
      process.exit(0)
    })
  }
}
