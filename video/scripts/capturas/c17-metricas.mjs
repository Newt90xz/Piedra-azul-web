// C17 a C20 · Lo que la educadora sabe al final del día.
//  · Panel: estudiantes, quiénes jugaron y lo que más le cuesta al curso.
//  · Avance del curso: la tabla y el detalle de la B (con qué se confunden, a quiénes les cuesta).
//  · Ficha de Tomás: emociones, avance por categoría, observaciones.
//  · Descargas: Informe PDF de Tomás y PDF del curso (quedan en capturas/pdf/).
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { APP, SALIDA, abrirEducadora, pausa } from './lib.mjs'

export default async function c17() {
  const p = await abrirEducadora('c17-metricas')
  const pg = p.pagina
  await mkdir(join(SALIDA, 'pdf'), { recursive: true })
  const menu = (n) => pg.getByRole('navigation', { name: 'Menú docente' }).getByRole('link', { name: n })

  // C17 · Panel.
  await pg.goto(`${APP}/docente`, { waitUntil: 'networkidle' })
  await pg.getByText('jugaron esta semana').waitFor()
  await pausa(1500)
  p.marca('panel')
  const cuesta = await p.centro(pg.getByText('Lo que más le cuesta al curso'))
  await p.mover(cuesta.x, cuesta.y + 150, 1100)
  await pausa(4500)

  // C18 · Avance del curso → detalle de la B.
  await p.clic(menu('Avance del curso'), { despues: 600 })
  await pg.getByRole('table').getByText('Tomás').waitFor()
  p.marca('avance')
  await pausa(1200)
  for (const n of ['Sofía', 'Tomás']) {
    const c = await p.centro(pg.getByRole('row', { name: new RegExp(n) }))
    await p.mover(c.x - 80, c.y + 6, 700)
    await pausa(900)
  }
  await pausa(1200)
  const b = pg.getByRole('button', { name: /^B\s*\d+%$/ })
  await p.clic(b, { antes: 800, despues: 1200 })
  p.marca('detalle-b')
  const confunde = await p.centro(pg.getByRole('heading', { name: 'Con qué se confundió' }))
  await p.mover(confunde.x + 80, confunde.y + 40, 800)
  await pausa(2600)
  const porNino = await p.centro(pg.getByRole('heading', { name: 'Por niño' }))
  await p.mover(porNino.x + 120, porNino.y + 70, 800)
  await pausa(4500)
  p.marca('detalle-b-fin')

  // C19 · Ficha de Tomás.
  await p.desplazar(-2000, 700)
  await p.clic(pg.getByRole('table').getByRole('link', { name: /Tomás/ }), { despues: 800 })
  await pg.getByText('¿Cómo llegó a la sesión?').waitFor()
  p.marca('ficha-tomas')
  const emociones = await p.centro(pg.getByRole('heading', { name: '¿Cómo llegó a la sesión?' }))
  await p.mover(emociones.x + 200, emociones.y + 60, 900)
  await pausa(3200)
  await p.desplazar(420, 1000)
  p.marca('avance-categoria')
  const lecuesta = await p.centro(pg.getByText('Le cuesta').first())
  await p.mover(lecuesta.x - 10, lecuesta.y + 4, 800)
  await pausa(2500)
  await p.clic(pg.getByRole('button', { name: 'B', exact: true }), { antes: 500, despues: 3500 })
  p.marca('tomas-b')
  await p.desplazar(-2000, 700)
  await p.clic(pg.getByRole('tab', { name: 'Observaciones' }), { despues: 900 })
  await pg.getByRole('heading', { name: 'Historial' }).waitFor()
  p.marca('observaciones')
  const obs = await p.centro(pg.getByText('Confunde la B con la P'))
  await p.mover(obs.x, obs.y + 10, 900)
  await pausa(4200)

  // C19/C20 · Descargas.
  p.marca('pdf-tomas')
  const [informe] = await Promise.all([pg.waitForEvent('download'), p.clic(pg.getByRole('button', { name: /Descargar el informe de Tomás/ }), { antes: 700, despues: 500 })])
  await informe.saveAs(join(SALIDA, 'pdf', 'informe-tomas.pdf'))
  p.marca('pdf-tomas-listo')
  await pausa(2000)
  await p.clic(menu('Avance del curso'), { despues: 600 })
  await pg.getByRole('table').getByText('Tomás').waitFor()
  p.marca('pdf-curso')
  const [curso] = await Promise.all([pg.waitForEvent('download'), p.clic(pg.getByRole('button', { name: /PDF del curso/ }), { antes: 900, despues: 500 })])
  await curso.saveAs(join(SALIDA, 'pdf', 'avance-curso.pdf'))
  p.marca('pdf-curso-listo')
  await pausa(2500)
  p.marca('fin')
  await p.cerrar()
}
