// Exploración (no es una toma): pantallazos del parque, la tienda y el dibujo desde la
// tablet de Sofía, para escribir la toma del recreo.
// Uso: node --env-file=../frontend/.env scripts/capturas/explorar-recreo.mjs <carpeta>
import { APP, abrirTablet, cerrarNavegador, pausa } from './lib.mjs'
import { CURSO } from '../datos/montar.mjs'
import { ok, sesionDocente } from '../datos/sesion.mjs'

const salida = process.argv[2]
const s = await sesionDocente()
const curso = ok(await s.from('cursos').select('id').eq('nombre', CURSO).single())
const recreo = ok(await s.from('salas').select('id, juegos').eq('curso_id', curso.id).eq('tipo', 'recreo').single())
const foto = (p, n) => p.pagina.screenshot({ path: `${salida}/${n}.png` })

const p = await abrirTablet('exp-sofia', 'Sofía', { continua: true, grabar: false })
const pg = p.pagina
await pg.goto(`${APP}/alumno`, { waitUntil: 'networkidle' })
await pg.locator('main[aria-label^="Recreo"]').waitFor({ timeout: 20000 })
await pausa(2500)
await foto(p, 'parque')
console.log('juegos:', await pg.locator('button.parque-icono').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label') + ' @' + Math.round(x.getBoundingClientRect().x) + ',' + Math.round(x.getBoundingClientRect().y))))
await p.clic(pg.getByRole('button', { name: 'Tienda', exact: true }), { ms: 200, despues: 200 })
await pg.getByRole('button', { name: 'Volver al parque' }).waitFor({ timeout: 20000 })
await p.clic(pg.locator('nav[aria-label="Secciones de la tienda"] button').nth(2), { ms: 200, despues: 400 })
for (const sec of ['Trajes', 'Zapatos', 'Capas y alas']) { await p.clic(pg.getByRole('button', { name: sec, exact: true }), { ms: 200, despues: 500 }); console.log(sec + ':', await pg.locator('main button[aria-label*="monedas"]').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')))) }
await p.clic(pg.locator('nav[aria-label="Secciones de la tienda"] button').nth(3), { ms: 200, despues: 400 })
await p.clic(pg.getByRole('button', { name: 'Mascotas', exact: true }), { ms: 200, despues: 500 }); console.log('Mascotas:', await pg.locator('main button[aria-label*="monedas"]').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label'))))
await foto(p, 'tienda-mascotas')
await p.clic(pg.getByRole('button', { name: 'Volver al parque' }), { ms: 200, despues: 200 })
await pausa(800)

ok(await s.from('salas').update({ actividad: 'dibujo', juegos: recreo.juegos }).eq('id', recreo.id).select('id'))
await pg.getByRole('button', { name: 'Repasar letras' }).waitFor({ timeout: 20000 })
await pausa(1500)
await foto(p, 'dibujo')
console.log('dibujo botones:', await pg.locator('main button, [role=group] button').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')).filter(Boolean)))
await p.clic(pg.getByRole('button', { name: 'Repasar letras' }), { ms: 200, despues: 200 })
await pausa(900)
await foto(p, 'dibujo-letras')
await p.clic(pg.getByRole('button', { name: 'Letra M', exact: true }), { ms: 200, despues: 200 })
await pausa(1200)
await foto(p, 'dibujo-m')
const hoja = await pg.getByLabel('Hoja para dibujar').boundingBox()
console.log('hoja:', JSON.stringify(hoja))
ok(await s.from('salas').update({ actividad: 'parque' }).eq('id', recreo.id).select('id'))
await pausa(500)
await p.cerrar()
await cerrarNavegador()

