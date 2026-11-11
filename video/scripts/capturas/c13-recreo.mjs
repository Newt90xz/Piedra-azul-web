// C13, C14 y C15 · El recreo.
//  · Parque: Sofía, Lucas, Benjamín e Isidora caminan, juegan y se saludan con pictogramas.
//    La educadora ve los últimos saludos en la tarjeta del recreo.
//  · Tienda: Sofía gasta sus monedas, se prueba una prenda y la compra; suma una mascota.
//  · La educadora cambia el recreo a Dibujo: las tablets cambian solas. Lucas repasa una M.
// Se graban la educadora, Sofía y Lucas.
import { APP, abrirEducadora, abrirTablet, pausa } from './lib.mjs'

const enParque = (p) => p.pagina.locator('main[aria-label^="Recreo"]').waitFor({ timeout: 30000 })
const juego = (p, n) => p.pagina.getByRole('button', { name: n, exact: true })
const saludo = (p, n) => p.pagina.getByRole('group', { name: 'Saludar' }).getByRole('button', { name: n, exact: true })
const otros = (p) => p.pagina.getByRole('button', { name: 'Otros dibujos' })

// Compra el primer artículo de la sección que calce con `prefiere` (o el primero con precio).
async function comprar(p, pestana, seccion, prefiere) {
  const pg = p.pagina
  await p.clic(pg.locator('nav[aria-label="Secciones de la tienda"] button').nth(pestana), { antes: 500, despues: 900 })
  await p.clic(pg.getByRole('button', { name: seccion, exact: true }), { antes: 300, despues: 1100 })
  const conPrecio = pg.locator('main button[aria-label*="monedas"]')
  const nombres = await conPrecio.evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')))
  const i = Math.max(0, nombres.findIndex((n) => prefiere.test(n)))
  p.marca(`prueba · ${nombres[i]}`)
  await p.clic(conPrecio.nth(i), { antes: 500, despues: 2600 })
  p.marca('probando')
  await p.clic(pg.getByRole('button', { name: '¡Sí, comprar!' }), { antes: 500, despues: 400 })
  await pg.getByRole('button', { name: '¡Sí, comprar!' }).waitFor({ state: 'detached', timeout: 15000 })
  p.marca('comprado')
  await pausa(2600)
}

// Dibuja un trazo siguiendo puntos (en fracciones de la hoja).
async function trazo(p, hoja, puntos, ms = 1400) {
  await p.trazar(puntos.map((q) => [hoja.x + q[0] * hoja.width, hoja.y + q[1] * hoja.height]), ms)
}

export default async function c13() {
  const edu = await abrirEducadora('c13-educadora')
  const sofia = await abrirTablet('c13-sofia', 'Sofía', { continua: true })
  const lucas = await abrirTablet('c13-lucas', 'Lucas', { continua: true })
  const benjamin = await abrirTablet('c13-Benjamín', 'Benjamín', { continua: true, grabar: false })
  const isidora = await abrirTablet('c13-Isidora', 'Isidora', { continua: true, grabar: false })
  const ninos = [sofia, lucas, benjamin, isidora]
  const grabadas = [edu, sofia, lucas]
  const marca = (m) => grabadas.forEach((p) => p.marca(m))

  await edu.pagina.goto(`${APP}/docente/salas`, { waitUntil: 'networkidle' })
  const recreo = edu.pagina.locator('section[aria-label="Recreo"]').filter({ hasText: '¿Qué se hace en este recreo?' })
  await Promise.all(ninos.map(async (p) => {
    await p.pagina.goto(`${APP}/alumno`, { waitUntil: 'networkidle' })
    await enParque(p)
  }))
  await pausa(4500)

  // C13 · Parque: cada uno a lo suyo.
  marca('c13')
  await Promise.all([
    benjamin.clic(juego(benjamin, 'Resbalín'), { ms: 300 }),
    isidora.clic(juego(isidora, 'Cama elástica'), { ms: 300 }),
    lucas.clic(juego(lucas, 'Balancín'), { antes: 900 }),
  ])
  await pausa(1500)
  await sofia.clic(juego(sofia, 'Columpio'), { antes: 600, despues: 300 })
  marca('sofia-al-columpio')
  await pausa(7500)
  marca('sofia-en-columpio')
  await pausa(3000)

  // Saludos con pictogramas.
  await sofia.clic(otros(sofia), { antes: 400, despues: 700 })
  await sofia.clic(saludo(sofia, '¿Jugamos?'), { antes: 400, despues: 300 })
  marca('sofia-jugamos')
  await pausa(1400)
  await lucas.clic(saludo(lucas, '¡Hola!'), { antes: 300, despues: 300 })
  marca('lucas-hola')
  await pausa(900)
  await isidora.clic(saludo(isidora, '¡Ja, ja, ja!'), { ms: 250 })
  await benjamin.clic(saludo(benjamin, '¡Guau!'), { ms: 250 })
  await pausa(2500)
  // Lucas va a jugar con ella.
  await lucas.clic(juego(lucas, 'Columpio'), { antes: 300, despues: 300 })
  marca('lucas-al-columpio')
  await pausa(6500)
  await sofia.clic(saludo(sofia, '¡Gracias!'), { antes: 300, despues: 300 })
  marca('sofia-gracias')

  // La educadora ve los últimos saludos.
  await recreo.getByRole('list', { name: 'Últimos saludos' }).waitFor({ timeout: 20000 })
  marca('ultimos-saludos')
  const s = await edu.centro(recreo.getByRole('list', { name: 'Últimos saludos' }))
  await edu.mover(s.x + 30, s.y + 26, 900)
  await pausa(5500)

  // C15 · Tienda.
  marca('c15')
  await sofia.clic(juego(sofia, 'Tienda'), { antes: 500, despues: 300 })
  marca('sofia-a-la-tienda')
  await sofia.pagina.getByRole('button', { name: 'Volver al parque' }).waitFor({ timeout: 30000 })
  marca('tienda')
  await pausa(2200)
  await comprar(sofia, 2, 'Trajes', /estrellas|astronauta|heroe|héroe/i)
  await comprar(sofia, 3, 'Mascotas', /gatito/i)
  await sofia.clic(sofia.pagina.getByRole('button', { name: 'Volver al parque' }), { antes: 600, despues: 500 })
  await enParque(sofia)
  marca('vuelve-al-parque')
  await pausa(1800)
  await sofia.clic(juego(sofia, 'Cama elástica'), { antes: 400, despues: 300 })
  await pausa(7000)
  marca('sofia-en-cama')
  await pausa(2500)

  // C14 · La educadora cambia el recreo a Dibujo y las tablets cambian solas.
  marca('c14')
  await edu.clic(recreo.locator('label', { hasText: 'Dibujo' }), { antes: 700, despues: 300 })
  marca('clic-dibujo')
  await Promise.all(ninos.map((p) => p.pagina.getByRole('button', { name: 'Repasar letras' }).waitFor({ timeout: 30000 })))
  marca('tablets-en-dibujo')
  await recreo.getByText('Dibujando').first().waitFor({ timeout: 15000 })
  await pausa(2500)

  // Lucas repasa una M con el dedo; Sofía dibuja un sol.
  const deLucas = (async () => {
    const pg = lucas.pagina
    const letraM = pg.getByRole('button', { name: 'Letra M', exact: true })
    // La bandeja de letras se abre y se cierra con el mismo botón: se insiste hasta verla.
    for (let i = 0; i < 4 && !(await letraM.count()); i++) {
      await lucas.clic(pg.getByRole('button', { name: 'Repasar letras' }), { antes: 500, despues: 1200 })
    }
    await lucas.clic(letraM, { antes: 500, despues: 1300 })
    lucas.marca('m-tenue')
    await lucas.clic(pg.getByRole('button', { name: 'Azul', exact: true }), { antes: 300, despues: 400 })
    await lucas.clic(pg.getByRole('button', { name: 'Lápiz grueso', exact: true }), { antes: 300, despues: 500 })
    const hoja = await pg.getByLabel('Hoja para dibujar').boundingBox()
    lucas.marca('repasa')
    await trazo(lucas, hoja, [[0.37, 0.75], [0.385, 0.33], [0.5, 0.71], [0.61, 0.33], [0.63, 0.75]], 4200)
    lucas.marca('m-repasada')
  })()
  const deSofia = (async () => {
    const pg = sofia.pagina
    await sofia.clic(pg.getByRole('button', { name: 'Amarillo', exact: true }), { antes: 900, despues: 400 })
    await sofia.clic(pg.getByRole('button', { name: 'Lápiz grueso', exact: true }), { antes: 300, despues: 500 })
    const hoja = await pg.getByLabel('Hoja para dibujar').boundingBox()
    const circulo = Array.from({ length: 25 }, (_, i) => [0.5 + 0.11 * Math.cos((i / 24) * 2 * Math.PI) * (hoja.height / hoja.width), 0.42 + 0.11 * Math.sin((i / 24) * 2 * Math.PI)])
    await trazo(sofia, hoja, circulo, 2200)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 2 * Math.PI
      const r = hoja.height / hoja.width
      await trazo(sofia, hoja, [[0.5 + 0.15 * Math.cos(a) * r, 0.42 + 0.15 * Math.sin(a)], [0.5 + 0.22 * Math.cos(a) * r, 0.42 + 0.22 * Math.sin(a)]], 300)
    }
    sofia.marca('sol-dibujado')
  })()
  await Promise.all([deLucas, deSofia])
  marca('dibujos-listos')
  await pausa(3000)
  marca('fin')
  for (const p of [...grabadas, benjamin, isidora]) await p.cerrar()
}
