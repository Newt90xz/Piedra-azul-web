// C12 · Sofía termina el plan: última actividad → trofeo con sus estrellas →
// «¡Al recreo!» → entra sola al parque. Benjamín también termina (sin voz, rápido).
// La educadora ve cómo pasan solos de «Grupo Letras» al «Recreo».
import { APP, abrirEducadora, abrirTablet, pausa } from './lib.mjs'
import { jugarActividad, seguir } from './juego.mjs'

export default async function c12() {
  const edu = await abrirEducadora('c12-educadora')
  const sofia = await abrirTablet('c12-sofia', 'Sofía', { continua: true })
  const benjamin = await abrirTablet('c12-Benjamín', 'Benjamín', { continua: true, grabar: false })
  const marca = (m) => [edu, sofia].forEach((p) => p.marca(m))

  await edu.pagina.goto(`${APP}/docente/salas`, { waitUntil: 'networkidle' })
  const recreo = edu.pagina.locator('section[aria-label="Recreo"]').filter({ hasText: '¿Qué se hace en este recreo?' })
  const letras = edu.pagina.locator('section[aria-label="Grupo Letras"]')
  for (const p of [sofia, benjamin]) {
    await p.pagina.goto(`${APP}/alumno`, { waitUntil: 'networkidle' })
    await p.pagina.getByRole('button', { name: '¡Empezar!' }).waitFor({ timeout: 20000 })
  }
  marca('inicio')

  // Las dos actividades del medio, rápido y sin voz (no salen en el video).
  for (let i = 0; i < 2; i++) {
    await jugarActividad(sofia, { ritmo: 'rapido' })
    await seguir(sofia, { ritmo: 'rapido' })
    await sofia.pagina.getByRole('button', { name: '¡Empezar!' }).waitFor()
  }
  const deBenjamin = (async () => {
    for (let i = 0; i < 3; i++) {
      await jugarActividad(benjamin, { ritmo: 'rapido', plan: (k) => ({ errores: i === 1 && k === 2 ? 1 : 0 }) })
      await seguir(benjamin, { ritmo: 'rapido' })
      if (i < 2) await benjamin.pagina.getByRole('button', { name: '¡Empezar!' }).waitFor()
    }
    await benjamin.clic(benjamin.pagina.getByRole('button', { name: '¡Al recreo!' }), { antes: 500 })
    await benjamin.pagina.locator('main[aria-label^="Recreo"]').waitFor({ timeout: 30000 })
  })()

  // La última, a ritmo de niña: «Busca la imagen de la sílaba».
  await pausa(1500)
  marca('ultima-actividad')
  await jugarActividad(sofia, { plan: (i) => ({ errores: i === 2 ? 1 : 0 }) })
  marca('premio-final')
  await seguir(sofia)
  const alRecreo = sofia.pagina.getByRole('button', { name: '¡Al recreo!' })
  await alRecreo.waitFor()
  marca('trofeo')
  await pausa(4500)
  await sofia.clic(alRecreo, { antes: 700, despues: 200 })
  marca('al-recreo')
  await sofia.pagina.locator('main[aria-label^="Recreo"]').waitFor({ timeout: 30000 })
  marca('parque')
  await deBenjamin
  // La educadora los ve llegar solos a la tarjeta del recreo.
  await recreo.getByText('Sofía').waitFor({ timeout: 20000 })
  marca('sofia-en-recreo')
  const c = await edu.centro(recreo.getByText('Sofía'))
  await edu.mover(c.x + 50, c.y + 8, 900)
  await pausa(6000)
  marca('fin')
  void letras
  for (const p of [edu, sofia, benjamin]) await p.cerrar()
}
