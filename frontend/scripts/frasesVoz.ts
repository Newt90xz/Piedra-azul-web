// Catálogo de todo lo que la app puede decir en voz alta, para pregrabarlo con
// la voz neuronal (ver scripts/voz/README.md). Las frases se graban por trozos
// (src/lib/claveVoz.ts) y la app los encadena. Escribe scripts/voz/trozos.json
// con { clave, texto } por trozo.
//
//   node scripts/frasesVoz.ts
//
// Las actividades se arman al azar desde un banco: se generan muchas veces para
// juntar todas sus frases. Los nombres de los niños no se conocen de antemano;
// se agregan desde scripts/voz/nombres.txt (uno por línea), si existe.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ACTIVIDADES, type Ronda } from '../src/contenido/actividades.ts'
import { fonemaDe } from '../src/contenido/banco.ts'
import { CONTENIDOS } from '../src/contenido/contenidos.ts'
import { COLORES, GROSORES, LETRAS } from '../src/contenido/dibujo.ts'
import { PICTOS_MENSAJE } from '../src/contenido/mensajes.ts'
import { AVATARES_TIENDA, faltanMonedas } from '../src/contenido/tienda.ts'
import { EMOCIONES } from '../src/lib/avance.ts'
import { claveFrase, normalizarFrase, trozosFrase } from '../src/lib/claveVoz.ts'

const VECES_POR_GENERADOR = 2000
const MAX_MONEDAS = 60 // 5 rondas × (10 + 2 de racha)
const carpeta = join(dirname(fileURLToPath(import.meta.url)), 'voz')

const frases = new Set<string>()
const agregar = (...t: (string | undefined)[]) => t.forEach((x) => x && frases.add(normalizarFrase(x)))

// ---------- Actividades (actividades/Partida.tsx y actividades/rondas.tsx) ----------

function deRonda(r: Ronda) {
  agregar(r.instruccion, r.refuerzo)
  switch (r.tipo) {
    case 'elegir':
      agregar(r.pista, r.estimulo.audio, ...r.opciones.map((o) => o.audio), ...(r.estimulo.silabas ?? []).map((s) => s.toLowerCase()))
      break
    case 'construir':
      agregar(r.pista, ...r.fichas)
      break
    case 'aplausos':
      agregar(r.pista, ...r.palabra.silabas)
      break
    case 'explorar':
      agregar(r.fonema, r.ejemplo.texto)
      break
    case 'choque':
      agregar(`${fonemaDe(r.consonante)}${fonemaDe(r.vocal)}… ${r.consonante + r.vocal}`)
      break
  }
}

const generadores = [...ACTIVIDADES.map((a) => a.generar), ...CONTENIDOS.flatMap((c) => c.pasos.map((p) => p.generar))]
for (const generar of generadores) for (let i = 0; i < VECES_POR_GENERADOR; i++) generar().forEach(deRonda)

agregar('¡Mira! Es esta. ¡Tócala!', 'Escuchar otra vez', 'Volver a los juegos', 'Aplaudir', 'Juntar', 'Siguiente', '1', '2', '3', '4')

// Premio (Partida.tsx)
for (let n = 0; n <= MAX_MONEDAS; n++) {
  agregar(`¡Lo lograste! Ganaste ${n} monedas.`, `¡Ganaste ${n} monedas! Vamos a intentarlo otra vez.`, `¡Muy bien! Ganaste ${n} monedas.`)
}

// ---------- Sala de trabajo (paginas/aula/Secuencia.tsx) ----------

for (const c of CONTENIDOS) for (const p of c.pasos) agregar(`¡Vamos! ${p.titulo}.`, `¡Vamos otra vez! ${p.titulo}.`)
for (const j of ACTIVIDADES.filter((a) => a.juego)) agregar(j.titulo)
agregar('¡Empezar!', 'Seguir', 'Intentar otra vez', '¡Terminaste todo! Mira tus estrellas.', '¡A jugar!', '¡Elige un juego!', '¡Jugar otra vez!')

// ---------- Entrada, emoción, espera, tienda y patio ----------

agregar(
  '¿Quién eres? Toca tu foto.',
  'Ese perfil ya entró en otro computador. Pide ayuda a tu profe.',
  'Ese perfil no está disponible. Pide ayuda a tu profe.',
  'No se pudo entrar. Intenta otra vez.',
  '¡Hola!',
  '¿Cómo te sientes hoy?',
  ...Object.values(EMOCIONES).map((e) => e.texto),
  'Mientras esperas a tu profe, ¡revienta los globos!',
  'Globos',
  'Tienda de avatares',
  'Apagar la música',
  'Poner música',
  '¡La tienda! Toca un avatar para ponértelo.',
  '¡Listo!',
  'No se pudo cambiar. Intenta otra vez.',
  '¡Te faltan monedas!',
  'No se pudo comprar. Intenta otra vez.',
  'Mi avatar de siempre',
  'No, gracias',
  '¡Sí, comprar!',
  '¡Llegaste al patio! Toca un dibujo para saludar a tus amigos.',
  ...PICTOS_MENSAJE.map((p) => p.voz),
  'Mi inicio',
  'Activar la voz',
  'Apagar la voz',
  'Salir',
)
for (let n = 10; n <= 300; n += 10) agregar(`¡Muy bien! ¡${n} globos!`)
const maxPrecio = Math.max(...AVATARES_TIENDA.map((a) => a.precio))
for (let n = 1; n <= maxPrecio; n++) agregar(faltanMonedas(n))
for (const a of AVATARES_TIENDA) {
  agregar(a.nombre, `${a.nombre}, ${a.precio} monedas`, `¿Quieres el ${a.nombre}? Cuesta ${a.precio} monedas.`, `¡Ahora eres un ${a.nombre}!`)
}

// ---------- Sala de dibujo (paginas/aula/Dibujo.tsx) ----------

agregar(
  '¡La sala de dibujo! Elige un color y dibuja.',
  ...COLORES.map((c) => c.nombre),
  ...GROSORES.map((g) => g.nombre),
  'Goma',
  'Sellos',
  'Sello',
  'Repasar letras',
  'Sin letra',
  ...LETRAS.map((l) => `Letra ${l}`),
  'Sigue la letra con tu dedo.',
  'Deshacer',
  'Hoja nueva',
  '¡Hoja nueva!',
  'No, seguir dibujando',
  'Sí, hoja nueva',
)

// ---------- Nombres de los niños (opcional) ----------

const archivoNombres = join(carpeta, 'nombres.txt')
const nombres = existsSync(archivoNombres)
  ? readFileSync(archivoNombres, 'utf8')
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter(Boolean)
  : []
for (const n of nombres) {
  agregar(n, `¡Hola, ${n}!`, `${n} ya entró`, ...PICTOS_MENSAJE.map((p) => `${n} dice: ${p.voz}`))
}

// ---------- Salida ----------

const trozos = new Set([...frases].flatMap(trozosFrase))
const lista = [...trozos].sort().map((texto) => ({ clave: claveFrase(texto), texto }))
const claves = new Set(lista.map((f) => f.clave))
if (claves.size !== lista.length) throw new Error('Dos trozos dieron la misma clave: cambia el hash en src/lib/claveVoz.ts')
writeFileSync(join(carpeta, 'trozos.json'), JSON.stringify(lista, null, 1) + '\n')
console.log(`${frases.size} frases → ${lista.length} trozos (${nombres.length} nombres) → scripts/voz/trozos.json`)
console.log(`${lista.reduce((s, f) => s + f.texto.length, 0)} caracteres en total`)
