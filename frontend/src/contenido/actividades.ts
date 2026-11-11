import type { Imagen, Palabra } from '../dominio/tipos.ts'
import { ALFABETO, CONSONANTES_SILABAS, PALABRAS, PALABRAS_NIVEL_3, VOCALES, laLetra, nombreLetra, palabra, quitarTildes } from './banco.ts'

// Mecánicas de las rondas y los juegos del recreo. Lo que el niño trabaja en una
// sala de actividades está en contenidos.ts (contenidos de 3 o 4 actividades) y
// plantillas.ts (actividades que configura la docente).

// Regla de oro 3: nunca más de 4 opciones por pantalla.
export const MAX_OPCIONES = 4

// Una tarjeta para marcar: un dibujo, lo que se escucha al tocarla (una
// palabra u oración), el texto escrito si lo lleva, y si corresponde con el dibujo.
export interface Tarjeta {
  id: string
  imagen: Imagen
  texto?: string
  audio: string
  corresponde: boolean
}

export interface Opcion {
  id: string
  texto?: string
  imagen?: Imagen
  audio: string
}

interface RondaBase {
  // Letra, sílaba o palabra trabajada; alimenta el panel de avance (RF-13).
  item: string
  instruccion: string
  refuerzo?: string
}

export type Ronda =
  | (RondaBase & {
      tipo: 'elegir'
      // `audio`: lo que suena al tocar el estímulo (fonema, sílaba o palabra).
      estimulo: { texto?: string; imagen?: Imagen; silabas?: string[]; hueco?: number; audio?: string }
      opciones: Opcion[]
      correctaId: string
      pista: string
    })
  | (RondaBase & { tipo: 'construir'; palabra: Palabra; fichas: string[]; pista: string })
  | (RondaBase & { tipo: 'aplausos'; palabra: Palabra; pista: string })
  | (RondaBase & { tipo: 'choque'; consonante: string; vocal: string })
  // Respuesta escrita con el teclado en pantalla, SIEMPRE en mayúscula y sin tildes.
  // `letras`: las teclas que se muestran (las de la respuesta y algunas más).
  | (RondaBase & { tipo: 'escribir'; respuesta: string; imagen?: Imagen; audio: string; letras: string[]; pista: string })
  // Globos con sílabas que suben: se revientan en orden para formar la palabra.
  | (RondaBase & { tipo: 'globos'; palabra: Palabra; fichas: string[]; pista: string })
  // Conciencia léxica: una grilla de tarjetas y se marcan con una X las que corresponden.
  | (RondaBase & { tipo: 'marcar'; tarjetas: Tarjeta[]; pista: string })

// Qué mide una actividad, para los reportes de la docente: así una letra no se
// compara con una sílaba, una rima o una palabra. Orden = orden en pantalla.
export const CATEGORIAS = {
  auditiva: 'Discriminación auditiva',
  oraciones: 'Conciencia léxica',
  letras: 'Vocales y letras',
  silabas: 'Sílabas',
  conteo: 'Conteo de sílabas',
  rimas: 'Rimas',
  palabras: 'Palabras',
  escritura: 'Escritura',
} as const

export type Categoria = keyof typeof CATEGORIAS

// Un juego del recreo (la docente elige cuáles en la tarjeta del recreo).
export interface Actividad {
  id: string
  titulo: string
  objetivo: string
  icono: string
  categoria?: Categoria
  generar: () => Ronda[]
  // Sin respuesta incorrecta posible (choque): no mide avance ni da racha.
  practica?: boolean
  // «¿Cómo se juega?» antes de empezar; sin esto se usa el del tipo de ronda.
  instrucciones?: string
}

// Cómo se juega cada tipo de ronda: lo dice la tarjeta de instrucciones antes de
// empezar (y el botón «?» durante la partida). Corto y sin tecnicismos.
export const COMO_SE_JUEGA: Record<Ronda['tipo'], string> = {
  elegir: 'Escucha con atención y toca la respuesta correcta.',
  construir: 'Toca las sílabas en orden para armar la palabra.',
  aplausos: 'Toca las palmas para contar las sílabas. Después toca el número.',
  choque: 'Toca el botón y mira cómo se juntan los sonidos.',
  escribir: 'Mira el dibujo y escribe con las letras grandes de abajo.',
  globos: 'Revienta los globos con las sílabas en orden para formar la palabra.',
  marcar: 'Toca cada tarjeta para escucharla. Marca con una X las que corresponden con el dibujo y toca el visto bueno.',
}

export const instruccionesDe = (rondas: Ronda[], propias?: string) => propias ?? (rondas[0] ? COMO_SE_JUEGA[rondas[0].tipo] : '')

// Fisher-Yates: `sort(() => Math.random() - 0.5)` no reparte las posiciones por
// igual y la respuesta correcta tendería a quedar en el mismo lugar.
export function mezclar<T>(a: readonly T[]) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
export const tomar = <T,>(a: readonly T[], n: number) => mezclar(a).slice(0, n)
const MAYUS = (s: string) => s.toUpperCase()

export function ordenarSilabas(silabas: readonly string[]) {
  const ordenVocal = (silaba: string) => {
    const vocal = [...quitarTildes(silaba).toLowerCase()].find((caracter) => VOCALES.some((v) => v === caracter))
    return vocal ? VOCALES.findIndex((v) => v === vocal) : VOCALES.length
  }
  return [...silabas].sort((a, b) => ordenVocal(a) - ordenVocal(b) || a.localeCompare(b, 'es'))
}

// ---------- Sonidos y sílabas ----------

function choqueDeSonidos(): Ronda[] {
  const pares = CONSONANTES_SILABAS.flatMap((c) => VOCALES.map((v) => [c, v] as const))
  return tomar(pares, 5).map(([c, v]) => ({
    tipo: 'choque',
    item: MAYUS(c + v),
    consonante: c,
    vocal: v,
    instruccion: 'Toca el botón y mira cómo se juntan los sonidos.',
    refuerzo: `¡Se juntaron! ${c + v}.`,
  }))
}

function aplausosSilabicos(): Ronda[] {
  const porCantidad = [1, 2, 3, 4].map((n) => PALABRAS.filter((w) => w.silabas.length === n))
  const elegidas = mezclar([...tomar(porCantidad[0], 1), ...tomar(porCantidad[1], 1), ...tomar(porCantidad[2], 2), ...tomar(porCantidad[3], 1)])
  return elegidas.map((w) => ({
    tipo: 'aplausos',
    item: w.texto,
    palabra: w,
    instruccion: `¿Cuántas sílabas tiene ${w.texto}? Toca las palmas para contar.`,
    pista: `¡Casi! Escucha: ${w.silabas.join('… ')}. ¡Cuenta otra vez!`,
    refuerzo: `¡Sí! ${w.texto} tiene ${w.silabas.length}: ${w.silabas.join('… ')}.`,
  }))
}

// Actividad configurable (contenido/plantillas.ts): suena una letra y se toca cuál
// es, entre las que eligió la docente. Con pocas letras, se repiten hasta completar.
const RONDAS_ESCUCHA_LETRA = 5
export function escuchaLaLetra(ids: readonly string[] = ALFABETO.map((l) => l.id)): Ronda[] {
  const letras = ALFABETO.filter((l) => ids.includes(l.id))
  if (letras.length === 0) return []
  const turnos = Array.from({ length: Math.ceil(RONDAS_ESCUCHA_LETRA / letras.length) }, () => mezclar(letras)).flat().slice(0, RONDAS_ESCUCHA_LETRA)
  return turnos.map((l) => {
    // Sin letras que suenen igual a la correcta, ni iguales entre sí: de oído no se distinguirían.
    const otras = mezclar(letras.filter((x) => x.sonido !== l.sonido))
    const distractores = otras.filter((x, i) => otras.findIndex((y) => y.sonido === x.sonido) === i).slice(0, MAX_OPCIONES - 1)
    return {
      tipo: 'elegir',
      item: l.grafema,
      estimulo: { audio: laLetra(l.id) },
      opciones: mezclar([l, ...distractores]).map((x) => ({ id: x.id, texto: x.grafema, audio: nombreLetra(x.id) })),
      correctaId: l.id,
      instruccion: `Toca la letra ${nombreLetra(l.id)}.`,
      pista: `¡Casi! Busca ${laLetra(l.id)}. ¡Otra vez!`,
      refuerzo: `¡Muy bien! Es ${laLetra(l.id)}.`,
    }
  })
}

// ---------- Palabras ----------

const nivel3 = () => PALABRAS_NIVEL_3.map(palabra)

export function constructorDePalabras(): Ronda[] {
  return tomar(nivel3(), 5).map((w) => {
    const otras = nivel3().flatMap((x) => x.silabas).filter((s) => !w.silabas.includes(s))
    return {
      tipo: 'construir',
      item: w.texto,
      palabra: w,
      fichas: mezclar([...w.silabas, ...tomar(otras, 1)]),
      instruccion: `Junta las sílabas para formar ${w.texto}.`,
      pista: `¡Casi! ${w.texto} empieza con ${w.silabas[0]}. ¡Otra vez!`,
      refuerzo: `¡${MAYUS(w.texto)}! ¡Lo armaste!`,
    }
  })
}

// Globos de palabras: las sílabas de la palabra (y una o dos que no van) suben
// en globos; se revientan en orden. Mismo pool que el constructor.
export function globosDePalabras(): Ronda[] {
  return tomar(nivel3(), 5).map((w) => {
    const otras = [...new Set(nivel3().flatMap((x) => x.silabas))].filter((s) => !w.silabas.includes(s))
    return {
      tipo: 'globos',
      item: w.texto,
      palabra: w,
      fichas: mezclar([...w.silabas, ...tomar(otras, 2)]),
      instruccion: `Revienta los globos en orden para formar ${w.texto}.`,
      pista: `¡Casi! ${w.texto} empieza con ${w.silabas[0]}. ¡Busca ese globo!`,
      refuerzo: `¡${MAYUS(w.texto)}! ¡La formaste!`,
    }
  })
}

export function completaLaSilaba(): Ronda[] {
  return tomar(nivel3(), 5).map((w) => {
    const falta = w.silabas[1]
    const otras = tomar([...new Set(nivel3().flatMap((x) => x.silabas))].filter((s) => quitarTildes(s) !== quitarTildes(falta)), 2)
    return {
      tipo: 'elegir',
      item: w.texto,
      estimulo: { imagen: w.imagen, silabas: w.silabas.map(MAYUS), hueco: 1 },
      opciones: ordenarSilabas([falta, ...otras]).map((s) => ({ id: s, texto: MAYUS(s), audio: s })),
      correctaId: falta,
      instruccion: `¿Qué sílaba falta para completar ${w.texto}?`,
      pista: `¡Casi! ${w.silabas[0]}… ¿qué suena después? ¡Otra vez!`,
      refuerzo: `¡Sí! ${w.silabas.join('… ')}: ${w.texto}.`,
    }
  })
}

// ---------- Catálogo ----------

// Los juegos que la docente puede poner en un recreo (punto de llegada tras los contenidos).
export const JUEGOS: Actividad[] = [
  { id: 'choque-sonidos', titulo: 'El choque de sonidos', objetivo: 'Une los sonidos para formar sílabas', icono: '💥', categoria: 'silabas', generar: choqueDeSonidos, practica: true },
  { id: 'aplausos', titulo: 'Aplausos silábicos', objetivo: 'Cuenta las sílabas con palmadas', icono: '👏', categoria: 'conteo', generar: aplausosSilabicos },
  { id: 'globos-palabras', titulo: 'Globos de palabras', objetivo: 'Revienta los globos y forma la palabra', icono: '🎈', categoria: 'palabras', generar: globosDePalabras },
]

// Actividades que ya no se juegan (las reemplazaron los contenidos por sala):
// quedan sus datos para nombrar y clasificar las partidas antiguas en los
// reportes. Las de práctica no cuentan en el avance; las sin categoría (cuentos), tampoco.
type ActividadRetirada = Pick<Actividad, 'id' | 'titulo' | 'icono' | 'categoria' | 'practica'>
const RETIRADAS: ActividadRetirada[] = [
  { id: 'explorar-sonido', titulo: 'Explorar el sonido', icono: '👄', categoria: 'letras', practica: true },
  { id: 'sonido-inicial', titulo: '¿Qué empieza con este sonido?', icono: '🔎', categoria: 'letras' },
  { id: 'caza-letras', titulo: 'Caza de letras', icono: '🫧', categoria: 'letras' },
  { id: 'silaba-inicial', titulo: '¿Con qué sílaba empieza?', icono: '🔤', categoria: 'silabas' },
  { id: 'constructor', titulo: 'Constructor de palabras', icono: '🧱', categoria: 'palabras' },
  { id: 'que-dice', titulo: '¿Qué dice aquí?', icono: '🖼️', categoria: 'palabras' },
  { id: 'falta-silaba', titulo: 'Completa la sílaba', icono: '🧩', categoria: 'palabras' },
  { id: 'cuento-tito', titulo: 'Tito y la coneja', icono: '🐢' },
  { id: 'cancion-raton', titulo: 'El ratón chiquitito', icono: '🎵' },
]

// Un juego del recreo o una actividad retirada; las de los contenidos y las
// configurables se buscan en contenidos.ts (nombreActividad, categoriaDe).
export function actividad(id: string): (ActividadRetirada & Partial<Actividad>) | undefined {
  return JUEGOS.find((a) => a.id === id) ?? RETIRADAS.find((a) => a.id === id)
}
