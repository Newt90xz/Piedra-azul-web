// C1 · Portada: 8 s quieta (las fichas se animan solas).
import { APP, abrirPantalla, pausa } from './lib.mjs'

export default async function c01() {
  const p = await abrirPantalla('c01-portada')
  await p.pagina.goto(APP, { waitUntil: 'networkidle' })
  p.marca('portada')
  await pausa(9000)
  await p.cerrar()
}
