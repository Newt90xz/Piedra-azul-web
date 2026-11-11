// C2 · Perfil del niño: Estudiantes → ficha de Martina → Perfil y apoyos.
// Cambia la exigencia de Intermedio a Inicial y recorre los apoyos.
import { APP, abrirEducadora, pausa } from './lib.mjs'

export default async function c02() {
  const p = await abrirEducadora('c02-perfil-martina')
  const pg = p.pagina
  await pg.goto(`${APP}/docente/estudiantes`, { waitUntil: 'networkidle' })
  await pg.getByText('Martina').waitFor()
  await pausa(1200)
  p.marca('estudiantes')
  await pausa(1500)
  await p.clic(pg.getByRole('link', { name: /Martina/ }), { despues: 1400 })
  p.marca('ficha')
  await p.clic(pg.getByRole('tab', { name: 'Perfil y apoyos' }), { despues: 1600 })
  p.marca('perfil')

  // Personaje y nivel de exigencia.
  const personaje = await p.centro(pg.getByRole('button', { name: 'Personaje Trenza' }))
  await p.mover(personaje.x, personaje.y, 800)
  await pausa(1100)
  await p.desplazar(330)
  p.marca('exigencia')
  await p.elegir(pg.locator('select[name="ajustes.exigencia"]'), 'inicial')
  p.marca('inicial')
  await pausa(1800)

  // Apoyos: tamaño de letra, temática y los tres interruptores (solo se señalan).
  p.marca('apoyos')
  for (const el of [pg.locator('select[name="ajustes.tamanoLetra"]'), pg.locator('select[name="ajustes.tematica"]'), pg.getByText('Alto contraste'), pg.getByText('Reducir animaciones'), pg.getByText('Silenciar efectos de sonido')]) {
    const c = await p.centro(el)
    await p.mover(c.x, c.y, 600)
    await pausa(750)
  }
  await p.clic(pg.getByRole('button', { name: 'Guardar cambios' }), { despues: 600 })
  await pg.getByText('Cambios guardados.').waitFor()
  p.marca('guardado')
  await pausa(1800)
  await p.cerrar()
}
