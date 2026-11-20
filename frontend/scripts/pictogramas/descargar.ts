// Descarga los pictogramas ARASAAC del banco de palabras a public/imagenes.
//
//   node scripts/pictogramas/descargar.ts            (desde frontend/)
//   node scripts/pictogramas/descargar.ts --forzar   (vuelve a bajar los que ya están)
//
// `arasaac.json` dice qué pictograma usa cada palabra: «nombre-del-archivo»:
// { id, clave? }. Antes de bajar se revisa que el pictograma tenga esa palabra
// clave (o el nombre del archivo), para no bajar otro dibujo por un id mal
// escrito. Igual hay que mirar cada imagen: la palabra puede tener otro sentido
// (el «mango» de una sartén). Licencia: CC BY-NC-SA, autor Sergio Palao,
// ARASAAC (Gobierno de Aragón); el crédito va en el pie de la portada.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

interface Entrada {
  id: number
  clave?: string
}

const carpeta = new URL('../../public/imagenes/', import.meta.url)
const manifiesto = JSON.parse(readFileSync(new URL('./arasaac.json', import.meta.url), 'utf8')) as Record<string, Entrada>
const forzar = process.argv.includes('--forzar')

const normal = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

let bajadas = 0
const fallas: string[] = []

for (const [archivo, { id, clave }] of Object.entries(manifiesto)) {
  const destino = new URL(`${archivo}.png`, carpeta)
  if (existsSync(destino) && !forzar) continue
  try {
    const info = (await (await fetch(`https://api.arasaac.org/v1/pictograms/es/${id}`)).json()) as { keywords?: { keyword: string }[] }
    const palabras = (info.keywords ?? []).map((k) => normal(k.keyword))
    const esperada = normal(clave ?? archivo)
    if (!palabras.includes(esperada)) {
      fallas.push(`${archivo}: el pictograma ${id} es «${palabras.join(', ')}», no «${esperada}»`)
      continue
    }
    const png = await fetch(`https://static.arasaac.org/pictograms/${id}/${id}_500.png`)
    if (!png.ok) throw new Error(`HTTP ${png.status}`)
    writeFileSync(destino, Buffer.from(await png.arrayBuffer()))
    bajadas++
    console.log(`✓ ${archivo}.png (${id})`)
  } catch (e) {
    fallas.push(`${archivo}: ${e instanceof Error ? e.message : e}`)
  }
}

console.log(`${bajadas} descargados, ${Object.keys(manifiesto).length - bajadas - fallas.length} ya estaban.`)
if (fallas.length > 0) {
  console.error(`No se descargaron:\n  ${fallas.join('\n  ')}`)
  process.exitCode = 1
}
