// Hojas de contacto de un render: un cuadro por plano (pasada la mitad), con su nombre
// y su minuto, para revisar el corte de un vistazo.
// Uso: node scripts/hoja.mjs <video.mp4> <carpeta de salida>
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { FPS, construir } from '../src/linea.ts'

const [video, salida, cual = 'completo'] = process.argv.slice(2)
const raiz = fileURLToPath(new URL('..', import.meta.url))
const pnpm = join(raiz, '..', 'node_modules', '.pnpm')
const paquete = readdirSync(pnpm).find((d) => d.startsWith('@remotion+compositor-win32'))
const ffmpeg = join(pnpm, paquete, 'node_modules', '@remotion', paquete.split('@')[1].replace('remotion+', ''), 'ffmpeg.exe')

const l = construir(JSON.parse(readFileSync(join(raiz, 'src', 'tomas.json'), 'utf8')), cual)
const tmp = join(salida, '_cuadros')
rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })
const reloj = (f) => `${Math.floor(f / FPS / 60)}:${String(Math.floor((f / FPS) % 60)).padStart(2, '0')}`
l.planos.forEach((p, i) => {
  const t = (p.desde + p.frames * 0.6) / FPS
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', t.toFixed(2), '-i', video, '-frames:v', '1', '-vf', 'scale=640:-1', join(tmp, `f${i}.png`)])
})
const b = await chromium.launch({ channel: 'chrome' })
const pagina = await b.newPage({ viewport: { width: 1980, height: 1580 } })
const POR_HOJA = 12
for (let h = 0; h * POR_HOJA < l.planos.length; h++) {
  const celdas = l.planos.slice(h * POR_HOJA, (h + 1) * POR_HOJA).map((p, k) => `<figure><img src="f${h * POR_HOJA + k}.png"><figcaption>${reloj(p.desde)} · ${p.id}</figcaption></figure>`).join('')
  writeFileSync(join(tmp, 'hoja.html'), `<body style="margin:8px;display:grid;grid-template-columns:repeat(3,640px);gap:10px;font:20px system-ui">${celdas}<style>figure{margin:0}img{display:block;width:640px}figcaption{padding:2px 4px}</style>`)
  await pagina.goto(pathToFileURL(join(tmp, 'hoja.html')).href)
  await pagina.screenshot({ path: join(salida, `hoja-${h + 1}.png`), fullPage: true })
  console.log(`hoja-${h + 1}`)
}
await b.close()
rmSync(tmp, { recursive: true, force: true })
