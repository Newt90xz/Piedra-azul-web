import type { IntentoRonda, Palabra } from '../dominio/tipos.ts'
import { actividad, mezclar, tomar, type Opcion, type Ronda } from './actividades.ts'
import { CONSONANTES_SILABAS, LETRAS, PALABRAS, VOCALES, fonemaDe, quitarTildes } from './banco.ts'

// Contenidos de las Bases Curriculares de la Educación Parvularia (MINEDUC,
// 2018), núcleo Lenguaje Verbal, Tercer Nivel (Transición):
//   OA 3: descubrir atributos fonológicos de palabras conocidas (conteo y
//         segmentación de sílabas, sonidos iniciales y finales).
//   OA 7: reconocer palabras asociando algunos fonemas a sus grafemas.
// La docente asigna contenidos a una sala; cada uno trae 3 actividades
// preordenadas de dificultad creciente. Cada partida se arma al azar desde el
// pool del contenido, así repetir una actividad nunca es igual a la anterior.

export const OA = {
  'OA 3': 'Descubrir en contextos lúdicos atributos fonológicos de palabras conocidas: conteo y segmentación de sílabas, sonidos iniciales y finales.',
  'OA 7': 'Reconocer palabras asociando algunos fonemas a sus correspondientes grafemas.',
} as const

export type CodigoOA = keyof typeof OA

interface Paso {
  titulo: string
  generar: () => Ronda[]
}

export interface Contenido {
  id: string
  oa: CodigoOA[]
  titulo: string
  descripcion: string
  // Lo que ve el niño en su camino: sin texto.
  icono: string
  color: string
  pasos: [Paso, Paso, Paso]
}

// Rondas por partida (regla de oro 4: micro-partidas de 4 a 5 rondas).
const RONDAS = 5
// Logrado si al menos el 60 % de las rondas se resolvió sin revelar la respuesta.
export const UMBRAL_APROBAR = 0.6

const MAYUS = (s: string) => s.toUpperCase()

// Una sola imagen por emoji: dos opciones con el mismo dibujo confundirían.
const BANCO = PALABRAS.filter((w, i) => PALABRAS.findIndex((x) => x.imagen.emoji === w.imagen.emoji) === i)

const opcionPalabra = (w: Palabra): Opcion => ({ id: w.id, imagen: w.imagen, audio: w.texto })
const opcionTexto = (id: string, texto: string, audio: string): Opcion => ({ id, texto, audio })

// Sílaba inicial directa (consonante + vocal), sin tildes; null si empieza distinto.
function silabaInicialCV(w: Palabra) {
  const s = quitarTildes(w.silabas[0])
  return /^[bcdfgjklmnñprstvz][aeiou]$/.test(s) ? s : null
}
const silabaFinal = (w: Palabra) => quitarTildes(w.silabas[w.silabas.length - 1])
const empiezaCon = (w: Palabra, prefijo: string) => quitarTildes(w.texto).startsWith(prefijo)

// Completa con `relleno` sin repetir ids hasta tener `n` elementos.
function completar(base: Palabra[], relleno: Palabra[], n: number) {
  const r = [...base]
  for (const w of mezclar(relleno)) {
    if (r.length >= n) break
    if (!r.some((x) => x.id === w.id)) r.push(w)
  }
  return r.slice(0, n)
}

// ---------- Vocales (OA 7, OA 3) ----------

const LETRAS_VOCALES = LETRAS.filter((l) => (VOCALES as readonly string[]).includes(l.id))
const conVocalInicial = BANCO.filter((w) => LETRAS_VOCALES.some((v) => empiezaCon(w, v.id)))

function escucharVocal(): Ronda[] {
  return tomar(LETRAS_VOCALES, RONDAS).map((v) => ({
    tipo: 'elegir',
    item: v.grafema,
    estimulo: { audio: v.fonema },
    opciones: mezclar([v, ...tomar(LETRAS_VOCALES.filter((x) => x.id !== v.id), 2)]).map((x) => opcionTexto(x.id, x.grafema, x.fonema)),
    correctaId: v.id,
    instruccion: `Escucha: ${v.fonema}. Toca la letra que suena ${v.fonema}.`,
    pista: `¡Casi! Escucha otra vez: ${v.fonema}.`,
    refuerzo: `¡Muy bien! ${v.fonema}.`,
  }))
}

function vocalInicial(): Ronda[] {
  return tomar(conVocalInicial, RONDAS).map((w) => {
    const v = LETRAS_VOCALES.find((x) => empiezaCon(w, x.id))!
    return {
      tipo: 'elegir',
      item: v.grafema,
      estimulo: { imagen: w.imagen, audio: w.texto },
      opciones: mezclar([v, ...tomar(LETRAS_VOCALES.filter((x) => x.id !== v.id), 2)]).map((x) => opcionTexto(x.id, x.grafema, x.fonema)),
      correctaId: v.id,
      instruccion: `${w.texto}. ¿Con qué sonido empieza ${w.texto}?`,
      pista: `¡Casi! Escucha: ${v.fonema}… ${w.texto}.`,
      refuerzo: `¡Sí! ${v.fonema}, de ${w.texto}.`,
    }
  })
}

function imagenConVocal(): Ronda[] {
  return tomar(conVocalInicial, RONDAS).map((correcta) => {
    const v = LETRAS_VOCALES.find((x) => empiezaCon(correcta, x.id))!
    const distractores = tomar(BANCO.filter((w) => !empiezaCon(w, v.id)), 3)
    return {
      tipo: 'elegir',
      item: v.grafema,
      estimulo: { texto: v.grafema, audio: v.fonema },
      opciones: mezclar([correcta, ...distractores]).map(opcionPalabra),
      correctaId: correcta.id,
      instruccion: `Escucha: ${v.fonema}. Toca el dibujo que empieza con ${v.fonema}.`,
      pista: `¡Casi! ${v.fonema}… ${correcta.texto}. ¡Otra vez!`,
      refuerzo: `¡Excelente! ${v.fonema}, de ${correcta.texto}.`,
    }
  })
}

// ---------- Sílabas directas por consonante (OA 7, OA 3) ----------

function familia(c: string) {
  return BANCO.filter((w) => silabaInicialCV(w)?.[0] === c)
}

function escucharSilaba(c: string): Ronda[] {
  const silabas = VOCALES.map((v) => c + v)
  return tomar(silabas, RONDAS).map((s) => ({
    tipo: 'elegir',
    item: MAYUS(s),
    estimulo: { audio: s },
    opciones: mezclar([s, ...tomar(silabas.filter((x) => x !== s), 2)]).map((x) => opcionTexto(x, MAYUS(x), x)),
    correctaId: s,
    instruccion: `Toca la sílaba ${s}.`,
    pista: `¡Casi! Escucha: ${fonemaDe(c)}${fonemaDe(s[1])}… ${s}. ¡Otra vez!`,
    refuerzo: `¡Muy bien! ${fonemaDe(c)}${fonemaDe(s[1])}… ¡${s}!`,
  }))
}

function silabaDeLaImagen(c: string): Ronda[] {
  const silabas = VOCALES.map((v) => c + v)
  return tomar(familia(c), RONDAS).map((w) => {
    const s = silabaInicialCV(w)!
    return {
      tipo: 'elegir',
      item: MAYUS(s),
      estimulo: { imagen: w.imagen, audio: w.texto },
      opciones: mezclar([s, ...tomar(silabas.filter((x) => x !== s), 2)]).map((x) => opcionTexto(x, MAYUS(x), x)),
      correctaId: s,
      instruccion: `${w.texto}. ¿Con qué sílaba empieza ${w.texto}?`,
      pista: `¡Casi! ${s}… ${w.texto}. ¡Otra vez!`,
      refuerzo: `¡Sí! ${MAYUS(s)}, de ${w.texto}.`,
    }
  })
}

// Los distractores empiezan con la misma consonante y otra vocal (mano / mono):
// hay que distinguir la sílaba completa, no solo el primer sonido.
function imagenDeLaSilaba(c: string): Ronda[] {
  const palabras = familia(c)
  return tomar(palabras, RONDAS).map((correcta) => {
    const s = silabaInicialCV(correcta)!
    const parecidas = tomar(palabras.filter((w) => silabaInicialCV(w) !== s), 2)
    const distractores = completar(parecidas, BANCO.filter((w) => !empiezaCon(w, s)), 2)
    return {
      tipo: 'elegir',
      item: MAYUS(s),
      estimulo: { texto: MAYUS(s), audio: s },
      opciones: mezclar([correcta, ...distractores]).map(opcionPalabra),
      correctaId: correcta.id,
      instruccion: `Toca la imagen que empieza con ${s}.`,
      pista: `¡Casi! ${s}… ${correcta.texto}. ¡Inténtalo otra vez!`,
      refuerzo: `¡Excelente! ${MAYUS(s)}, de ${correcta.texto}.`,
    }
  })
}

const NOMBRE_SILABAS: Record<(typeof CONSONANTES_SILABAS)[number], { icono: string; color: string }> = {
  m: { icono: '🐒', color: 'var(--color-nino-amarillo)' },
  p: { icono: '🦆', color: 'var(--color-nino-azul)' },
  l: { icono: '🌙', color: 'var(--color-nino-lila)' },
  s: { icono: '🐸', color: 'var(--color-nino-menta)' },
}

function contenidoSilabas(c: (typeof CONSONANTES_SILABAS)[number]): Contenido {
  const silabas = VOCALES.map((v) => MAYUS(c + v)).join(', ')
  return {
    id: `silabas-${c}`,
    oa: ['OA 7', 'OA 3'],
    titulo: `Sílabas con ${MAYUS(c)}`,
    descripcion: `Sílabas directas ${silabas}: escucharlas, reconocerlas al inicio de palabras e identificarlas frente a otras parecidas.`,
    ...NOMBRE_SILABAS[c],
    pasos: [
      { titulo: 'Escucha y toca la sílaba', generar: () => escucharSilaba(c) },
      { titulo: '¿Con qué sílaba empieza?', generar: () => silabaDeLaImagen(c) },
      { titulo: 'Busca la imagen de la sílaba', generar: () => imagenDeLaSilaba(c) },
    ],
  }
}

// ---------- Palabras largas y cortas (OA 3, conteo de sílabas) ----------

const deLargo = (n: number) => BANCO.filter((w) => w.silabas.length === n)

// Dos imágenes: la que tiene más (o menos) sílabas. `largos` define cuán evidente es la diferencia.
function compararLargo(larga: boolean, largos: [number, number][]): Ronda[] {
  return Array.from({ length: RONDAS }, () => {
    const [a, b] = largos[Math.floor(Math.random() * largos.length)]
    const corta = tomar(deLargo(a), 1)[0]
    const extensa = tomar(deLargo(b), 1)[0]
    const correcta = larga ? extensa : corta
    const opciones = mezclar([corta, extensa])
    return {
      tipo: 'elegir',
      item: larga ? 'Más larga' : 'Más corta',
      estimulo: {},
      opciones: opciones.map(opcionPalabra),
      correctaId: correcta.id,
      instruccion: `Escucha: ${opciones[0].texto}… ${opciones[1].texto}. ¿Cuál es más ${larga ? 'larga' : 'corta'}?`,
      pista: `¡Casi! ${extensa.silabas.join('… ')} es más larga que ${corta.silabas.join('… ')}. ¡Otra vez!`,
      refuerzo: `¡Sí! ${correcta.silabas.join('… ')}: ${correcta.silabas.length === 1 ? 'una sílaba' : `${correcta.silabas.length} sílabas`}.`,
    }
  })
}

function laMasLarga(): Ronda[] {
  return Array.from({ length: RONDAS }, () => {
    const opciones = mezclar([2, 3, 4].map((n) => tomar(deLargo(n), 1)[0]))
    const correcta = opciones.find((w) => w.silabas.length === 4)!
    return {
      tipo: 'elegir',
      item: 'La más larga',
      estimulo: {},
      opciones: opciones.map(opcionPalabra),
      correctaId: correcta.id,
      instruccion: `Escucha: ${opciones.map((w) => w.texto).join('… ')}. ¿Cuál es la más larga?`,
      pista: `¡Casi! Cuenta: ${correcta.silabas.join('… ')}. ¡Otra vez!`,
      refuerzo: `¡Excelente! ${correcta.silabas.join('… ')}: cuatro sílabas.`,
    }
  })
}

// ---------- Rimas: sonido final (OA 3) ----------

const conRima = BANCO.filter((w) => BANCO.some((x) => x.id !== w.id && silabaFinal(x) === silabaFinal(w)))

function cualTerminaIgual(opciones: number): () => Ronda[] {
  return () =>
    tomar(conRima, RONDAS).map((w) => {
      const fin = silabaFinal(w)
      const correcta = tomar(BANCO.filter((x) => x.id !== w.id && silabaFinal(x) === fin), 1)[0]
      const distractores = tomar(BANCO.filter((x) => silabaFinal(x) !== fin), opciones - 1)
      return {
        tipo: 'elegir',
        item: `-${MAYUS(fin)}`,
        estimulo: { imagen: w.imagen, audio: w.texto },
        opciones: mezclar([correcta, ...distractores]).map(opcionPalabra),
        correctaId: correcta.id,
        instruccion: `Escucha: ${w.texto}. ¿Cuál termina igual que ${w.texto}?`,
        pista: `¡Casi! ${w.texto} termina en ${fin}… ¡Otra vez!`,
        refuerzo: `¡Sí! ${w.texto} y ${correcta.texto} terminan en ${fin}.`,
      }
    })
}

// ---------- Catálogo ----------

export const CONTENIDOS: Contenido[] = [
  {
    id: 'vocales',
    oa: ['OA 7', 'OA 3'],
    titulo: 'Las vocales',
    descripcion: 'Sonido de las vocales A, E, I, O, U, su letra imprenta y palabras que empiezan con cada una.',
    icono: '🐝',
    color: 'var(--color-nino-amarillo)',
    pasos: [
      { titulo: 'Escucha y toca la vocal', generar: escucharVocal },
      { titulo: '¿Con qué vocal empieza?', generar: vocalInicial },
      { titulo: 'Busca el dibujo de la vocal', generar: imagenConVocal },
    ],
  },
  ...CONSONANTES_SILABAS.map(contenidoSilabas),
  {
    id: 'largas-cortas',
    oa: ['OA 3'],
    titulo: 'Palabras largas y cortas',
    descripcion: 'Comparar palabras por su cantidad de sílabas, de diferencias evidentes (SOL / MARIPOSA) a más finas.',
    icono: '🐘',
    color: 'var(--color-nino-azul)',
    pasos: [
      { titulo: '¿Cuál es más larga?', generar: () => compararLargo(true, [[1, 4], [1, 3]]) },
      { titulo: '¿Cuál es más corta?', generar: () => compararLargo(false, [[2, 4], [1, 3]]) },
      { titulo: 'La más larga de tres', generar: laMasLarga },
    ],
  },
  {
    id: 'rimas',
    oa: ['OA 3'],
    titulo: 'Rimas: ¿cuál termina igual?',
    descripcion: 'Identificar la sílaba final de palabras conocidas (GATO / PATO), con cada vez más opciones.',
    icono: '🐱',
    color: 'var(--color-nino-menta)',
    pasos: [
      { titulo: 'Rima entre dos', generar: cualTerminaIgual(2) },
      { titulo: 'Rima entre tres', generar: cualTerminaIgual(3) },
      { titulo: 'Rima entre cuatro', generar: cualTerminaIgual(4) },
    ],
  },
]

export function contenido(id: string) {
  return CONTENIDOS.find((c) => c.id === id)
}

// ---------- Plan de una sala ----------

export interface PasoPlan {
  contenido: Contenido
  numero: 1 | 2 | 3
  // Con el que se guarda el resultado: «silabas-m-2».
  actividadId: string
  generar: () => Ronda[]
}

// Los contenidos de la sala, en orden, desplegados en sus 3 actividades.
export function planDe(contenidos: string[]): PasoPlan[] {
  return contenidos.flatMap((id) => {
    const c = contenido(id)
    if (!c) return []
    return c.pasos.map((p, i) => ({ contenido: c, numero: (i + 1) as 1 | 2 | 3, actividadId: `${c.id}-${i + 1}`, generar: p.generar }))
  })
}

export function aprobo(rondas: Pick<IntentoRonda, 'acertada'>[]) {
  return rondas.length > 0 && rondas.filter((r) => r.acertada).length / rondas.length >= UMBRAL_APROBAR
}

// Nombre legible para los reportes de la docente: actividades de contenido y juegos.
export function nombreActividad(actividadId: string) {
  const paso = /^(.+)-([123])$/.exec(actividadId)
  const c = paso && contenido(paso[1])
  if (c) return `${c.titulo} · Actividad ${paso[2]}`
  return actividad(actividadId)?.titulo ?? actividadId
}
