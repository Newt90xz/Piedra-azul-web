import type { ContextoPartida, Exigencia, IntentoRonda, Nivel, Palabra, ParametrosJuego, PasoSala, Sala } from '../dominio/tipos.ts'
import {
  actividad,
  completaLaSilaba,
  constructorDePalabras,
  globosDePalabras,
  mezclar,
  ordenarSilabas,
  tomar,
  type Categoria,
  type Opcion,
  type Ronda,
} from './actividades.ts'
import { CONSONANTES_SILABAS, LETRAS, PALABRAS, PALABRAS_NIVEL_3, VOCALES, laLetra, nombreLetra, palabra, quitarTildes, sinAcentos } from './banco.ts'
import { palabrasDelDibujo } from './lexica.ts'
import { juegoConfigurable } from './plantillas.ts'

// Contenidos de las Bases Curriculares de la Educación Parvularia (MINEDUC,
// 2018), núcleo Lenguaje Verbal, Tercer Nivel (Transición):
//   OA 3: descubrir atributos fonológicos de palabras conocidas (conteo y
//         segmentación de sílabas, sonidos iniciales y finales).
//   OA 7: reconocer palabras asociando algunos fonemas a sus grafemas.
//   OA 8: representar gráficamente letras y palabras significativas.
// La docente asigna contenidos a una sala; cada uno trae 3 actividades
// preordenadas de dificultad creciente. Cada partida se arma al azar desde el
// pool del contenido, así repetir una actividad nunca es igual a la anterior.

export const OA = {
  'OA 3': 'Descubrir en contextos lúdicos atributos fonológicos de palabras conocidas: conteo y segmentación de sílabas, sonidos iniciales y finales.',
  'OA 7': 'Reconocer palabras asociando algunos fonemas a sus correspondientes grafemas.',
  'OA 8': 'Representar gráficamente algunos trazos, letras, signos, palabras significativas y mensajes simples legibles.',
} as const

// Áreas en que se agrupan los contenidos al armar el plan: las actividades
// auditivas (solo escuchar, sin letras) van aparte de las de sílabas.
export const AREAS = {
  auditiva: { nombre: 'Escuchar', icono: '👂', descripcion: 'Distinguir palabras y sonidos de oído, sin letras.' },
  oraciones: { nombre: 'Conciencia léxica', icono: '🗣️', descripcion: 'Reconocer las palabras que corresponden con un dibujo.' },
  letras: { nombre: 'Vocales y letras', icono: '🔤', descripcion: 'Sonido de cada letra y su forma.' },
  silabas: { nombre: 'Sílabas', icono: '👏', descripcion: 'Reconocer, contar y comparar sílabas.' },
  palabras: { nombre: 'Palabras', icono: '🧩', descripcion: 'Formar y completar palabras con sílabas.' },
  escritura: { nombre: 'Escritura', icono: '✏️', descripcion: 'Escribir letras y palabras, siempre en mayúscula.' },
} as const

export type Area = keyof typeof AREAS

export type CodigoOA = keyof typeof OA

interface Paso {
  titulo: string
  generar: () => Ronda[]
  // «¿Cómo se juega?»; sin esto se usa el del tipo de ronda (COMO_SE_JUEGA).
  instrucciones?: string
}

export interface Contenido {
  id: string
  oa: CodigoOA[]
  titulo: string
  descripcion: string
  categoria: Categoria
  area: Area
  // Lo que ve el niño en su camino: sin texto.
  icono: string
  color: string
  // 3 actividades preordenadas; una sola en las configurables. El número de
  // cada una (posición + 1) es su identidad en el historial: no se reordenan aquí.
  pasos: Paso[]
  // Orden con que entra al plan (números de `pasos`); sin esto, 1, 2, 3.
  ordenPorDefecto?: number[]
}

// Rondas por partida (regla de oro 4: micro-partidas de 4 a 5 rondas).
const RONDAS = 5
// Logrado si al menos el 60 % de las rondas se resolvió sin revelar la respuesta
// (nivel intermedio; cada nivel de exigencia tiene el suyo).
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
const silabaFinal = (w: Palabra) => sinAcentos(w.silabas[w.silabas.length - 1])
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
    estimulo: { audio: laLetra(v.id) },
    opciones: mezclar([v, ...tomar(LETRAS_VOCALES.filter((x) => x.id !== v.id), 2)]).map((x) => opcionTexto(x.id, x.grafema, nombreLetra(x.id))),
    correctaId: v.id,
    instruccion: `Toca la letra ${nombreLetra(v.id)}.`,
    pista: `¡Casi! Busca ${laLetra(v.id)}. ¡Otra vez!`,
    refuerzo: `¡Muy bien! Es ${laLetra(v.id)}.`,
  }))
}

function vocalInicial(): Ronda[] {
  return tomar(conVocalInicial, RONDAS).map((w) => {
    const v = LETRAS_VOCALES.find((x) => empiezaCon(w, x.id))!
    return {
      tipo: 'elegir',
      item: v.grafema,
      estimulo: { imagen: w.imagen, audio: w.texto },
      opciones: mezclar([v, ...tomar(LETRAS_VOCALES.filter((x) => x.id !== v.id), 2)]).map((x) => opcionTexto(x.id, x.grafema, nombreLetra(x.id))),
      correctaId: v.id,
      instruccion: `${w.texto}. ¿Con qué letra empieza ${w.texto}?`,
      pista: `¡Casi! Escucha bien: ${w.texto}. ¡Otra vez!`,
      refuerzo: '¡Si! Muy bien.',
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
      estimulo: { texto: v.grafema, audio: laLetra(v.id) },
      opciones: mezclar([correcta, ...distractores]).map(opcionPalabra),
      correctaId: correcta.id,
      instruccion: `Toca el dibujo que empieza con ${laLetra(v.id)}.`,
      pista: `¡Casi! Busca el que empieza con ${laLetra(v.id)}. ¡Otra vez!`,
      refuerzo: `¡Excelente! ${correcta.texto} empieza con ${laLetra(v.id)}.`,
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
    opciones: ordenarSilabas(mezclar([s, ...tomar(silabas.filter((x) => x !== s), 2)]))
      .map((x) => opcionTexto(x, MAYUS(x), x)),
    correctaId: s,
    instruccion: `Toca la sílaba ${s}.`,
    pista: `¡Casi! Escucha otra vez: ${s}.`,
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
      opciones: ordenarSilabas(mezclar([s, ...tomar(silabas.filter((x) => x !== s), 2)]))
        .map((x) => opcionTexto(x, MAYUS(x), x)),
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
    area: 'silabas',
    descripcion: `Sílabas directas ${silabas}: escucharlas, reconocerlas al inicio de palabras e identificarlas frente a otras parecidas.`,
    categoria: 'silabas',
    ...NOMBRE_SILABAS[c],
    pasos: [
      { titulo: 'Escucha y toca la sílaba', generar: () => escucharSilaba(c) },
      { titulo: '¿Con qué sílaba empieza?', generar: () => silabaDeLaImagen(c) },
      { titulo: 'Busca la imagen de la sílaba', generar: () => imagenDeLaSilaba(c) },
    ],
    // Primero con apoyo de imagen; «Escucha y toca», solo de oído, al final.
    ordenPorDefecto: [2, 3, 1],
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
        // La sílaba sola al final de la frase o junto a «en» la voz la pierde o la
        // pega («terminento»): va al medio y después de dos puntos.
        pista: `¡Casi! Escucha el final de ${w.texto}: ${fin}. ¡Otra vez!`,
        refuerzo: `¡Sí! Las dos terminan en ${fin}: ${w.texto} y ${correcta.texto}.`,
      }
    })
}

// ---------- Escuchar: discriminación auditiva, sin letras (OA 3) ----------

// Palabras que empiezan con una letra del banco (vocal o M, P, L, S, T): su
// primer sonido se puede decir solo («mmm…») en las pistas.
const inicial = (w: Palabra) => quitarTildes(w.texto)[0]
const conSonidoInicial = BANCO.filter((w) => LETRAS.some((l) => l.id === inicial(w)))

function palabraEscuchada(): Ronda[] {
  return tomar(BANCO, RONDAS).map((w) => {
    const distractores = tomar(BANCO.filter((x) => x.id !== w.id && inicial(x) !== inicial(w)), 2)
    return {
      tipo: 'elegir',
      item: w.texto,
      estimulo: { audio: w.texto },
      opciones: mezclar([w, ...distractores]).map(opcionPalabra),
      correctaId: w.id,
      instruccion: `Escucha: ${w.texto}. Toca el dibujo que escuchaste.`,
      pista: `¡Casi! Escucha otra vez: ${w.texto}.`,
      refuerzo: `¡Muy bien! ${w.texto}.`,
    }
  })
}

const SI_NO: Opcion[] = [
  { id: 'si', texto: '👍', audio: 'Sí' },
  { id: 'no', texto: '👎', audio: 'No' },
]

function empiezanIgual(): Ronda[] {
  return Array.from({ length: RONDAS }, () => {
    const a = tomar(conSonidoInicial, 1)[0]
    const igual = Math.random() < 0.5
    const b = tomar(conSonidoInicial.filter((x) => x.id !== a.id && (inicial(x) === inicial(a)) === igual), 1)[0]
    const [ia, ib] = [inicial(a), inicial(b)]
    return {
      tipo: 'elegir',
      item: `${MAYUS(ia)} y ${MAYUS(ib)}`,
      estimulo: { audio: `${a.texto}… ${b.texto}` },
      opciones: SI_NO,
      correctaId: igual ? 'si' : 'no',
      instruccion: `Escucha: ${a.texto}… ${b.texto}. ¿Empiezan con el mismo sonido?`,
      pista: `¡Casi! Escucha otra vez: ${a.texto}… ${b.texto}.`,
      refuerzo: igual ? `¡Sí! Las dos empiezan con ${laLetra(ia)}.` : `¡Muy bien! ${a.texto} y ${b.texto} empiezan distinto.`,
    }
  })
}

function mismoSonidoInicial(): Ronda[] {
  const conPareja = conSonidoInicial.filter((w) => conSonidoInicial.some((x) => x.id !== w.id && inicial(x) === inicial(w)))
  return tomar(conPareja, RONDAS).map((w) => {
    const correcta = tomar(conSonidoInicial.filter((x) => x.id !== w.id && inicial(x) === inicial(w)), 1)[0]
    const distractores = tomar(BANCO.filter((x) => inicial(x) !== inicial(w)), 2)
    return {
      tipo: 'elegir',
      item: MAYUS(inicial(w)),
      estimulo: { audio: w.texto },
      opciones: mezclar([correcta, ...distractores]).map(opcionPalabra),
      correctaId: correcta.id,
      instruccion: `Escucha: ${w.texto}. Toca el dibujo que empieza con el mismo sonido.`,
      pista: `¡Casi! Escucha otra vez: ${w.texto}. ¿Cuál empieza igual?`,
      refuerzo: `¡Sí! ${w.texto} y ${correcta.texto} empiezan igual.`,
    }
  })
}

// ---------- Escritura: respuestas escritas SIEMPRE en mayúscula (OA 8) ----------

// La respuesta va en mayúscula y sin tildes: el teclado en pantalla no las tiene.
// La Ñ sí va: es otra letra y el teclado la tiene («PIÑA», no «PINA»).
const paraEscribir = (s: string) => sinAcentos(s).toUpperCase()

function rondaEscribir(w: Palabra, respuesta: string, instruccion: string, pista: string, refuerzo: string, relleno = 'AEIOUMPLST'): Ronda {
  // Teclas: las de la respuesta y algunas más (de `relleno`); el nivel de exigencia ajusta cuántas.
  const extra = tomar([...relleno].filter((l) => !respuesta.includes(l)), 3)
  return {
    tipo: 'escribir',
    item: respuesta,
    respuesta,
    imagen: w.imagen,
    audio: w.texto,
    letras: [...new Set([...respuesta, ...extra])].sort((a, b) => a.localeCompare(b, 'es')),
    instruccion,
    pista,
    refuerzo,
  }
}

function escribeVocal(): Ronda[] {
  return tomar(conVocalInicial, RONDAS).map((w) => {
    const v = paraEscribir(w.texto[0])
    return rondaEscribir(
      w,
      v,
      `${w.texto}. Escribe la vocal con que empieza ${w.texto}.`,
      `¡Casi! Escucha bien: ${w.texto}. ¡Otra vez!`,
      '¡Si! Muy bien.',
      'AEIOU',
    )
  })
}

function escribeSilaba(): Ronda[] {
  const conSilaba = BANCO.filter((w) => CONSONANTES_SILABAS.some((c) => silabaInicialCV(w)?.[0] === c))
  return tomar(conSilaba, RONDAS).map((w) => {
    const s = paraEscribir(silabaInicialCV(w)!)
    return rondaEscribir(
      w,
      s,
      `${w.texto}. Escribe la sílaba con que empieza ${w.texto}.`,
      `¡Casi! Empieza con ${s.toLowerCase()}… ${w.texto}. ¡Otra vez!`,
      `¡Muy bien!`,
    )
  })
}

function escribePalabra(): Ronda[] {
  return tomar(PALABRAS_NIVEL_3.map(palabra), RONDAS).map((w) => {
    const p = paraEscribir(w.texto)
    return rondaEscribir(w, p, `Escribe ${w.texto}.`, `¡Casi! ${w.silabas.join('… ')}. ¡Otra vez!`, `¡Excelente!`)
  })
}

// ---------- Catálogo ----------

export const CONTENIDOS: Contenido[] = [
  {
    id: 'escucho',
    oa: ['OA 3'],
    titulo: 'Escucho y reconozco',
    area: 'auditiva',
    descripcion: 'Discriminación auditiva sin letras: reconocer la palabra escuchada y comparar sonidos iniciales de oído.',
    categoria: 'auditiva',
    icono: '👂',
    color: 'var(--color-nino-azul)',
    pasos: [
      { titulo: '¿Qué palabra escuchaste?', generar: palabraEscuchada, instrucciones: 'Escucha la palabra y toca su dibujo.' },
      {
        titulo: '¿Empiezan con el mismo sonido?',
        generar: empiezanIgual,
        instrucciones: 'Escucha dos palabras. Si empiezan igual toca el pulgar arriba; si no, el pulgar abajo.',
      },
      { titulo: 'Busca el dibujo que empieza igual', generar: mismoSonidoInicial, instrucciones: 'Escucha la palabra y toca el dibujo que empieza con el mismo sonido.' },
    ],
  },
  {
    id: 'lexica',
    oa: ['OA 3'],
    titulo: 'Palabras y dibujos',
    area: 'oraciones',
    descripcion: 'Conciencia léxica, como la ficha «marca con una X»: una grilla de tarjetas con dibujo y palabra, y se marcan las palabras que corresponden con su dibujo.',
    categoria: 'oraciones',
    icono: '🗣️',
    color: 'var(--color-nino-lila)',
    pasos: [
      { titulo: 'Marca las palabras del dibujo', generar: palabrasDelDibujo },
    ],
  },
  {
    id: 'vocales',
    oa: ['OA 7', 'OA 3'],
    titulo: 'Las vocales',
    area: 'letras',
    descripcion: 'Sonido de las vocales A, E, I, O, U, su letra imprenta y palabras que empiezan con cada una.',
    categoria: 'letras',
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
    area: 'silabas',
    descripcion: 'Comparar palabras por su cantidad de sílabas, de diferencias evidentes (SOL / MARIPOSA) a más finas.',
    categoria: 'conteo',
    icono: '🐘',
    color: 'var(--color-nino-azul)',
    pasos: [
      { titulo: '¿Cuál es más larga?', generar: () => compararLargo(true, [[1, 4], [1, 3]]) },
      { titulo: '¿Cuál es más corta?', generar: () => compararLargo(false, [[2, 4], [1, 3]]) },
      { titulo: 'Encuentra la palabra más larga de tres', generar: laMasLarga },
    ],
  },
  {
    id: 'rimas',
    oa: ['OA 3'],
    titulo: 'Rimas: ¿cuál termina igual?',
    area: 'auditiva',
    descripcion: 'Identificar la sílaba final de palabras conocidas (GATO / PATO), con cada vez más opciones.',
    categoria: 'rimas',
    icono: '🐱',
    color: 'var(--color-nino-menta)',
    pasos: [
      { titulo: 'Encuentra la rima entre dos palabras', generar: cualTerminaIgual(2) },
      { titulo: 'Encuentra la rima entre tres palabras', generar: cualTerminaIgual(3) },
      { titulo: 'Encuentra la rima entre cuatro palabras', generar: cualTerminaIgual(4) },
    ],
  },
  {
    id: 'formo-palabras',
    oa: ['OA 7', 'OA 3'],
    titulo: 'Formo palabras',
    area: 'palabras',
    descripcion: 'Formar palabras de dos sílabas: armarlas con fichas, reventar globos en orden y completar la sílaba que falta.',
    categoria: 'palabras',
    icono: '🎈',
    color: 'var(--color-nino-lila)',
    pasos: [
      { titulo: 'Arma la palabra con sílabas', generar: constructorDePalabras },
      { titulo: 'Revienta los globos y forma la palabra', generar: globosDePalabras },
      { titulo: 'Completa la sílaba que falta', generar: completaLaSilaba },
    ],
  },
  {
    id: 'escribo',
    oa: ['OA 8', 'OA 7'],
    titulo: 'Escribo',
    area: 'escritura',
    descripcion: 'Responder por escrito con un teclado en pantalla de letras mayúsculas: la vocal, la sílaba y la palabra completa.',
    categoria: 'escritura',
    icono: '✏️',
    color: 'var(--color-nino-amarillo)',
    pasos: [
      { titulo: 'Escribe la vocal con que empieza', generar: escribeVocal, instrucciones: 'Mira el dibujo y escribe la vocal con que empieza.' },
      { titulo: 'Escribe la sílaba con que empieza', generar: escribeSilaba, instrucciones: 'Mira el dibujo y escribe la sílaba con que empieza.' },
      { titulo: 'Escribe la palabra', generar: escribePalabra, instrucciones: 'Mira el dibujo y escribe la palabra completa, letra por letra.' },
    ],
  },
]

export function contenido(id: string) {
  return CONTENIDOS.find((c) => c.id === id)
}

// ---------- Plan de una sala ----------

export interface PasoPlan {
  contenido: Contenido
  numero: number
  // Con el que se guarda el resultado: «silabas-m-2» o «escucha-letra».
  actividadId: string
  // Distingue dos pasos con la misma actividad (dos plantillas de letras).
  clave: string
  generar: () => Ronda[]
  instrucciones?: string
  parametros?: ParametrosJuego
  // La que fijó la docente para esta actividad en la sala; sin esto, la del niño.
  exigencia?: Exigencia
}

// Los contenidos, desplegados en los pasos que se guardan en la sala.
export const ordenDe = (c: Contenido) => c.ordenPorDefecto ?? c.pasos.map((_, i) => i + 1)

export function pasosDeContenidos(contenidos: string[]): PasoSala[] {
  return contenidos.flatMap((id) => {
    const c = contenido(id)
    return c ? ordenDe(c).map((n) => ({ juego: `${id}-${n}` })) : []
  })
}

// Los pasos de la sala, listos para jugar. Un paso que este código no conoce se
// omite, igual que antes un contenido desconocido.
export function planDeSala(plan: PasoSala[]): PasoPlan[] {
  return plan.flatMap((p, i): PasoPlan[] => {
    const deContenido = pasoDe(p.juego)
    if (deContenido) {
      const paso = deContenido.contenido.pasos[Number(deContenido.numero) - 1]
      if (!paso) return []
      return [
        {
          contenido: deContenido.contenido,
          numero: Number(deContenido.numero),
          actividadId: p.juego,
          clave: `${i}`,
          generar: paso.generar,
          instrucciones: paso.instrucciones,
          exigencia: p.exigencia,
        },
      ]
    }
    const j = juegoConfigurable(p.juego)
    if (!j) return []
    const parametros = p.parametros ?? j.porDefecto
    const generar = () => j.generar(parametros)
    return [
      {
        // Una entrada propia por paso: la misma actividad puede ir dos veces con otras letras.
        contenido: {
          id: `${j.id}#${i}`,
          oa: j.oa,
          titulo: p.titulo ?? j.titulo,
          descripcion: j.descripcion,
          categoria: j.categoria,
          area: j.area,
          icono: j.icono,
          color: j.color,
          pasos: [{ titulo: j.titulo, generar, instrucciones: j.instrucciones }],
        },
        numero: 1,
        actividadId: j.id,
        clave: `${i}`,
        generar,
        instrucciones: j.instrucciones,
        parametros,
        exigencia: p.exigencia,
      },
    ]
  })
}

export const planDe = (contenidos: string[]) => planDeSala(pasosDeContenidos(contenidos))

// Lo que edita la docente: un contenido (con las actividades que eligió, en su
// orden: así puede no empezar por «Escucha» o saltarla) o una actividad configurada.
// `exigencia`: la dificultad fijada para todo el contenido (las configurables la llevan en su paso).
export type BloquePlan = { contenido: string; pasos: number[]; exigencia?: Exigencia } | { paso: PasoSala }

export function bloqueContenido(id: string): BloquePlan {
  const c = contenido(id)
  return { contenido: id, pasos: c ? ordenDe(c) : [] }
}

// Pasos seguidos del mismo contenido forman un bloque; si un número se repite,
// empieza otro bloque (el mismo contenido puede ir dos veces en el plan).
export function bloquesDePlan(plan: PasoSala[]): BloquePlan[] {
  const bloques: BloquePlan[] = []
  for (const p of plan) {
    const c = pasoDe(p.juego)
    if (!c) {
      // Lo que ya no existe (una actividad que se sacó) no se muestra y sale del plan al guardarlo.
      if (juegoConfigurable(p.juego)) bloques.push({ paso: p })
      continue
    }
    const n = Number(c.numero)
    const ultimo = bloques.at(-1)
    if (ultimo && 'contenido' in ultimo && ultimo.contenido === c.contenido.id && !ultimo.pasos.includes(n)) ultimo.pasos.push(n)
    else bloques.push({ contenido: c.contenido.id, pasos: [n], ...(p.exigencia && { exigencia: p.exigencia }) })
  }
  return bloques
}

export const planDeBloques = (bloques: BloquePlan[]): PasoSala[] =>
  bloques.flatMap((b) => ('paso' in b ? [b.paso] : b.pasos.map((n): PasoSala => ({ juego: `${b.contenido}-${n}`, ...(b.exigencia && { exigencia: b.exigencia }) }))))

// Pasos seguidos de un mismo contenido: lo que el niño ve como una caja en su camino.
export function gruposDePlan(plan: PasoPlan[]) {
  const grupos: { contenido: Contenido; inicio: number; pasos: PasoPlan[] }[] = []
  plan.forEach((p, i) => {
    const ultimo = grupos.at(-1)
    if (ultimo && ultimo.contenido.id === p.contenido.id && !ultimo.pasos.some((x) => x.numero === p.numero)) ultimo.pasos.push(p)
    else grupos.push({ contenido: p.contenido, inicio: i, pasos: [p] })
  })
  return grupos
}

// Los contenidos enteros del plan: se guardan también en `salas.contenidos`, que
// siguen leyendo las versiones anteriores de la app.
export const contenidosDePlan = (plan: PasoSala[]) => bloquesDePlan(plan).flatMap((b) => ('contenido' in b ? [b.contenido] : []))

// Nivel de lo que mide cada categoría (Sonidos, Sílabas, Palabras), para los reportes.
const NIVEL_POR_CATEGORIA: Record<Categoria, Nivel> = { auditiva: 1, oraciones: 1, letras: 1, silabas: 2, conteo: 2, rimas: 2, palabras: 3, escritura: 3 }

// Foto de la partida al jugarla: si el catálogo cambia, el historial no se pierde.
export function contextoDePaso(p: PasoPlan, sala: Pick<Sala, 'id' | 'asignacion'>): ContextoPartida {
  const configurable = Boolean(p.parametros)
  return {
    contenidoId: configurable ? undefined : p.contenido.id,
    paso: configurable ? undefined : p.numero,
    nivel: NIVEL_POR_CATEGORIA[p.contenido.categoria],
    oa: p.contenido.oa,
    salaId: sala.id,
    asignacion: sala.asignacion,
    parametros: p.parametros,
  }
}

export function aprobo(rondas: Pick<IntentoRonda, 'acertada'>[], umbral = UMBRAL_APROBAR) {
  return rondas.length > 0 && rondas.filter((r) => r.acertada).length / rondas.length >= umbral
}

// Una actividad de contenido se guarda como «silabas-m-2»: contenido y número.
function pasoDe(actividadId: string) {
  const paso = /^(.+)-([1-9])$/.exec(actividadId)
  const c = paso && contenido(paso[1])
  // Una actividad que el contenido ya no tiene («lexica-2») no es un paso válido.
  return c && Number(paso[2]) <= c.pasos.length ? { contenido: c, numero: paso[2] } : null
}

// Nombre legible para los reportes de la docente: actividades de contenido y juegos.
// Con el nombre de la actividad y no su número: la docente puede cambiar el
// orden de las actividades de un contenido, y «Actividad 1» ya no diría cuál es.
export function nombreActividad(actividadId: string) {
  const paso = pasoDe(actividadId)
  if (paso) return `${paso.contenido.titulo} · ${paso.contenido.pasos[Number(paso.numero) - 1]?.titulo ?? `Actividad ${paso.numero}`}`
  return juegoConfigurable(actividadId)?.titulo ?? actividad(actividadId)?.titulo ?? actividadId
}

// Categoría de lo que mide la actividad; undefined si no mide avance (cuentos) o no se conoce.
export function categoriaDe(actividadId: string): Categoria | undefined {
  return pasoDe(actividadId)?.contenido.categoria ?? juegoConfigurable(actividadId)?.categoria ?? actividad(actividadId)?.categoria
}
