// C20 · Los PDF descargados en la toma C17, abiertos en el visor del navegador:
// el informe de Tomás y el del curso. Se recorren con la rueda.
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { EDUCADORA, SALIDA, abrirPantalla, pausa } from './lib.mjs'

export default async function c20() {
  for (const [toma, archivo] of [['c20-pdf-tomas', 'informe-tomas.pdf'], ['c20-pdf-curso', 'avance-curso.pdf']]) {
    const p = await abrirPantalla(toma, { tamano: { width: EDUCADORA.width, height: EDUCADORA.height } })
    await p.pagina.goto(pathToFileURL(join(SALIDA, 'pdf', archivo)).href)
    await pausa(3500)
    p.marca('abierto')
    await p.pagina.mouse.move(1110, 600)
    await pausa(2500)
    await p.desplazar(650, 2600)
    p.marca('medio')
    await pausa(2200)
    await p.desplazar(900, 3000)
    p.marca('final')
    await pausa(2500)
    await p.cerrar()
  }
}
