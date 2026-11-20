import type { Palabra } from '../dominio/tipos.ts'

// Temas de las palabras del banco: agrupan las palabras por su significado
// (frutas, oficios, meses…). No confundir con la categoría de una actividad
// (actividades.ts: la habilidad que mide) ni con la temática del fondo que
// elige el niño (tipos.ts: Tematica).
//
// Regla de oro: el vocabulario tiene que ser claro. Una pregunta nunca puede
// tener dos respuestas defendibles, ni dos dibujos que se confundan.

// En este orden se muestran (y van en banco.ts).
export const TEMAS_IDS = [
  'animales',
  'frutas',
  'verduras',
  'alimentos',
  'cuerpo',
  'familia',
  'profesiones',
  'oficios',
  'transporte',
  'ropa',
  'casa',
  'juguetes',
  'naturaleza',
  'personajes',
  'meses',
  'estaciones',
] as const

export type Tema = (typeof TEMAS_IDS)[number]

interface DatosTema {
  // Hasta 20 caracteres: es el ítem de las rondas de «¿Cuál no va?» en la base.
  nombre: string
  icono: string
  // Cómo se nombra uno en la pregunta («¿Cuál es una fruta?»). null: el tema no
  // se pregunta (es una mezcla, como «Casa y objetos»); sus palabras solo sirven
  // de distractor.
  uno: string | null
  // Temas con los que nunca se contrasta, porque una palabra podría pasar por
  // del otro: el pez también es alimento, el dibujo del panadero trae pan y el
  // del piloto, un avión. Vale en los dos sentidos (basta anotarlo en uno).
  noContrastar: Tema[]
  // Meses y estaciones: sus dibujos (calendarios con número, un sol, una flor)
  // no se distinguen sin leer o chocan con «sol» y «flor». No entran al banco
  // general (sílabas, rimas, escucho…): solo a las actividades de vocabulario.
  abstracto?: true
  // Personajes: ¿el unicornio es un animal? ¿payaso es un oficio? Quedan fuera
  // de las actividades de vocabulario.
  sinVocabulario?: true
}

export const TEMAS: Record<Tema, DatosTema> = {
  animales: { nombre: 'Animales', icono: '🐾', uno: 'un animal', noContrastar: ['alimentos', 'profesiones', 'oficios', 'naturaleza'] },
  frutas: { nombre: 'Frutas', icono: '🍎', uno: 'una fruta', noContrastar: ['verduras', 'alimentos'] },
  verduras: { nombre: 'Verduras', icono: '🥕', uno: 'una verdura', noContrastar: ['alimentos', 'oficios', 'naturaleza'] },
  alimentos: { nombre: 'Alimentos', icono: '🍞', uno: 'un alimento', noContrastar: ['oficios', 'naturaleza'] },
  cuerpo: { nombre: 'El cuerpo', icono: '✋', uno: 'una parte del cuerpo', noContrastar: ['familia', 'profesiones', 'oficios', 'ropa'] },
  familia: { nombre: 'Familia', icono: '👨‍👩‍👧', uno: 'alguien de la familia', noContrastar: ['profesiones', 'oficios'] },
  profesiones: { nombre: 'Profesiones', icono: '🩺', uno: 'una profesión', noContrastar: ['oficios', 'transporte'] },
  oficios: { nombre: 'Oficios', icono: '🔨', uno: 'un oficio', noContrastar: ['transporte', 'naturaleza'] },
  transporte: { nombre: 'Medios de transporte', icono: '🚗', uno: 'un medio de transporte', noContrastar: ['naturaleza'] },
  ropa: { nombre: 'Ropa', icono: '👕', uno: 'una prenda de ropa', noContrastar: ['casa', 'juguetes'] },
  casa: { nombre: 'Casa y objetos', icono: '🏠', uno: null, noContrastar: ['juguetes'] },
  juguetes: { nombre: 'Juguetes y útiles', icono: '🧸', uno: null, noContrastar: [] },
  naturaleza: { nombre: 'Naturaleza y lugares', icono: '🌳', uno: null, noContrastar: ['meses', 'estaciones'] },
  personajes: { nombre: 'Personajes', icono: '🦄', uno: null, noContrastar: [], sinVocabulario: true },
  meses: { nombre: 'Meses del año', icono: '📅', uno: 'un mes', noContrastar: ['estaciones'], abstracto: true },
  estaciones: { nombre: 'Estaciones del año', icono: '🍂', uno: 'una estación del año', noContrastar: [], abstracto: true },
}

export const esTema = (t: unknown): t is Tema => typeof t === 'string' && (TEMAS_IDS as readonly string[]).includes(t)

// Fuera del banco general: meses y estaciones.
export const enBancoGeneral = (w: Palabra) => !(w.tema && TEMAS[w.tema].abstracto)

// Dos temas se pueden contrastar en una misma pregunta («¿Cuál es una fruta?»
// con un perro de distractor) si son distintos y ninguno marca al otro.
export function contrastables(a: Tema, b: Tema) {
  if (a === b || TEMAS[a].sinVocabulario || TEMAS[b].sinVocabulario) return false
  return !TEMAS[a].noContrastar.includes(b) && !TEMAS[b].noContrastar.includes(a)
}

// Los que se pueden preguntar en las actividades de vocabulario.
export const TEMAS_PREGUNTABLES = TEMAS_IDS.filter((t) => TEMAS[t].uno && !TEMAS[t].sinVocabulario)

// Los que la docente puede elegir para filtrar las palabras de un contenido.
export const TEMAS_FILTRO = TEMAS_IDS.filter((t) => !TEMAS[t].abstracto && !TEMAS[t].sinVocabulario)

// Dibujos que se parecen tanto que no pueden ser opciones de una misma ronda
// (el dibujo de la paloma con la palabra «pájaro», la doctora y la profesora
// con delantal blanco, la naranja y el durazno). Por id de palabra.
export const PARECIDOS = [
  ['pajaro', 'paloma', 'loro', 'pollito', 'pollo'],
  ['nino', 'nina', 'guagua'],
  ['mama', 'abuela'],
  ['flor', 'flores'],
  ['coneja', 'raton'],
  ['perro', 'lobo'],
  ['puma', 'leon'],
  ['arbol', 'pino'],
  ['zapato', 'bota'],
  ['dedo', 'una', 'mano'],
  ['doctora', 'profesora', 'cientifica', 'veterinaria', 'dentista'],
  ['cocinero', 'panadero'],
  ['mecanico', 'albanil', 'carabinero', 'cartero'],
  ['naranja', 'durazno', 'mango', 'calabaza'],
  ['manzana', 'tomate', 'cereza'],
  ['melon', 'sandia'],
  ['mora', 'uvas'],
  ['auto', 'ambulancia'],
]

export const parecidos = (a: string, b: string) => a === b || PARECIDOS.some((g) => g.includes(a) && g.includes(b))
