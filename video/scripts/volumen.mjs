import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
const pnpm = join('..', 'node_modules', '.pnpm')
const paquete = readdirSync(pnpm).find((d) => d.startsWith('@remotion+compositor-win32'))
const ffmpeg = join(pnpm, paquete, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe')
const [video, ...ventanas] = process.argv.slice(2)
for (const v of ventanas) {
  const [nombre, desde, dur] = v.split('|')
  const pcm = execFileSync(ffmpeg, ['-loglevel', 'error', '-ss', desde, '-t', dur, '-i', video, '-vn', '-ac', '1', '-ar', '16000', '-f', 'wav', '-'], { maxBuffer: 1 << 28 })
  const datos = pcm.indexOf('data') + 8
  const s = new Int16Array(pcm.buffer.slice(pcm.byteOffset + datos, pcm.byteOffset + datos + ((pcm.length - datos) & ~1)))
  let suma = 0, max = 0
  for (const x of s) { suma += x * x; if (Math.abs(x) > max) max = Math.abs(x) }
  const db = (x) => (x > 0 ? (20 * Math.log10(x / 32768)).toFixed(1) : '-inf')
  console.log(`${nombre.padEnd(36)} RMS ${db(Math.sqrt(suma / s.length)).padStart(6)} dB · pico ${db(max).padStart(6)} dB`)
}
