// Voz en off: una pista por parte del guion (PLAN.md, 6b), con la voz elegida en
// src/guion.json. Las escenas largas van en varias partes para intercalar la voz de la app.
// Uso: node scripts/voz/generar.mjs [id …] [--forzar]
// Sin ids genera las que falten. Cada pista recibe el texto anterior y el siguiente para
// que la entonación empalme. Las que ya existen no se vuelven a pedir.
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tts } from './tts.mjs'

const guion = JSON.parse(await readFile(new URL('../../src/guion.json', import.meta.url), 'utf8'))
const args = process.argv.slice(2)
const forzar = args.includes('--forzar')
const pedidas = args.filter((a) => !a.startsWith('--'))

let total = 0
for (const [i, e] of guion.partes.entries()) {
  if (pedidas.length && !pedidas.includes(e.id)) continue
  const salida = `voz/${e.id}.mp3`
  if (existsSync(salida) && !forzar) continue
  const r = await tts({ vozId: guion.voz.id, texto: e.vo, salida, antes: guion.partes[i - 1]?.vo, despues: guion.partes[i + 1]?.vo })
  total += r.caracteres
  console.log(`✔ ${e.id}: ${r.caracteres} caracteres`)
}
console.log(`Caracteres usados en esta corrida: ${total}`)
