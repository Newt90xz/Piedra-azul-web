// C3 y C4 · Antes de la clase: la educadora crea «Grupo Letras», arma el plan con la
// actividad de letras configurable (plantilla, aviso B/V, guardar plantilla), suma
// «Sílabas con M», y conecta un recreo en Parque.
// Al final (fuera del corte) deja lista la segunda sala, «Grupo Sílabas», para la toma C16.
import { APP, abrirEducadora, pausa } from './lib.mjs'

export default async function c03() {
  const p = await abrirEducadora('c03-sala-y-plan')
  const pg = p.pagina
  await pg.goto(`${APP}/docente/salas`, { waitUntil: 'networkidle' })
  await pg.getByText('Nueva sala').waitFor()
  await pausa(1500)
  p.marca('salas')

  // Nueva sala.
  await p.escribir(pg.getByPlaceholder('Nombre, ej.: Grupo Sílabas'), 'Grupo Letras')
  await p.clic(pg.locator('label', { hasText: 'Actividades' }), { despues: 500 })
  await p.clic(pg.getByRole('button', { name: /Crear sala/ }), { despues: 400 })
  const sala = pg.locator('section[aria-label="Grupo Letras"]')
  await sala.waitFor()
  p.marca('sala-creada')
  await pausa(1500)

  // Plan → actividad de letras configurable.
  await p.clic(sala.getByRole('button', { name: 'Plan', exact: true }), { despues: 1300 })
  const plan = pg.getByRole('dialog')
  p.marca('editor')
  await p.clic(plan.getByRole('button', { name: /Escucha y toca la letra/ }), { despues: 1500 })
  p.marca('configurar')
  const letra = (l) => plan.getByRole('button', { name: `Letra ${l}`, exact: true })
  const plantilla = plan.getByRole('button', { name: 'M, P, L, S, T', exact: true })
  // Se detiene un momento sobre las plantillas listas.
  for (const n of ['Todas las letras', 'Vocales', 'Consonantes']) {
    const c = await p.centro(plan.getByRole('button', { name: n, exact: true }).first())
    await p.mover(c.x, c.y, 420)
    await pausa(300)
  }
  await p.clic(plantilla, { despues: 1200 })
  p.marca('plantilla')
  await p.clic(letra('B'), { despues: 1300 })
  p.marca('mas-b')

  // El aviso: solo B y V suenan igual.
  await p.clic(plan.getByRole('button', { name: 'Ninguna', exact: true }), { despues: 600 })
  await p.clic(letra('B'), { despues: 350 })
  await p.clic(letra('V'), { despues: 300 })
  await plan.getByText('Esas letras suenan igual').waitFor()
  p.marca('aviso-bv')
  const aviso = await p.centro(plan.getByText('Esas letras suenan igual'))
  await p.mover(aviso.x - 120, aviso.y + 4, 500)
  await pausa(2200)
  await p.clic(plantilla, { despues: 700 })
  await p.clic(letra('B'), { despues: 1000 })
  p.marca('letras-listas')

  // Guardar como plantilla y agregar al plan.
  await p.escribir(plan.getByPlaceholder('Nombre, ej.: Letras de la semana'), 'Letras de la semana', { limpiar: true })
  await p.clic(plan.getByRole('button', { name: 'Guardar como plantilla' }), { despues: 300 })
  await plan.getByText('Plantilla «Letras de la semana» guardada.').waitFor()
  p.marca('plantilla-guardada')
  await pausa(1500)
  await p.clic(plan.getByRole('button', { name: /Agregar al plan/ }), { despues: 1500 })
  p.marca('en-el-plan')

  // Un contenido del banco y guardar.
  await p.clic(plan.getByRole('button', { name: /Sílabas con M/ }), { despues: 1400 })
  p.marca('silabas-m')
  await p.clic(plan.getByRole('button', { name: /Guardar plan/ }), { despues: 600 })
  await plan.waitFor({ state: 'detached' })
  await sala.getByRole('list', { name: 'Plan de la sala' }).waitFor()
  p.marca('plan-guardado')
  const iconos = await p.centro(sala.getByRole('list', { name: 'Plan de la sala' }))
  await p.mover(iconos.x + 40, iconos.y + 30, 600)
  await pausa(2500)

  // C4 · Recreo conectado.
  p.marca('c4')
  await p.clic(sala.getByRole('button', { name: /Crear un recreo y conectarlo/ }), { antes: 500, despues: 200 })
  p.marca('creando-recreo')
  const recreo = pg.locator('section[aria-label="Recreo"]').filter({ hasText: '¿Qué se hace en este recreo?' })
  await recreo.waitFor()
  p.marca('recreo-creado')
  await pausa(1500)
  for (const n of ['Dibujo', 'Globos', 'Juegos']) {
    const c = await p.centro(recreo.locator('label', { hasText: n }))
    await p.mover(c.x, c.y, 380)
    await pausa(260)
  }
  await p.clic(recreo.locator('label', { hasText: 'Parque' }), { despues: 2500 })
  p.marca('parque')
  await pausa(1500)
  p.marca('fin')

  // Fuera del corte: la segunda sala, con «Sílabas con P», conectada al mismo recreo.
  await p.escribir(pg.getByPlaceholder('Nombre, ej.: Grupo Sílabas'), 'Grupo Sílabas')
  await p.clic(pg.getByRole('button', { name: /Crear sala/ }), { despues: 400 })
  const sala2 = pg.locator('section[aria-label="Grupo Sílabas"]')
  await sala2.waitFor()
  await p.clic(sala2.getByRole('button', { name: 'Plan', exact: true }), { despues: 1000 })
  await p.clic(plan.getByRole('button', { name: /Sílabas con P/ }), { despues: 900 })
  await p.clic(plan.getByRole('button', { name: /Guardar plan/ }), { despues: 600 })
  await plan.waitFor({ state: 'detached' })
  const idRecreo = await pg.evaluate(() => [...document.querySelectorAll('select option')].find((o) => o.textContent.includes('Recreo') && !o.textContent.includes('Nadie'))?.value)
  await p.elegir(sala2.locator('select'), idRecreo)
  await pausa(2500)
  p.marca('segunda-sala')
  await p.cerrar()
}
