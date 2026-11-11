// C5, C6 y C7 · Llega el niño y la educadora mueve las piezas.
// Sofía entra (saludo → emoción → espera con globos). En la tablet de Tomás su personaje
// queda con 🔒. La educadora la ve «En recreo» y la arrastra a Grupo Letras: la tablet
// de Sofía cambia sola al camino. Después entran los demás y también los arrastra.
// Se graban a la vez la educadora, Sofía y Tomás.
import { APP, abrirEducadora, abrirTablet, pausa } from './lib.mjs'
import { entrar, reventarGlobos } from './juego.mjs'

export default async function c05() {
  const edu = await abrirEducadora('c05-educadora')
  const sofia = await abrirTablet('c05-sofia', 'Sofía')
  const tomas = await abrirTablet('c05-tomas', 'Tomás')
  const otros = await Promise.all(['Martina', 'Benjamín', 'Isidora', 'Lucas'].map((n) => abrirTablet(`c05-${n}`, n, { grabar: false })))
  const todas = [edu, sofia, tomas]
  const marca = (m) => todas.forEach((p) => p.marca(m))

  await edu.pagina.goto(`${APP}/docente/salas`, { waitUntil: 'networkidle' })
  await edu.pagina.getByText('Nueva sala').waitFor()
  const ficha = (n) => edu.pagina.locator('li[draggable="true"]', { hasText: n })
  const sala = (n) => edu.pagina.locator(`section[aria-label="${n}"]`)
  // La otra tablet ya está en la grilla, esperando a su dueño.
  await tomas.pagina.goto(`${APP}/alumno`, { waitUntil: 'networkidle' })
  await tomas.pagina.getByRole('button', { name: 'SOFÍA', exact: true }).waitFor()

  // C5 · Sofía entra.
  marca('c5')
  await entrar(sofia)
  marca('sofia-en-espera')
  await reventarGlobos(sofia, 2)

  // C6 · En la otra tablet su personaje tiene candado.
  await tomas.pagina.getByRole('button', { name: 'SOFÍA ya entró' }).waitFor({ timeout: 15000 })
  marca('candado')
  const candado = await tomas.centro(tomas.pagina.getByRole('button', { name: 'SOFÍA ya entró' }))
  await tomas.mover(candado.x + 30, candado.y - 20, 700)

  // La educadora la ve en la franja «Recreo» con el punto verde.
  await ficha('Sofía').getByText('En recreo').waitFor({ timeout: 15000 })
  marca('sofia-en-recreo')
  const f = await edu.centro(ficha('Sofía'))
  await edu.mover(f.x, f.y + 6, 800)
  await reventarGlobos(sofia, 3)
  await pausa(800)

  // C7 · La arrastra a Grupo Letras y la tablet cambia sola.
  marca('c7')
  await edu.arrastrar(ficha('Sofía').locator('button').first(), sala('Grupo Letras').getByText('Arrastra aquí a los niños.'))
  marca('sofia-soltada')
  await sofia.pagina.getByRole('button', { name: '¡Empezar!' }).waitFor({ timeout: 20000 })
  marca('sofia-camino')
  await sala('Grupo Letras').getByText('Sofía').waitFor()
  await pausa(4500)
  marca('sofia-lista')

  // Los demás entran (Tomás a la vista, el resto sin grabar) y ella los va arrastrando.
  await entrar(tomas, { emocion: 'Tranquilo' })
  await Promise.all(otros.map((o, i) => entrar(o, { lento: false, emocion: ['Tranquilo', 'Feliz', 'Feliz', 'Feliz'][i] })))
  await ficha('Lucas').getByText('En recreo').waitFor({ timeout: 20000 })
  await ficha('Tomás').getByText('En recreo').waitFor({ timeout: 20000 })
  marca('todos-en-recreo')
  await pausa(1500)
  for (const n of ['Tomás', 'Martina', 'Benjamín', 'Isidora', 'Lucas']) {
    marca(`arrastra-${n}`)
    await edu.arrastrar(ficha(n).locator('button').first(), sala('Grupo Letras').locator('ul').last(), 800)
    marca(`soltado-${n}`)
  }
  await tomas.pagina.getByRole('button', { name: '¡Empezar!' }).waitFor({ timeout: 20000 })
  marca('tomas-camino')
  for (const o of otros) await o.pagina.getByRole('button', { name: '¡Empezar!' }).waitFor({ timeout: 20000 })
  await sala('Grupo Letras').getByText('6 niños').waitFor({ timeout: 15000 })
  marca('todos-en-sala')
  await pausa(5000)
  marca('fin')
  for (const p of [...todas, ...otros]) await p.cerrar()
}
