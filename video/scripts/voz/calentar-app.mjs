// Deja generadas de antemano las frases de la app que salen en las tomas, para que
// durante la grabación suenen al instante (como desde la segunda vez en el aula).
// Las frases salen de los mismos módulos de la app, no se escriben a mano.
// Uso: node scripts/voz/calentar-app.mjs   (backend y Pocket-TTS arriba)
import { juegoConfigurable } from '../../../frontend/src/contenido/plantillas.ts'
import { contenido } from '../../../frontend/src/contenido/contenidos.ts'
import { JUEGOS_PARQUE } from '../../../frontend/src/contenido/parque.ts'
import { PICTOS_MENSAJE } from '../../../frontend/src/contenido/mensajes.ts'
import { ARTICULOS } from '../../../frontend/src/contenido/tienda.ts'

const API = process.env.VITE_API_URL ?? 'http://localhost:3000'
const frases = new Set([
  '¿Quién eres? Toca tu foto.', '¿Cómo te sientes hoy?',
  '¡Es hora del recreo! Revienta los globos mientras tu profe te asigna una sala.', '¡Muy bien! ¡10 globos!',
  '¡Mira! Es esta. ¡Tócala!', '¡Terminaste todo! Mira tus estrellas.', '¡Al recreo!', '¡Seguimos!',
  '¡Llegaste al recreo! Toca el pasto para caminar.', '¡La tienda! Toca algo para probártelo.', '¡Ya es tuyo!',
  '¡La sala de dibujo! Elige un color y dibuja.', 'Sigue la letra con tu dedo.',
])
for (const n of ['Sofía', 'Tomás', 'Martina', 'Benjamín', 'Isidora', 'Lucas']) frases.add(`¡Hola, ${n}!`).add(n)
// La tienda: probar un artículo dice su nombre y precio; ponérselo, su nombre.
for (const a of ARTICULOS.filter((x) => ['ropa', 'traje', 'zapatos', 'espalda', 'mano', 'mascota', 'vehiculo'].includes(x.espacio))) {
  frases.add(a.nombre)
  if (a.precio) frases.add(`${a.nombre}, ${a.precio} monedas`)
}
frases.add('¡Hoja nueva!').add('¡Te faltan monedas!')
for (const j of JUEGOS_PARQUE) frases.add(j.voz)
for (const p of PICTOS_MENSAJE) frases.add(p.voz)
for (let n = 8; n <= 80; n++) frases.add(`¡Lo lograste! Ganaste ${n} monedas.`)
for (let n = 4; n <= 45; n++) frases.add(`¡Ganaste ${n} monedas! Vamos a intentarlo otra vez.`)

// Rondas: se generan muchas veces para juntar todas las consignas, pistas y refuerzos posibles.
const deRondas = (generar, veces = 60) => {
  for (let i = 0; i < veces; i++) for (const r of generar()) {
    frases.add(r.instruccion)
    if (r.pista) frases.add(r.pista)
    if (r.refuerzo) frases.add(r.refuerzo)
    if (r.estimulo?.audio) frases.add(r.estimulo.audio)
  }
}
const letras = juegoConfigurable('escucha-letra')
frases.add(letras.instrucciones).add(`¡Vamos! ${letras.titulo}.`).add(`¡Vamos otra vez! ${letras.titulo}.`)
deRondas(() => letras.generar({ letras: ['m', 'p', 'l', 's', 't', 'b'] }))
for (const id of ['silabas-m', 'silabas-p']) {
  const c = contenido(id)
  for (const p of c.pasos) {
    frases.add(`¡Vamos! ${p.titulo}.`).add(`¡Vamos otra vez! ${p.titulo}.`)
    if (p.instrucciones) frases.add(p.instrucciones)
    deRondas(p.generar)
  }
}

const lista = [...frases].filter(Boolean)
console.log(`${lista.length} frases`)
let hechas = 0, fallas = 0
const inicio = Date.now()
const cola = [...lista]
await Promise.all(Array.from({ length: 2 }, async () => {
  for (let f; (f = cola.shift()); ) {
    const r = await fetch(`${API}/api/voz?texto=${encodeURIComponent(f)}`).catch(() => null)
    if (r?.ok) await r.arrayBuffer(), hechas++
    else fallas++, console.log('✖', f)
  }
}))
console.log(`Listas ${hechas}, con falla ${fallas}, en ${Math.round((Date.now() - inicio) / 1000)} s`)
