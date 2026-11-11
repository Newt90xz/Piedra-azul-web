// Cómo «juega» un niño en las tomas: entra, dice cómo se siente y resuelve rondas.
// La respuesta correcta se lee del estado de la propia app (las rondas se arman al
// azar), y luego se toca en pantalla como lo haría el niño: nada se salta ni se simula.
import { APP, pausa } from './lib.mjs'

// Entra desde la grilla de perfiles: toca su personaje, saludo, emoción y llega a la espera.
export async function entrar(p, { emocion = 'Feliz', lento = true } = {}) {
  const pg = p.pagina
  await pg.goto(`${APP}/alumno`, { waitUntil: 'networkidle' })
  const perfil = pg.getByRole('button', { name: p.nino.toUpperCase(), exact: true })
  await perfil.waitFor()
  // Deja oír «¿Quién eres? Toca tu foto.» antes de tocar.
  if (lento) await escuchar(p, { min: 1500, despues: 700 })
  else await pausa(400)
  p.marca('grilla')
  await p.clic(perfil, { antes: lento ? 500 : 100, despues: 300, ms: lento ? 900 : 300 })
  p.marca('saludo')
  await pg.getByRole('heading', { name: '¿Cómo te sientes hoy?' }).waitFor()
  p.marca('emocion')
  // (La tablet ya tiene la voz encendida: la app lo recuerda por dispositivo.)
  if (lento) await escuchar(p, { min: 1200, despues: 800 })
  else await pausa(500)
  await p.clic(pg.getByRole('button', { name: emocion, exact: true }), { antes: lento ? 500 : 100, despues: 300, ms: lento ? 900 : 300 })
  p.marca('emocion-elegida')
  await pg.getByRole('heading', { name: 'RECREO' }).waitFor()
  p.marca('espera')
}

// Revienta algunos globos de la espera.
export async function reventarGlobos(p, cuantos = 3) {
  const pg = p.pagina
  for (let i = 0; i < cuantos; i++) {
    const globo = pg.locator('button.globo:not([disabled])').first()
    try {
      await globo.waitFor({ timeout: 6000 })
      const c = await globo.boundingBox()
      if (!c) continue
      // El globo sube: se apunta un poco más arriba de donde está.
      await p.mover(c.x + c.width / 2, c.y + c.height / 2 - 40, 450)
      const ahora = await globo.boundingBox()
      if (!ahora) continue
      await p.tocar(ahora.x + ahora.width / 2, ahora.y + ahora.height / 2 - 6)
      await pausa(700)
    } catch {
      // Sin globos a la vista: sigue.
    }
  }
}

// La ronda en pantalla, leída del estado de React: tipo, ítem, opciones y cuál es la correcta.
export function leerRonda(pg) {
  return pg.evaluate(() => {
    const botones = [...document.querySelectorAll('main span.animate-aparecer.relative > button')]
    if (botones.length === 0) return null
    const clave = Object.keys(botones[0]).find((k) => k.startsWith('__reactFiber'))
    let f = botones[0][clave]
    while (f && !f.memoizedProps?.ronda) f = f.return
    const r = f?.memoizedProps?.ronda
    if (!r) return null
    const orden = document.querySelector('main ol[aria-label^="Ronda"]')?.getAttribute('aria-label') ?? ''
    return {
      orden,
      tipo: r.tipo,
      item: r.item,
      opciones: r.opciones?.map((o, i) => ({ texto: o.texto ?? o.audio, correcta: o.id === r.correctaId, apagada: botones[i]?.disabled ?? false })),
    }
  })
}

const opcion = (pg, i) => pg.locator('main span.animate-aparecer.relative > button').nth(i)

// Espera a que la app termine de hablar (la consigna, una pista), como un niño que
// escucha antes de tocar. `min`: da tiempo a que la frase empiece; `despues`: lo que
// tarda en decidirse.
export async function escuchar(p, { min = 900, max = 12000, despues = 600 } = {}) {
  const inicio = Date.now()
  await pausa(min)
  while (Date.now() - inicio < max) {
    const activa = await p.pagina.evaluate(() => window.__vozActiva ?? 0).catch(() => 0)
    if (activa <= 0) {
      await pausa(300)
      if ((await p.pagina.evaluate(() => window.__vozActiva ?? 0).catch(() => 0)) <= 0) break
    } else await pausa(120)
  }
  await pausa(despues)
}

// Resuelve la ronda actual. `errores`: cuántas veces se equivoca antes de acertar;
// `confunde`: letra o sílaba que prefiere al equivocarse. `ritmo`: 'nino' deja escuchar
// la consigna y las pistas; 'rapido' es para lo que no sale en el video.
export async function resolverRonda(p, { errores = 0, confunde, ritmo = 'nino' } = {}) {
  const pg = p.pagina
  const nino = ritmo === 'nino'
  await pg.locator('main span.animate-aparecer.relative > button').first().waitFor()
  if (nino) await escuchar(p)
  else await pausa(350)
  const r = await leerRonda(pg)
  if (!r || r.tipo !== 'elegir') throw new Error(`[${p.nombre}] ronda no esperada: ${r?.tipo}`)
  p.marca(`ronda ${r.orden} · ${r.item}`)
  let quedan = r.opciones.map((o, i) => ({ ...o, i })).filter((o) => !o.correcta)
  for (let e = 0; e < errores && quedan.length > 0; e++) {
    const mala = quedan.find((o) => o.texto?.toUpperCase() === confunde?.toUpperCase()) ?? quedan[0]
    quedan = quedan.filter((o) => o !== mala)
    await p.clic(opcion(pg, mala.i), { antes: nino ? 350 : 80, despues: 250, ms: nino ? 750 : 250 })
    p.marca(`error ${r.item} → ${mala.texto}`)
    if (nino) await escuchar(p, { min: 700 })
  }
  await p.clic(opcion(pg, r.opciones.findIndex((o) => o.correcta)), { antes: nino ? 350 : 80, despues: 150, ms: nino ? 750 : 250 })
  p.marca(`acierto ${r.item}`)
  // Espera la ronda siguiente o el premio.
  await pg.waitForFunction((antes) => document.querySelector('main ol[aria-label^="Ronda"]')?.getAttribute('aria-label') !== antes, r.orden, { timeout: 15000 })
  return r
}

// Juega la actividad actual completa desde el camino. `plan(i, ronda)` decide los
// errores de cada ronda. Devuelve true si la logró.
export async function jugarActividad(p, { ritmo = 'nino', plan = () => ({}) } = {}) {
  const pg = p.pagina
  const nino = ritmo === 'nino'
  if (nino) await escuchar(p, { min: 600 })
  const jugar = pg.getByRole('button', { name: '¡A jugar!' })
  // Si el clic cae mientras el botón todavía está entrando, se repite.
  for (let i = 0; i < 4; i++) {
    await p.clic(pg.getByRole('button', { name: '¡Empezar!' }), { antes: nino ? 400 : 150, despues: nino ? 500 : 200 })
    if (await jugar.waitFor({ timeout: 4000 }).then(() => true, () => false)) break
  }
  p.marca('empezar')
  await jugar.waitFor()
  p.marca('como-se-juega')
  if (nino) await escuchar(p)
  await p.clic(jugar, { antes: nino ? 400 : 150, despues: 200 })
  p.marca('a-jugar')
  for (let i = 0; ; i++) {
    const premio = await pg.locator('main p[aria-label^="Ganaste"]').count()
    if (premio) break
    const hay = await pg.locator('main ol[aria-label^="Ronda"]').count()
    if (!hay) {
      await pausa(200)
      continue
    }
    const previa = await leerRonda(pg)
    await resolverRonda(p, { ritmo, ...plan(i, previa) })
  }
  p.marca('premio')
  const logrado = (await pg.getByRole('button', { name: 'Seguir', exact: true }).count()) > 0
  return logrado
}

// Tras el premio: seguir (o intentar otra vez) y volver al camino o al resumen.
export async function seguir(p, { ritmo = 'nino' } = {}) {
  const pg = p.pagina
  const nino = ritmo === 'nino'
  const boton = pg.getByRole('button', { name: /^(Seguir|Intentar otra vez)$/ })
  if (nino) await escuchar(p, { min: 1200, despues: 900 })
  await p.clic(boton, { antes: nino ? 400 : 200, despues: nino ? 1200 : 300 })
  p.marca('seguir')
}
