import { mezclar, tomar, type Ronda, type Tarjeta } from './actividades.ts'
import { PALABRAS } from './banco.ts'

// Conciencia léxica (Bases Curriculares, OA 3), como la ficha de papel «Marca
// con una X las palabras que corresponden con el dibujo»: una grilla de
// tarjetas, cada una con un dibujo y una palabra escrita (que se escucha al
// tocarla), y se marcan las que corresponden. Rompe a propósito el formato de
// las demás actividades (una pregunta, una respuesta).

const MAYUS = (s: string) => s.toUpperCase()

const RONDAS = 5
// Tarjetas por pantalla (como la ficha: 2 filas de 4). El nivel de exigencia deja menos.
export const TARJETAS = 8

// Dibujos que se parecen tanto que una tarjeta «no corresponde» sería injusta
// (el dibujo de una paloma con la palabra «pájaro»).
const PARECIDOS = [
  ['pajaro', 'paloma', 'loro', 'pollito', 'pollo'],
  ['nino', 'nina', 'guagua'],
  ['mama', 'abuela'],
  ['flor', 'flores'],
  ['coneja', 'raton'],
  ['sapo', 'rana'],
]
const parecidos = (a: string, b: string) => a === b || PARECIDOS.some((g) => g.includes(a) && g.includes(b))

// Una sola imagen por emoji (flor y flores comparten dibujo) y sin acciones.
const DIBUJABLES = PALABRAS.filter((w, i) => PALABRAS.findIndex((x) => x.imagen.emoji === w.imagen.emoji) === i)

// Cuántas corresponden en una pantalla: al menos 2 y al menos 2 que no, sin patrón fijo.
const cuantasCorresponden = () => 2 + Math.floor(Math.random() * (TARJETAS - 3))

const INSTRUCCION_PALABRAS = 'Marca con una X las palabras que corresponden con el dibujo. Toca la tarjeta para escucharla.'

// Cada tarjeta, un dibujo con una palabra; la mitad más o menos no es la suya.
export function palabrasDelDibujo(): Ronda[] {
  return Array.from({ length: RONDAS }, () => {
    const si = cuantasCorresponden()
    const tarjetas = tomar(DIBUJABLES, TARJETAS).map((w, i): Tarjeta => {
      // La palabra equivocada no se parece al dibujo ni suena casi igual (pollo/pollito).
      const otra = i < si ? w : tomar(DIBUJABLES.filter((x) => !parecidos(x.id, w.id) && x.id.slice(0, 3) !== w.id.slice(0, 3)), 1)[0]
      return { id: `${i}`, imagen: w.imagen, texto: MAYUS(otra.texto), audio: otra.texto, corresponde: i < si }
    })
    return {
      tipo: 'marcar',
      item: 'Palabra y dibujo',
      tarjetas: mezclar(tarjetas),
      instruccion: INSTRUCCION_PALABRAS,
      pista: '¡Casi! Toca cada tarjeta, escucha la palabra y mira el dibujo. ¡Otra vez!',
      refuerzo: '¡Muy bien! Encontraste todas.',
    }
  })
}
