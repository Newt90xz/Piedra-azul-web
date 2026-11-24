import { mezclar, tomar, type Opcion, type PalabraOracion, type Ronda, type Tarjeta } from './actividades.ts'
import { bancoGeneral, palabra } from './banco.ts'
import { bancoDe, distractores, objetivos, opcionesDe, type Contexto } from './elegir.ts'
import type { NivelExigencia } from './exigencia.ts'
import { oracionDespacio } from './frases.ts'
import { contrastables, parecidos } from './temas.ts'

// Léxico (vocabulario), como la ficha de papel «Marca con una X las palabras
// que corresponden con el dibujo». Ojo: esto es léxico, no conciencia léxica
// (ver «Las oraciones están formadas por palabras», más abajo): una grilla de
// tarjetas, cada una con un dibujo y una palabra escrita (que se escucha al
// tocarla), y se marcan las que corresponden. Rompe a propósito el formato de
// las demás actividades (una pregunta, una respuesta).

const MAYUS = (s: string) => s.toUpperCase()

const RONDAS = 5
// Tarjetas por pantalla (como la ficha: 2 filas de 4). El nivel de exigencia deja menos.
export const TARJETAS = 8

// Una sola imagen por emoji (flor y flores comparten dibujo), sin meses ni
// estaciones (sus dibujos no se reconocen sin leer).
const GENERAL = bancoGeneral()
const DIBUJABLES = GENERAL.filter((w, i) => GENERAL.findIndex((x) => x.imagen.emoji === w.imagen.emoji) === i)

// Cuántas corresponden en una pantalla: al menos 2 y al menos 2 que no, sin patrón fijo.
const cuantasCorresponden = () => 2 + Math.floor(Math.random() * (TARJETAS - 3))

const INSTRUCCION_PALABRAS = 'Marca con una X las palabras que corresponden con el dibujo. Toca la tarjeta para escucharla.'

// Cada tarjeta, un dibujo con una palabra; la mitad más o menos no es la suya.
// Con tema, los dibujos y las palabras son primero de ese tema; en Fácil, cortas.
// Cuántas tarjetas quedan lo decide el nivel (exigencia.ts).
export function palabrasDelDibujo(c: Contexto = {}): Ronda[] {
  const b = bancoDe(DIBUJABLES, c)
  return Array.from({ length: RONDAS }, () => {
    const si = cuantasCorresponden()
    const tarjetas = objetivos(b, TARJETAS).map((w, i): Tarjeta => {
      // La palabra equivocada no se parece al dibujo ni suena casi igual (pollo/pollito).
      const otra = i < si ? w : distractores(b, 1, [w], (x) => x.id.slice(0, 3) !== w.id.slice(0, 3))[0]
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

// ---------- Las oraciones están formadas por palabras ----------
//
// Conciencia léxica según el equipo PIE: la capacidad de identificar, contar y
// manipular las palabras de una oración. No es lo mismo que el léxico (el
// conjunto de palabras de una lengua; eso es «Vocabulario»). Oraciones cortas
// y cotidianas; las palabras entre llaves son del banco y llevan su dibujo.

export const ORACIONES = [
  // 2 palabras
  '{mama} canta',
  '{papa} cocina',
  '{pato} nada',
  '{abeja} vuela',
  '{sol} brilla',
  '{gato} duerme',
  '{perro} ladra',
  '{nina} baila',
  '{guagua} llora',
  '{nino} salta',
  // 3 palabras
  'El {perro} corre',
  'La {luna} brilla',
  '{mama} come {pan}',
  'Veo un {avion}',
  'Tengo una {pelota}',
  'El {pez} nada',
  'La {vaca} come',
  'El {loro} habla',
  '{abuela} toma {leche}',
  'Llegó el {tren}',
  // 4 palabras
  'El {gato} toma {leche}',
  'Me gusta la {sandia}',
  '{papa} lee un {libro}',
  'La {abeja} busca {flores}',
  'El {mono} come {platano}',
  'Mi {perro} juega mucho',
  'El {cartero} trae cartas',
  'La {oveja} come pasto',
  // 5 palabras
  'El {bombero} apaga el fuego',
  'La {nina} come una {manzana}',
  'El {pescador} tiene un {barco}',
  'La {doctora} cura al {perro}',
  'Mi {mama} maneja un {auto}',
  'El {panadero} hace rico {pan}',
]

export interface Oracion {
  // Como la dice la voz: «El perro corre».
  texto: string
  palabras: PalabraOracion[]
  // Las que vienen del banco (llevan dibujo): id de palabra por posición.
  ids: (string | undefined)[]
}

const mayusInicial = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function oracion(plantilla: string): Oracion {
  const partes = plantilla.split(' ').map((p) => {
    const id = /^\{(.+)\}$/.exec(p)?.[1]
    if (!id) return { id: undefined, palabra: { texto: p } }
    const w = palabra(id)
    return { id, palabra: { texto: w.texto, imagen: w.imagen } }
  })
  return {
    texto: mayusInicial(partes.map((p) => p.palabra.texto).join(' ')),
    palabras: partes.map((p) => p.palabra),
    ids: partes.map((p) => p.id),
  }
}

// Cuántas palabras puede tener la oración según la dificultad: en Fácil, cortas.
const maxPalabras = (nivel?: NivelExigencia) => (nivel?.palabrasCortas ? 3 : (nivel?.maxOpciones ?? 3) >= 4 ? 5 : 4)

function oracionesPara(nivel?: NivelExigencia) {
  const todas = ORACIONES.map(oracion)
  const max = maxPalabras(nivel)
  return tomar(
    todas.filter((o) => o.palabras.length <= max),
    RONDAS,
  )
}

// Números seguidos (2, 3, 4) que incluyen la respuesta, sin bajar de 1.
function opcionesNumero(n: number, nivel?: NivelExigencia): Opcion[] {
  const k = opcionesDe(nivel)
  const inicio = Math.max(1, n - Math.floor(Math.random() * k))
  return Array.from({ length: k }, (_, i) => String(inicio + i)).map((x) => ({ id: x, texto: x, audio: x }))
}

const despacio = (o: Oracion) => oracionDespacio(o.palabras.map((p) => p.texto))

function contarPalabras(modo: 'contar' | 'escuchar') {
  return ({ nivel }: Contexto = {}): Ronda[] =>
    oracionesPara(nivel).map((o) => {
      const n = o.palabras.length
      return {
        tipo: 'oracion',
        modo,
        // El ítem va a la base (hasta 20 caracteres): cuántas palabras tenía la oración.
        item: `${n} palabras`,
        oracion: o.texto,
        palabras: o.palabras,
        opciones: opcionesNumero(n, nivel),
        correctaId: String(n),
        instruccion: modo === 'contar' ? `Escucha: ${o.texto}. ¿Cuántas palabras tiene?` : `Escucha: ${o.texto}. ¿Cuántas palabras escuchaste?`,
        pista: `¡Casi! Escucha despacio: ${despacio(o)}. ¡Cuenta otra vez!`,
        refuerzo: `¡Sí! ${o.texto} tiene ${n} palabras.`,
      }
    })
}

// Con apoyo: se ve un bloque por palabra y se tocan para contarlas.
export const cuentaLasPalabras = contarPalabras('contar')
// Sin apoyo: solo de oído; el niño aplaude una vez por palabra.
export const escuchaYCuenta = contarPalabras('escuchar')

// Decide solo: se ven todas las palabras menos una (una con dibujo) y se elige
// cuál falta entre dibujos de temas que no se confunden con ella.
export function laPalabraQueFalta({ nivel }: Contexto = {}): Ronda[] {
  const conDibujo = DIBUJABLES
  return tomar(ORACIONES.map(oracion), RONDAS).map((o) => {
    const posibles = o.ids.flatMap((id, i) => (id ? [i] : []))
    const hueco = posibles[Math.floor(Math.random() * posibles.length)]
    const correcta = palabra(o.ids[hueco]!)
    const enLaOracion = o.ids.filter(Boolean)
    const otras = tomar(
      conDibujo.filter(
        (w) => !enLaOracion.includes(w.id) && w.tema && correcta.tema && contrastables(correcta.tema, w.tema) && !parecidos(w.id, correcta.id),
      ),
      opcionesDe(nivel) - 1,
    )
    return {
      tipo: 'oracion',
      modo: 'falta',
      // La palabra que faltaba.
      item: correcta.texto,
      oracion: o.texto,
      palabras: o.palabras,
      hueco,
      opciones: mezclar([correcta, ...otras]).map((w) => ({ id: w.id, imagen: w.imagen, audio: w.texto })),
      correctaId: correcta.id,
      instruccion: `Escucha: ${o.texto}. ¿Qué palabra falta?`,
      pista: `¡Casi! Escucha otra vez: ${o.texto}.`,
      refuerzo: `¡Sí! Faltaba ${correcta.texto}: ${o.texto}.`,
    }
  })
}
