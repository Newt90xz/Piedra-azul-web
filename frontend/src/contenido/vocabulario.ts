import type { Palabra } from '../dominio/tipos.ts'
import { mezclar, type Opcion, type Ronda } from './actividades.ts'
import { palabrasDelTema, PALABRAS } from './banco.ts'
import type { NivelExigencia } from './exigencia.ts'
import { TEMAS, TEMAS_PREGUNTABLES, contrastables, parecidos, type Tema } from './temas.ts'

// Vocabulario por temas (Bases Curriculares, OA 4: incorporar palabras nuevas):
// «¿Cuál es una fruta?» y «¿Cuál no es una fruta?». La docente elige los temas.
// Las otras opciones salen de temas que no se confunden con el preguntado
// (temas.ts): nunca un tomate en «¿Cuál no es una fruta?» ni el panadero, que
// trae pan en el dibujo, en «¿Cuál es un alimento?».

// Cinco rondas, como todas (en «¿Cuál no va?» el ítem es el tema, así que la
// partida no se completa con rondas de otra: tiene que traerlas todas).
export const RONDAS_VOCABULARIO = 5

// Para preguntar por un tema se necesitan al menos tres palabras: «¿Cuál no va?»
// muestra tres del tema y la que no va.
export const MIN_PALABRAS_TEMA = 3

export const temasPreguntables = () => TEMAS_PREGUNTABLES.filter((t) => palabrasDelTema(t).length >= MIN_PALABRAS_TEMA)

const opcion = (w: Palabra): Opcion => ({ id: w.id, imagen: w.imagen, audio: w.texto })
const choca = (a: Palabra, b: Palabra) => parecidos(a.id, b.id) || a.imagen.emoji === b.imagen.emoji

// `n` palabras de otros temas que se pueden contrastar con `tema`: primero una
// de cada tema, para que no sean todas animales, y ninguna que se confunda con
// las ya elegidas.
function deOtrosTemas(tema: Tema, n: number, con: Palabra[]) {
  const candidatas = mezclar(PALABRAS.filter((w) => w.tema && contrastables(tema, w.tema)))
  const r: Palabra[] = []
  for (const unaPorTema of [true, false]) {
    for (const w of candidatas) {
      if (r.length >= n) return r
      if (unaPorTema && r.some((x) => x.tema === w.tema)) continue
      if ([...con, ...r].some((x) => choca(x, w))) continue
      r.push(w)
    }
  }
  return r
}

// Los temas en turnos (frutas, oficios, frutas, oficios…) y, de cada uno, sus
// palabras en orden al azar sin repetir hasta agotarlas.
function turnos(temas: Tema[]) {
  const orden = mezclar(temas)
  const pendientes = new Map<Tema, Palabra[]>()
  const sacar = (t: Tema, n: number) => {
    const r: Palabra[] = []
    while (r.length < n) {
      if (!pendientes.get(t)?.length) pendientes.set(t, mezclar(palabrasDelTema(t).filter((w) => !r.some((x) => x.id === w.id))))
      const w = pendientes.get(t)!.shift()
      if (!w) break
      r.push(w)
    }
    return r
  }
  return Array.from({ length: RONDAS_VOCABULARIO }, (_, i) => orden[i % orden.length]).map((tema) => ({ tema, sacar: (n: number) => sacar(tema, n) }))
}

const validos = (temas: readonly string[]) => temasPreguntables().filter((t) => temas.includes(t))

// Cuántas opciones lleva cada ronda: las del nivel (sin nivel, Medio: 3).
const opciones = (nivel?: NivelExigencia) => nivel?.maxOpciones ?? 3

export function cualEs(temas: readonly string[], nivel?: NivelExigencia): Ronda[] {
  const elegidos = validos(temas)
  if (elegidos.length === 0) return []
  return turnos(elegidos).map(({ tema, sacar }) => {
    const uno = TEMAS[tema].uno!
    const [correcta] = sacar(1)
    const otras = deOtrosTemas(tema, opciones(nivel) - 1, [correcta])
    return {
      tipo: 'elegir',
      item: correcta.texto,
      estimulo: {},
      opciones: mezclar([correcta, ...otras]).map(opcion),
      correctaId: correcta.id,
      instruccion: `¿Cuál es ${uno}?`,
      pista: `¡Casi! Busca ${uno}. ¡Otra vez!`,
      refuerzo: `¡Sí! ${correcta.texto} es ${uno}.`,
    }
  })
}

// Dos o tres del tema (según el nivel) y la que no va.
export function cualNoVa(temas: readonly string[], nivel?: NivelExigencia): Ronda[] {
  const elegidos = validos(temas)
  if (elegidos.length === 0) return []
  return turnos(elegidos).map(({ tema, sacar }) => {
    const uno = TEMAS[tema].uno!
    const delTema = sacar(Math.max(2, opciones(nivel) - 1))
    const [intrusa] = deOtrosTemas(tema, 1, delTema)
    return {
      tipo: 'elegir',
      item: TEMAS[tema].nombre,
      estimulo: {},
      opciones: mezclar([...delTema, intrusa]).map(opcion),
      correctaId: intrusa.id,
      // En la dificultad más baja quedan dos del tema y la que no va.
      minOpciones: 3,
      instruccion: `¿Cuál no es ${uno}?`,
      pista: `¡Casi! Busca el dibujo que no es ${uno}. ¡Otra vez!`,
      refuerzo: `¡Sí! ${intrusa.texto} no es ${uno}.`,
    }
  })
}
