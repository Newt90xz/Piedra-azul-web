import type { ParametrosJuego, PlantillaActividad } from '../dominio/tipos.ts'
import { ALFABETO } from './banco.ts'
import { escuchaLaLetra, type Categoria, type Ronda } from './actividades.ts'
import type { NivelExigencia } from './exigencia.ts'
import type { Area, CodigoOA } from './contenidos.ts'
import { TEMAS, esTema, type Tema } from './temas.ts'
import { MIN_PALABRAS_TEMA, cualEs, cualNoVa, temasPreguntables } from './vocabulario.ts'

// Actividades que configura la docente: la mecánica está en código y ella elige
// con qué se juega (RF-15). Cada configuración se puede guardar como plantilla y
// reutilizar. Para sumar otra actividad configurable basta agregarla a esta lista.

export interface JuegoConfigurable {
  id: string
  titulo: string
  descripcion: string
  instrucciones: string
  icono: string
  color: string
  categoria: Categoria
  area: Area
  oa: CodigoOA[]
  // Qué elige la docente: letras del alfabeto o temas de palabras.
  eleccion: 'letras' | 'temas'
  porDefecto: ParametrosJuego
  // Qué falta para poder jugarla; null si está lista.
  validar: (p: ParametrosJuego) => string | null
  generar: (p: ParametrosJuego, nivel?: NivelExigencia) => Ronda[]
  // Lo elegido, en corto, para el plan de la docente: «M, P, S».
  resumen: (p: ParametrosJuego) => string
}

export const letrasDe = (p: ParametrosJuego) => (Array.isArray(p.letras) ? p.letras.filter((l): l is string => typeof l === 'string') : [])
export const temasDe = (p: ParametrosJuego): Tema[] => (Array.isArray(p.temas) ? p.temas.filter(esTema) : [])

export const TODAS_LAS_LETRAS = ALFABETO.map((l) => l.id)
export const VOCALES_ALFABETO = ['a', 'e', 'i', 'o', 'u']

export const JUEGOS_CONFIGURABLES: JuegoConfigurable[] = [
  {
    id: 'escucha-letra',
    titulo: 'Escucha y toca la letra',
    descripcion: 'Suena una letra y el niño toca cuál es, entre las letras que elijas.',
    instrucciones: 'Escucha el sonido y toca la letra.',
    icono: '🔤',
    color: 'var(--color-nino-amarillo)',
    categoria: 'letras',
    area: 'letras',
    oa: ['OA 7'],
    eleccion: 'letras',
    porDefecto: { letras: TODAS_LAS_LETRAS },
    validar: (p) => {
      const letras = ALFABETO.filter((l) => letrasDe(p).includes(l.id))
      if (letras.length < 2) return 'Elige al menos 2 letras.'
      // Con solo B y V, o solo C, K y Q, no habría forma de distinguirlas de oído.
      if (new Set(letras.map((l) => l.sonido)).size < 2) return 'Esas letras suenan igual: agrega una que suene distinto.'
      return null
    },
    generar: (p) => escuchaLaLetra(letrasDe(p)),
    resumen: (p) => {
      const letras = letrasDe(p)
      if (letras.length === ALFABETO.length) return 'Todas las letras'
      return ALFABETO.filter((l) => letras.includes(l.id))
        .map((l) => l.grafema)
        .join(', ')
    },
  },
  {
    id: 'cual-es',
    titulo: 'Adivina cuál es',
    descripcion: 'Se pregunta «¿Cuál es una fruta?» y el niño toca la única del tema, entre dibujos de otros temas que no se confunden con él.',
    instrucciones: 'Escucha la pregunta y toca el dibujo que corresponde.',
    icono: '🔎',
    color: 'var(--color-nino-menta)',
    categoria: 'vocabulario',
    area: 'vocabulario',
    oa: ['OA 4'],
    eleccion: 'temas',
    porDefecto: { temas: ['frutas', 'transporte', 'animales'] },
    validar: validarTemas,
    generar: (p, nivel) => cualEs(temasDe(p), nivel),
    resumen: resumenTemas,
  },
  {
    id: 'cual-no-va',
    titulo: 'Encuentra el que no va',
    descripcion: 'Tres dibujos de un tema y uno de otro: el niño toca el que no va («¿Cuál no es una fruta?»).',
    instrucciones: 'Escucha la pregunta y toca el dibujo que no va con los otros.',
    icono: '🙅',
    color: 'var(--color-nino-lila)',
    categoria: 'vocabulario',
    area: 'vocabulario',
    oa: ['OA 4'],
    eleccion: 'temas',
    porDefecto: { temas: ['frutas', 'transporte', 'animales'] },
    validar: validarTemas,
    generar: (p, nivel) => cualNoVa(temasDe(p), nivel),
    resumen: resumenTemas,
  },
]

export const juegoConfigurable = (id: string) => JUEGOS_CONFIGURABLES.find((j) => j.id === id)

function validarTemas(p: ParametrosJuego) {
  const elegidos = temasDe(p)
  if (elegidos.length === 0) return 'Elige al menos un tema.'
  const preguntables = temasPreguntables()
  const sinPalabras = elegidos.filter((t) => !preguntables.includes(t))
  if (sinPalabras.length > 0) return `«${sinPalabras.map((t) => TEMAS[t].nombre).join('», «')}» no se puede preguntar: necesita al menos ${MIN_PALABRAS_TEMA} palabras claras.`
  return null
}

function resumenTemas(p: ParametrosJuego) {
  return temasDe(p)
    .map((t) => TEMAS[t].nombre)
    .join(', ')
}

// Plantillas listas para usar, iguales para todas las docentes. Las propias se
// guardan en la base (plantillas_actividad).
export const PLANTILLAS_SISTEMA: PlantillaActividad[] = [
  { id: 'sistema-todas', nombre: 'Todas las letras', juegoId: 'escucha-letra', parametros: { letras: TODAS_LAS_LETRAS }, sistema: true },
  { id: 'sistema-vocales', nombre: 'Vocales', juegoId: 'escucha-letra', parametros: { letras: VOCALES_ALFABETO }, sistema: true },
  { id: 'sistema-consonantes', nombre: 'Consonantes', juegoId: 'escucha-letra', parametros: { letras: TODAS_LAS_LETRAS.filter((l) => !VOCALES_ALFABETO.includes(l)) }, sistema: true },
  { id: 'sistema-mplst', nombre: 'M, P, L, S, T', juegoId: 'escucha-letra', parametros: { letras: ['m', 'p', 'l', 's', 't'] }, sistema: true },
  // Una por tema en cada actividad de vocabulario.
  ...temasPreguntables().flatMap((t): PlantillaActividad[] => [
    { id: `sistema-cual-es-${t}`, nombre: `${TEMAS[t].nombre} · ¿cuál es?`, juegoId: 'cual-es', parametros: { temas: [t] }, sistema: true },
    { id: `sistema-no-va-${t}`, nombre: `${TEMAS[t].nombre} · ¿cuál no va?`, juegoId: 'cual-no-va', parametros: { temas: [t] }, sistema: true },
  ]),
]
