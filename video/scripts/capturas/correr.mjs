// Corre una o varias tomas: node scripts/capturas/correr.mjs c01 c05 …
// Sin argumentos lista las que hay. Cada toma es un archivo cNN-*.mjs de esta carpeta.
import { readdir } from 'node:fs/promises'
import { cerrarAbiertas, cerrarNavegador } from './lib.mjs'

const archivos = (await readdir(new URL('.', import.meta.url))).filter((a) => /^c\d\d-.*\.mjs$/.test(a)).sort()
const pedidas = process.argv.slice(2)
if (pedidas.length === 0) {
  console.log('Tomas disponibles:\n' + archivos.map((a) => '  ' + a.replace('.mjs', '')).join('\n'))
  process.exit(0)
}
let fallos = 0
for (const a of archivos.filter((a) => pedidas.includes('todas') || pedidas.some((p) => a.startsWith(p)))) {
  console.log(`▶ ${a}`)
  try {
    await (await import(`./${a}`)).default()
  } catch (e) {
    fallos++
    console.error(`✖ ${a}: ${e.message}`)
    await cerrarAbiertas()
  }
}
await cerrarNavegador()
process.exit(fallos ? 1 : 0)
