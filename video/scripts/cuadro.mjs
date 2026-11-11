// Saca cuadros de una captura para revisarla: node scripts/cuadro.mjs <toma> <carpeta> <t1> <t2> …
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const [toma, carpeta, ...tiempos] = process.argv.slice(2)
const raiz = fileURLToPath(new URL('..', import.meta.url))
for (const t of tiempos) {
  execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-ss', t, '-i', `"capturas/${toma}.webm"`, '-frames:v', '1', `"${carpeta}/${toma}-${t}.png"`], { cwd: raiz, shell: true, stdio: 'ignore' })
}
