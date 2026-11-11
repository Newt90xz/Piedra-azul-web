// C16 · De vuelta al trabajo: la educadora arrastra a los niños del recreo a
// «Grupo Sílabas» (plan «Sílabas con P»). En la tablet de Sofía el dibujo se cierra
// y aparece el camino nuevo. Se graban la educadora y Sofía.
import { APP, abrirEducadora, abrirTablet, pausa } from './lib.mjs'

export default async function c16() {
  const edu = await abrirEducadora('c16-educadora')
  const sofia = await abrirTablet('c16-sofia', 'Sofía', { continua: true })
  const marca = (m) => [edu, sofia].forEach((p) => p.marca(m))

  await edu.pagina.goto(`${APP}/docente/salas`, { waitUntil: 'networkidle' })
  const recreo = edu.pagina.locator('section[aria-label="Recreo"]').filter({ hasText: '¿Qué se hace en este recreo?' })
  const silabas = edu.pagina.locator('section[aria-label="Grupo Sílabas"]')
  const ficha = (n) => recreo.locator('li[draggable="true"]', { hasText: n })
  await sofia.pagina.goto(`${APP}/alumno`, { waitUntil: 'networkidle' })
  await sofia.pagina.getByRole('button', { name: 'Repasar letras' }).waitFor({ timeout: 30000 })
  await recreo.getByText('Sofía').waitFor()
  // Deja a la vista las dos salas: el recreo y, debajo, Grupo Sílabas.
  await edu.desplazar(430, 900)
  await pausa(2500)

  marca('c16')
  await edu.arrastrar(ficha('Sofía').locator('button').first(), silabas.getByText('Arrastra aquí a los niños.'), 1100)
  marca('sofia-soltada')
  await sofia.pagina.getByRole('button', { name: '¡Empezar!' }).waitFor({ timeout: 25000 })
  marca('sofia-camino-nuevo')
  await pausa(3500)
  for (const n of ['Lucas', 'Isidora', 'Benjamín']) {
    marca(`arrastra-${n}`)
    await edu.arrastrar(ficha(n).locator('button').first(), silabas.locator('ul').last(), 800)
  }
  await silabas.getByText('4 niños').waitFor({ timeout: 20000 })
  marca('todos-en-silabas')
  await pausa(2500)
  // Sofía empieza la actividad nueva.
  await sofia.clic(sofia.pagina.getByRole('button', { name: '¡Empezar!' }), { antes: 600, despues: 900 })
  marca('sofia-empieza')
  await pausa(4500)
  marca('fin')
  for (const p of [edu, sofia]) await p.cerrar()
}
