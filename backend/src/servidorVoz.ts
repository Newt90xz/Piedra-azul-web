import { spawn, type ChildProcess } from 'node:child_process'
import { config } from './config.ts'

// Levanta el servidor de Pocket-TTS junto con el backend si POCKET_TTS_COMANDO
// está configurado (p. ej. `pocket-tts serve --language spanish --port 8000`).
// Se cierra cuando se cierra el backend, también al reiniciarse con --watch.

let proceso: ChildProcess | null = null

export function levantarServidorVoz() {
  if (!config.pocketTtsComando) return
  console.log(`[voz] Levantando Pocket-TTS: ${config.pocketTtsComando}`)
  proceso = spawn(config.pocketTtsComando, { shell: true, stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
  const mostrar = (linea: string) => {
    // Solo lo útil: cuándo está listo y los errores, no cada petición.
    if (/Uvicorn running|Error|error|Traceback/.test(linea)) console.log(`[voz] ${linea.trim()}`)
  }
  proceso.stdout?.on('data', (d: Buffer) => d.toString().split('\n').forEach(mostrar))
  proceso.stderr?.on('data', (d: Buffer) => d.toString().split('\n').forEach(mostrar))
  proceso.on('exit', (codigo) => {
    if (codigo !== null && codigo !== 0) console.warn(`[voz] Pocket-TTS se cerró (código ${codigo}). La app usará la voz de respaldo.`)
    proceso = null
  })

  const cerrar = () => {
    if (!proceso?.pid) return
    // En Windows, con shell: true hay que cerrar el árbol entero (cmd → python).
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(proceso.pid), '/T', '/F'])
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
