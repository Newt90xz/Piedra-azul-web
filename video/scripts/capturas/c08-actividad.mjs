// C8 a C11 · La actividad de letras desde el niño, y «Necesitan tu apoyo».
//  · Sofía juega con voz: se equivoca una vez (pista), acierta, racha, premio, camino con ✓.
//  · Martina (Inicial) y Benjamín (Avanzado) muestran la misma actividad con 2 y 4 letras.
//  · Tomás no alcanza el puntaje dos veces → la educadora ve el aviso y marca «Listo».
//  · Isidora y Lucas (sin grabar) completan el plan y pasan solos al recreo.
// Todo se juega de verdad: los resultados quedan en la base y alimentan las métricas.
import { APP, abrirEducadora, abrirTablet, pausa } from './lib.mjs'
import { jugarActividad, leerRonda, resolverRonda, seguir } from './juego.mjs'

async function retomar(p) {
  await p.pagina.goto(`${APP}/alumno`, { waitUntil: 'networkidle' })
  await p.pagina.getByRole('button', { name: '¡Empezar!' }).waitFor({ timeout: 20000 })
  p.marca('camino')
}

// Plan completo, rápido y sin voz (para quien no sale en la toma).
async function completarPlan(p, errores = () => ({})) {
  const pg = p.pagina
  for (;;) {
    const logrado = await jugarActividad(p, { ritmo: 'rapido', plan: errores })
    await seguir(p, { ritmo: 'rapido' })
    if (!logrado) continue
    const fin = pg.getByRole('button', { name: '¡Al recreo!' })
    await Promise.race([fin.waitFor({ timeout: 8000 }), pg.getByRole('button', { name: '¡Empezar!' }).waitFor({ timeout: 8000 })]).catch(() => {})
    if (await fin.count()) {
      await p.clic(fin, { antes: 300, despues: 300 })
      await pg.locator('main[aria-label^="Recreo"]').waitFor({ timeout: 30000 })
      p.marca('parque')
      return
    }
  }
}

export default async function c08() {
  const edu = await abrirEducadora('c08-educadora')
  const sofia = await abrirTablet('c08-sofia', 'Sofía', { continua: true })
  // Martina y Benjamín se graban solo para la comparación: van sin voz para seguir rápido.
  const martina = await abrirTablet('c08-martina', 'Martina', { continua: true, emocion: 'calma', voz: false })
  const benjamin = await abrirTablet('c08-benjamin', 'Benjamín', { continua: true, voz: false })
  const tomas = await abrirTablet('c08-tomas', 'Tomás', { continua: true, emocion: 'calma' })
  const isidora = await abrirTablet('c08-Isidora', 'Isidora', { continua: true, grabar: false })
  const lucas = await abrirTablet('c08-Lucas', 'Lucas', { continua: true, grabar: false })
  const grabadas = [edu, sofia, martina, benjamin, tomas]
  const marca = (m) => grabadas.forEach((p) => p.marca(m))

  await edu.pagina.goto(`${APP}/docente/salas`, { waitUntil: 'networkidle' })
  const sala = edu.pagina.locator('section[aria-label="Grupo Letras"]')
  const fila = (n) => sala.locator('li[draggable="true"]', { hasText: n })
  await Promise.all([retomar(sofia), retomar(tomas), retomar(martina), retomar(benjamin), retomar(isidora), retomar(lucas)])
  await sala.getByText('6 niños').waitFor({ timeout: 20000 })
  await pausa(1500)
  marca('c8')

  // Sofía: un error en la primera ronda y después todo al primer intento (racha).
  const deSofia = (async () => {
    const logrado = await jugarActividad(sofia, { plan: (i) => ({ errores: i === 0 ? 1 : 0 }) })
    sofia.marca(logrado ? 'premio-logrado' : 'premio-repetir')
    await seguir(sofia)
    await sofia.pagina.getByRole('button', { name: '¡Empezar!' }).waitFor()
    sofia.marca('camino-con-check')
    marca('sofia-termino-1')
  })()

  // C10 · La educadora ve el avance de Sofía en su fila.
  await deSofia
  await fila('Sofía').getByText('1/4').waitFor({ timeout: 20000 })
  marca('fila-sofia')
  const f = await edu.centro(fila('Sofía'))
  await edu.mover(f.x + 40, f.y + 10, 800)
  await pausa(4000)

  // (De a uno: con todas las pantallas jugando a la vez, el equipo no da abasto y la voz se atrasa.)
  // Martina y Benjamín: la misma actividad con 2 y con 4 opciones. Se quedan un
  // momento en la primera ronda y después siguen (Martina deja la segunda a medias).
  const comparar = async (p, despues) => {
    const pg = p.pagina
    await p.clic(pg.getByRole('button', { name: '¡Empezar!' }), { antes: 600, despues: 500 })
    await p.clic(pg.getByRole('button', { name: '¡A jugar!' }), { antes: 900, despues: 300 })
    await pg.locator('main span.animate-aparecer.relative > button').first().waitFor()
    const r = await leerRonda(pg)
    p.marca(`comparacion · ${r.opciones.length} opciones`)
    await pausa(7000)
    p.marca('comparacion-fin')
    await despues()
  }
  const deMartina = comparar(martina, async () => {
    for (let i = 0; i < 4; i++) await resolverRonda(martina, { ritmo: 'rapido', errores: i === 1 ? 1 : 0 })
    await seguir(martina, { ritmo: 'rapido' })
  })
  const deBenjamin = comparar(benjamin, async () => {
    for (let i = 0; i < 6; i++) await resolverRonda(benjamin, { ritmo: 'rapido' })
    await seguir(benjamin, { ritmo: 'rapido' })
  })

  // Tomás: dos intentos sin lograrlo (3 de 5 rondas con la respuesta iluminada; la B la confunde con la P).
  const deTomas = (async () => {
    for (let intento = 1; intento <= 2; intento++) {
      let fallas = 0
      const logrado = await jugarActividad(tomas, {
        plan: (i, r) => {
          const falla = r?.item === 'B' || i === 0 || i === 2 || (i === 4 && fallas < 3)
          if (falla) fallas++
          return falla ? { errores: 2, confunde: 'P' } : {}
        },
      })
      tomas.marca(`intento-${intento}-${logrado ? 'logrado' : 'repetir'}`)
      marca(`tomas-intento-${intento}`)
      await seguir(tomas)
      await tomas.pagina.getByRole('button', { name: '¡Empezar!' }).waitFor()
    }
  })()

  // Isidora y Lucas completan el plan y pasan solos al recreo (Lucas falla la B una vez).
  const otros = () => Promise.all([completarPlan(isidora), completarPlan(lucas, (i, r) => (r?.item === 'B' ? { errores: 1, confunde: 'P' } : {}))])

  // C11 · Aparece «Necesitan tu apoyo».
  await deTomas
  const aviso = edu.pagina.locator('section[aria-labelledby="titulo-avisos"]')
  await aviso.waitFor({ timeout: 25000 })
  marca('aviso')
  await edu.desplazar(-600, 500)
  const a = await edu.centro(aviso.getByText('Tomás'))
  await edu.mover(a.x + 60, a.y + 14, 900)
  await pausa(4500)
  await Promise.all([deMartina, deBenjamin, otros()])
  marca('otros-listos')
  await edu.clic(aviso.getByRole('button', { name: /Listo/ }), { antes: 600, despues: 400 })
  // Si el clic no llegó a registrarse, se repite.
  await aviso.waitFor({ state: 'detached', timeout: 8000 }).catch(async () => {
    await edu.clic(aviso.getByRole('button', { name: /Listo/ }), { antes: 300, despues: 400 })
    await aviso.waitFor({ state: 'detached', timeout: 15000 })
  })
  marca('listo')
  await pausa(2500)

  // Con la educadora al lado, Tomás lo logra al tercer intento.
  const logrado = await jugarActividad(tomas, { plan: (i, r) => (r?.item === 'B' ? { errores: 1, confunde: 'P' } : {}) })
  tomas.marca(`intento-3-${logrado ? 'logrado' : 'repetir'}`)
  await seguir(tomas)
  marca('fin')
  await pausa(2000)
  for (const p of [...grabadas, isidora, lucas]) await p.cerrar()
}
