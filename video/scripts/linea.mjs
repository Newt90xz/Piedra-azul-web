// Muestra la línea de tiempo del corte y escribe subtitulos.srt con los mismos datos
// que usa la edición (src/linea.ts). También avisa si la voz en off tapa algo que dice la app.
// Uso: node scripts/linea.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { FPS, construir } from '../src/linea.ts'

const datos = JSON.parse(readFileSync(new URL('../src/tomas.json', import.meta.url), 'utf8'))
const cual = process.argv[2] === 'corto' ? 'corto' : 'completo'
const l = construir(datos, cual)
const reloj = (f) => `${Math.floor(f / FPS / 60)}:${(f / FPS % 60).toFixed(1).padStart(4, '0')}`

for (const p of l.planos) {
  const vo = l.vos.find((o) => o.desde >= p.desde && o.desde < p.desde + p.frames)
  console.log(`${reloj(p.desde).padStart(6)}  ${(p.frames / FPS).toFixed(1).padStart(5)} s  ${p.id.padEnd(16)} ${p.capa.tipo.padEnd(11)}${vo ? ` ♪ ${vo.id}` : ''}`)
}
console.log(`\nDuración: ${reloj(l.total)} · voz en off ${(l.vos.reduce((s, o) => s + o.frames, 0) / FPS).toFixed(0)} s · ${l.subs.filter((s) => s.de === 'app').length} frases de la app subtituladas`)

const marca = (f) => {
  const ms = Math.round((f / FPS) * 1000)
  const p = (n, d = 2) => String(n).padStart(d, '0')
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`
}
const srt = l.subs.map((s, i) => `${i + 1}\n${marca(s.desde)} --> ${marca(s.hasta)}\n${s.de === 'app' ? `[La app] ${s.texto}` : s.texto}\n`).join('\n')
const archivo = cual === 'corto' ? 'subtitulos-corto.srt' : 'subtitulos.srt'
writeFileSync(new URL(`../${archivo}`, import.meta.url), srt)
console.log(`${archivo}: ${l.subs.length} líneas`)
