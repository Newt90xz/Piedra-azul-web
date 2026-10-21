import type { Imagen, Nivel, Palabra } from '../dominio/tipos.ts'
import {
  CONSONANTES_SILABAS,
  LETRAS,
  PALABRAS,
  PALABRAS_NIVEL_3,
  VOCALES,
  fonemaDe,
  palabra,
  quitarTildes,
} from './banco.ts'

// Regla de oro 3: nunca más de 4 opciones por pantalla.
export const MAX_OPCIONES = 4

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
  refuerzo: string
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
  | (RondaBase & { tipo: 'explorar'; grafema: string; fonema: string; apoyo: string; ejemplo: Palabra })
  | (RondaBase & { tipo: 'choque'; consonante: string; vocal: string })

export type GrupoActividad = Nivel | 'cuentos'

// Qué mide una actividad, para los reportes de la docente: así una letra no se
// compara con una sílaba, una rima o una palabra. Orden = orden en pantalla.
export const CATEGORIAS = {
  letras: 'Vocales y letras',
  silabas: 'Sílabas',
  conteo: 'Conteo de sílabas',
  rimas: 'Rimas',
  palabras: 'Palabras',
} as const

export type Categoria = keyof typeof CATEGORIAS

export interface Actividad {
  id: string
  grupo: GrupoActividad
  titulo: string
  icono: string
  // Sin categoría no entra al avance (cuentos y canciones: no miden una letra o sílaba).
  categoria?: Categoria
  generar: () => Ronda[]
  // Sin respuesta incorrecta posible (explorar, choque): no mide avance ni da racha.
  practica?: boolean
  // Juego que la docente puede asignar a una sala. Las demás mecánicas quedan
  // deshabilitadas hasta que estén terminadas.
  juego?: boolean
}

export const GRUPOS: { id: GrupoActividad; titulo: string; icono: string; color: string; audio: string }[] = [
  { id: 1, titulo: 'Sonidos', icono: '👂', color: 'var(--color-nino-azul)', audio: 'Sonidos' },
  { id: 2, titulo: 'Sílabas', icono: '👏', color: 'var(--color-nino-menta)', audio: 'Sílabas' },
  { id: 3, titulo: 'Palabras', icono: '🧩', color: 'var(--color-nino-lila)', audio: 'Palabras' },
  { id: 'cuentos', titulo: 'Cuentos', icono: '📖', color: 'var(--color-nino-amarillo)', audio: 'Cuentos y canciones' },
]

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
const opcionPalabra = (w: Palabra): Opcion => ({ id: w.id, imagen: w.imagen, audio: w.texto })

function empiezaCon(w: Palabra, prefijo: string) {
  return quitarTildes(w.texto).startsWith(quitarTildes(prefijo))
}

// ---------- Nivel 1: sonidos ----------

function explorarSonido(): Ronda[] {
  return tomar(LETRAS, 5).map((l) => ({
    tipo: 'explorar',
    item: l.grafema,
    grafema: l.grafema,
    fonema: l.fonema,
    apoyo: l.apoyoArticulatorio,
    ejemplo: palabra(l.ejemplos[0]),
    instruccion: 'Toca la letra y escucha su sonido.',
    refuerzo: `¡Muy bien! ${l.fonema}, de ${palabra(l.ejemplos[0]).texto}.`,
  }))
}

function sonidoInicial(): Ronda[] {
  return tomar(LETRAS, 5).map((l) => {
    const correcta = palabra(tomar(l.ejemplos, 1)[0])
    const distractores = tomar(PALABRAS.filter((w) => !empiezaCon(w, l.id)), 2)
    return {
      tipo: 'elegir',
      item: l.grafema,
      estimulo: { texto: l.grafema },
      opciones: mezclar([correcta, ...distractores].map(opcionPalabra)),
      correctaId: correcta.id,
      instruccion: `Escucha: ${l.fonema}. Toca el dibujo que empieza con ${l.fonema}.`,
      pista: `¡Casi! Escucha bien: ${l.fonema}… ${correcta.texto}. ¡Inténtalo otra vez!`,
      refuerzo: `¡Excelente! ${l.fonema}, de ${correcta.texto}.`,
    }
  })
}

function cazaDeLetras(): Ronda[] {
  return tomar(LETRAS, 5).map((l) => {
    const otras = tomar(LETRAS.filter((x) => x.id !== l.id), 2)
    return {
      tipo: 'elegir',
      item: l.grafema,
      estimulo: {},
      opciones: mezclar([l, ...otras]).map((x) => ({ id: x.id, texto: x.grafema, audio: x.fonema })),
      correctaId: l.id,
      instruccion: `Toca la letra que suena ${l.fonema}.`,
      pista: `¡Casi! Busca la que suena ${l.fonema}. ¡Otra vez!`,
      refuerzo: `¡Bien! La ${l.grafema} suena ${l.fonema}.`,
    }
  })
}

// ---------- Nivel 2: sílabas ----------

function choqueDeSonidos(): Ronda[] {
  const pares = CONSONANTES_SILABAS.flatMap((c) => VOCALES.map((v) => [c, v] as const))
  return tomar(pares, 5).map(([c, v]) => ({
    tipo: 'choque',
    item: MAYUS(c + v),
    consonante: c,
    vocal: v,
    instruccion: 'Toca el botón y mira cómo se juntan los sonidos.',
    refuerzo: `${fonemaDe(c)}… ${fonemaDe(v)}… ¡${c + v}!`,
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

function silabaInicial(): Ronda[] {
  const candidatas = PALABRAS.filter((w) => w.silabas[0].length === 2 && CONSONANTES_SILABAS.some((c) => w.id.startsWith(c)))
  return tomar(candidatas, 5).map((correcta) => {
    const s = quitarTildes(correcta.silabas[0])
    const distractores = tomar(PALABRAS.filter((w) => !empiezaCon(w, s[0])), 2)
    return {
      tipo: 'elegir',
      item: MAYUS(s),
      estimulo: { texto: MAYUS(s) },
      opciones: mezclar([correcta, ...distractores].map(opcionPalabra)),
      correctaId: correcta.id,
      instruccion: `Toca la imagen que empieza con ${s}.`,
      pista: `¡Casi! ${s}… ${correcta.texto}. ¡Inténtalo otra vez!`,
      refuerzo: `¡Excelente! ${MAYUS(s)} de ${correcta.texto}.`,
    }
  })
}

// ---------- Nivel 3: palabras ----------

const nivel3 = () => PALABRAS_NIVEL_3.map(palabra)

function constructorDePalabras(): Ronda[] {
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

function queDiceAqui(): Ronda[] {
  return tomar(nivel3(), 5).map((w) => {
    const distractores = tomar(nivel3().filter((x) => x.id !== w.id), 2)
    return {
      tipo: 'elegir',
      item: w.texto,
      estimulo: { silabas: w.silabas.map(MAYUS) },
      opciones: mezclar([w, ...distractores].map(opcionPalabra)),
      correctaId: w.id,
      instruccion: 'Une las sílabas y toca la foto correcta.',
      pista: `¡Casi! Escucha: ${w.silabas.join('… ')}. ¡Otra vez!`,
      refuerzo: `¡Muy bien! Dice ${w.texto}.`,
    }
  })
}

function completaLaSilaba(): Ronda[] {
  return tomar(nivel3(), 5).map((w) => {
    const falta = w.silabas[1]
    const otras = tomar([...new Set(nivel3().flatMap((x) => x.silabas))].filter((s) => quitarTildes(s) !== quitarTildes(falta)), 2)
    return {
      tipo: 'elegir',
      item: w.texto,
      estimulo: { imagen: w.imagen, silabas: w.silabas.map(MAYUS), hueco: 1 },
      opciones: mezclar([falta, ...otras]).map((s) => ({ id: s, texto: MAYUS(s), audio: s })),
      correctaId: falta,
      instruccion: `¿Qué sílaba falta para completar ${w.texto}?`,
      pista: `¡Casi! ${w.silabas[0]}… ¿qué suena después? ¡Otra vez!`,
      refuerzo: `¡Sí! ${w.silabas.join('… ')}: ${w.texto}.`,
    }
  })
}

// ---------- Módulo transversal: cuentos y canciones ----------

export type Trozo = string | { palabra: string }

export interface Cuento {
  id: string
  titulo: string
  escenas: Trozo[][]
  preguntas: Ronda[]
}

const w = (id: string) => ({ palabra: id })

export const CUENTO_TITO: Cuento = {
  id: 'cuento-tito',
  titulo: 'Tito y la coneja',
  escenas: [
    ['Había una vez una', w('tortuga'), 'llamada Tito. Tito vivía en una', w('casa'), 'muy pequeña.'],
    ['Un día decidió visitar a su amiga la', w('coneja'), '. Juntos fueron al', w('parque'), 'y recogieron muchas', w('flores'), '.'],
    ['Al final del día, Tito y la', w('coneja'), 'volvieron felices a', w('casa'), 'para comer una rica', w('zanahoria'), '.'],
  ],
  preguntas: [
    pregunta('¿Quién es Tito?', 'tortuga', ['coneja', 'pollito']),
    // Sin «casa» como distractor: el cuento termina con ellos volviendo a casa.
    pregunta('¿A dónde fueron Tito y la coneja?', 'parque', ['isla', 'playa']),
    pregunta('¿Qué recogieron juntos?', 'flor', ['pelota', 'helado']),
    pregunta('¿Qué comieron al final del día?', 'zanahoria', ['queso', 'chocolate']),
  ],
}

function pregunta(texto: string, correcta: string, otras: string[]): Ronda {
  const c = palabra(correcta)
  return {
    tipo: 'elegir',
    item: 'comprension',
    estimulo: {},
    opciones: mezclar([c, ...otras.map(palabra)].map(opcionPalabra)),
    correctaId: c.id,
    instruccion: texto,
    pista: '¡Casi! Piensa en el cuento. ¡Inténtalo otra vez!',
    refuerzo: `¡Muy bien! ${c.texto}.`,
  }
}

export const CANCION_RATON: { id: string; titulo: string; versos: Trozo[][] } = {
  id: 'cancion-raton',
  titulo: 'El ratón chiquitito',
  versos: [
    ['Un', w('raton'), 'muy chiquitito come', w('queso'), 'y', w('chocolate'), '.'],
    ['Juega con su', w('pelota'), 'y baila con un', w('gato'), '.'],
    ['Cuando llega la', w('luna'), 'se va a dormir a su', w('casa'), '.'],
  ],
}

// ---------- Catálogo ----------

export const ACTIVIDADES: Actividad[] = [
  { id: 'explorar-sonido', grupo: 1, titulo: 'Explorar el sonido', icono: '👄', categoria: 'letras', generar: explorarSonido, practica: true },
  { id: 'sonido-inicial', grupo: 1, titulo: '¿Qué empieza con este sonido?', icono: '🔎', categoria: 'letras', generar: sonidoInicial },
  { id: 'caza-letras', grupo: 1, titulo: 'Caza de letras', icono: '🫧', categoria: 'letras', generar: cazaDeLetras },
  { id: 'choque-sonidos', grupo: 2, titulo: 'El choque de sonidos', icono: '💥', categoria: 'silabas', generar: choqueDeSonidos, practica: true, juego: true },
  { id: 'aplausos', grupo: 2, titulo: 'Aplausos silábicos', icono: '👏', categoria: 'conteo', generar: aplausosSilabicos, juego: true },
  { id: 'silaba-inicial', grupo: 2, titulo: '¿Con qué sílaba empieza?', icono: '🔤', categoria: 'silabas', generar: silabaInicial },
  { id: 'constructor', grupo: 3, titulo: 'Constructor de palabras', icono: '🧱', categoria: 'palabras', generar: constructorDePalabras },
  { id: 'que-dice', grupo: 3, titulo: '¿Qué dice aquí?', icono: '🖼️', categoria: 'palabras', generar: queDiceAqui },
  { id: 'falta-silaba', grupo: 3, titulo: 'Completa la sílaba', icono: '🧩', categoria: 'palabras', generar: completaLaSilaba },
  { id: CUENTO_TITO.id, grupo: 'cuentos', titulo: CUENTO_TITO.titulo, icono: '🐢', generar: () => CUENTO_TITO.preguntas },
  { id: CANCION_RATON.id, grupo: 'cuentos', titulo: CANCION_RATON.titulo, icono: '🎵', generar: () => [] },
]

export function actividad(id: string) {
  return ACTIVIDADES.find((a) => a.id === id)
}

// Lo que la docente puede elegir como juego de una sala (punto de llegada tras los contenidos).
export const JUEGOS = ACTIVIDADES.filter((a) => a.juego)
