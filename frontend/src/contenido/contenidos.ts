import type { ContextoPartida, Exigencia, Nivel, Palabra, ParametrosJuego, PasoSala, Sala } from '../dominio/tipos.ts'
import {
  actividad,
  completaLaSilaba,
  constructorDePalabras,
  globosDePalabras,
  mezclar,
  ordenarSilabas,
  otrasOpciones,
  tomar,
  type Categoria,
  type Opcion,
  type Ronda,
} from './actividades.ts'
import { CONSONANTES_SILABAS, LETRAS, PALABRAS_NIVEL_3, VOCALES, bancoGeneral, laLetra, nombreLetra, palabra, quitarTildes, sinAcentos, sonido } from './banco.ts'
import { bancoDe, cercaniaDe, distractores, objetivos, opcionesDe, type Contexto } from './elegir.ts'
import type { NivelExigencia } from './exigencia.ts'
import { palabrasDelDibujo } from './lexica.ts'
import { juegoConfigurable } from './plantillas.ts'
import { parecidos, type Tema } from './temas.ts'

// Contenidos de las Bases Curriculares de la Educación Parvularia (MINEDUC,
// 2018), núcleo Lenguaje Verbal, Tercer Nivel (Transición):
//   OA 3: descubrir atributos fonológicos de palabras conocidas (conteo y
//         segmentación de sílabas, sonidos iniciales y finales).
//   OA 4: incorporar palabras nuevas a su vocabulario (temas de palabras).
//   OA 7: reconocer palabras asociando algunos fonemas a sus grafemas.
//   OA 8: representar gráficamente letras y palabras significativas.
// La docente asigna contenidos a una sala. Cada uno trae 3 actividades que son
// una escalera de apoyo, igual en todos (ordenPorDefecto):
//   1. Con apoyo: ve el dibujo y escucha la palabra, y elige.
//   2. Decide solo: el niño decide el sonido, la sílaba o la palabra.
//   3. Sin apoyo: solo de oído, o armando o escribiendo la respuesta.
// Aparte, la dificultad (Fácil, Medio, Difícil; exigencia.ts) cambia qué tan
// difíciles son las preguntas. Cada partida se arma al azar desde el pool del
// contenido, así repetir una actividad nunca es igual a la anterior.

export const OA = {
  'OA 3': 'Descubrir en contextos lúdicos atributos fonológicos de palabras conocidas: conteo y segmentación de sílabas, sonidos iniciales y finales.',
  'OA 4': 'Comunicar oralmente temas de su interés, empleando un vocabulario variado e incorporando palabras nuevas y pertinentes.',
  'OA 7': 'Reconocer palabras asociando algunos fonemas a sus correspondientes grafemas.',
  'OA 8': 'Representar gráficamente algunos trazos, letras, signos, palabras significativas y mensajes simples legibles.',
} as const

// Áreas en que se agrupan los contenidos al armar el plan: las actividades
// auditivas (solo escuchar, sin letras) van aparte de las de sílabas.
export const AREAS = {
  auditiva: { nombre: 'Escuchar', icono: '👂', descripcion: 'Distinguir palabras y sonidos de oído, sin letras.' },
  oraciones: { nombre: 'Conciencia léxica', icono: '🗣️', descripcion: 'Reconocer las palabras que corresponden con un dibujo.' },
  vocabulario: { nombre: 'Vocabulario', icono: '📚', descripcion: 'Agrupar palabras por tema: frutas, oficios, medios de transporte…' },
  letras: { nombre: 'Vocales y letras', icono: '🔤', descripcion: 'Sonido de cada letra y su forma.' },
  silabas: { nombre: 'Sílabas', icono: '👏', descripcion: 'Reconocer, contar y comparar sílabas.' },
  palabras: { nombre: 'Palabras', icono: '🧩', descripcion: 'Formar y completar palabras con sílabas.' },
  escritura: { nombre: 'Escritura', icono: '✏️', descripcion: 'Escribir letras y palabras, siempre en mayúscula.' },
} as const

export type Area = keyof typeof AREAS

export type CodigoOA = keyof typeof OA

interface Paso {
  titulo: string
  // Con el tema que eligió la docente para el contenido y el nivel de dificultad.
  generar: (c?: Contexto) => Ronda[]
  // Arma sus rondas con palabras del banco: se puede filtrar por tema.
  conTema?: true
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
  // 3 actividades; una sola en las configurables. El número de cada una
  // (posición + 1) es su identidad en el historial: no se reordenan aquí.
  pasos: Paso[]
  // Orden con que entra al plan (números de `pasos`): la escalera con apoyo →
  // decide solo → sin apoyo. Sin esto, 1, 2, 3.
  ordenPorDefecto?: number[]
}

// Rondas por partida (regla de oro 4: micro-partidas de 4 a 5 rondas).
const RONDAS = 5

const MAYUS = (s: string) => s.toUpperCase()

// Sin meses ni estaciones (temas.ts) y una sola imagen por emoji: dos opciones
// con el mismo dibujo confundirían.
const GENERAL = bancoGeneral()
const BANCO = GENERAL.filter((w, i) => GENERAL.findIndex((x) => x.imagen.emoji === w.imagen.emoji) === i)
// Las palabras de una partida: primero las del tema y, en Fácil, las cortas.
const banco = (c: Contexto) => bancoDe(BANCO, c)
// Cuántas opciones distintas de la correcta lleva una ronda de elegir en este nivel.
const otrasDe = (c: Contexto) => opcionesDe(c.nivel) - 1

const opcionPalabra = (w: Palabra): Opcion => ({ id: w.id, imagen: w.imagen, audio: w.texto })
const opcionTexto = (id: string, texto: string, audio: string): Opcion => ({ id, texto, audio })

// Sílaba inicial directa (consonante + vocal), sin tildes; null si empieza distinto.
function silabaInicialCV(w: Palabra) {
  const s = quitarTildes(w.silabas[0])
  return /^[bcdfgjklmnñprstvz][aeiou]$/.test(s) ? s : null
}
const silabaFinal = (w: Palabra) => sinAcentos(w.silabas[w.silabas.length - 1])
// Para comparar se usa cómo suenan, no cómo se escriben (banco.ts: sonido): en
// Chile «cereza» termina igual que «mesa» y «zapato» empieza con SA.
const finalSuena = (w: Palabra) => sonido(w.silabas[w.silabas.length - 1])
const empiezaSonando = (w: Palabra, inicio: string) => sonido(w.texto).startsWith(sonido(inicio))
const ultimaLetra = (w: Palabra) => sinAcentos(w.texto).at(-1)
const empiezaCon = (w: Palabra, prefijo: string) => quitarTildes(w.texto).startsWith(prefijo)

// ---------- Vocales (OA 7, OA 3) ----------

const LETRAS_VOCALES = LETRAS.filter((l) => (VOCALES as readonly string[]).includes(l.id))
const empiezaConVocal = (w: Palabra) => LETRAS_VOCALES.some((v) => empiezaCon(w, v.id))
// Vocales que de oído se confunden más (E / I, O / U).
const VOCAL_PARECIDA: Record<string, string> = { e: 'i', i: 'e', o: 'u', u: 'o' }

function opcionesVocal(v: (typeof LETRAS_VOCALES)[number], c: Contexto) {
  const otras = otrasOpciones(
    LETRAS_VOCALES.filter((x) => x.id !== v.id),
    otrasDe(c),
    (x) => VOCAL_PARECIDA[v.id] === x.id,
    c.nivel,
  )
  return mezclar([v, ...otras]).map((x) => opcionTexto(x.id, x.grafema, nombreLetra(x.id)))
}

// Sin apoyo: solo de oído.
function escucharVocal(c: Contexto = {}): Ronda[] {
  return tomar(LETRAS_VOCALES, RONDAS).map((v) => ({
    tipo: 'elegir',
    item: v.grafema,
    estimulo: { audio: laLetra(v.id) },
    opciones: opcionesVocal(v, c),
    correctaId: v.id,
    instruccion: `Toca la letra ${nombreLetra(v.id)}.`,
    pista: `¡Casi! Busca ${laLetra(v.id)}. ¡Otra vez!`,
    refuerzo: `¡Muy bien! Es ${laLetra(v.id)}.`,
  }))
}

// Con apoyo: ve el dibujo y escucha la palabra.
function vocalInicial(c: Contexto = {}): Ronda[] {
  return objetivos(banco(c), RONDAS, empiezaConVocal).map((w) => {
    const v = LETRAS_VOCALES.find((x) => empiezaCon(w, x.id))!
    return {
      tipo: 'elegir',
      item: v.grafema,
      estimulo: { imagen: w.imagen, audio: w.texto },
      opciones: opcionesVocal(v, c),
      correctaId: v.id,
      instruccion: `${w.texto}. ¿Con qué letra empieza ${w.texto}?`,
      pista: `¡Casi! Escucha bien: ${w.texto}. ¡Otra vez!`,
      refuerzo: '¡Sí! Muy bien.',
    }
  })
}

// Decide solo: busca entre dibujos; las parecidas empiezan con otra vocal.
function imagenConVocal(c: Contexto = {}): Ronda[] {
  const b = banco(c)
  return objetivos(b, RONDAS, empiezaConVocal).map((correcta) => {
    const v = LETRAS_VOCALES.find((x) => empiezaCon(correcta, x.id))!
    const otras = distractores(b, otrasDe(c), [correcta], (w) => !empiezaSonando(w, v.id), cercaniaDe(empiezaConVocal, c.nivel))
    return {
      tipo: 'elegir',
      item: v.grafema,
      estimulo: { texto: v.grafema, audio: laLetra(v.id) },
      opciones: mezclar([correcta, ...otras]).map(opcionPalabra),
      correctaId: correcta.id,
      instruccion: `Toca el dibujo que empieza con ${laLetra(v.id)}.`,
      pista: `¡Casi! Busca el que empieza con ${laLetra(v.id)}. ¡Otra vez!`,
      refuerzo: `¡Excelente! ${correcta.texto} empieza con ${laLetra(v.id)}.`,
    }
  })
}

// ---------- Sílabas directas por consonante (OA 7, OA 3) ----------

const deFamilia = (c: string) => (w: Palabra) => silabaInicialCV(w)?.[0] === c
const SILABAS_DIRECTAS = CONSONANTES_SILABAS.flatMap((c) => VOCALES.map((v) => c + v))

// Las otras sílabas de una ronda: las parecidas tienen la misma consonante
// (MA / ME); las distintas, otra consonante y otra vocal (MA / PE).
function opcionesSilaba(s: string, c: Contexto) {
  const candidatas = SILABAS_DIRECTAS.filter((x) => x !== s && (x[0] === s[0] || x[1] !== s[1]))
  const otras = otrasOpciones(candidatas, otrasDe(c), (x) => x[0] === s[0], c.nivel)
  return ordenarSilabas(mezclar([s, ...otras])).map((x) => opcionTexto(x, MAYUS(x), x))
}

// Sin apoyo: solo de oído.
function escucharSilaba(consonante: string, c: Contexto = {}): Ronda[] {
  const silabas = VOCALES.map((v) => consonante + v)
  return tomar(silabas, RONDAS).map((s) => ({
    tipo: 'elegir',
    item: MAYUS(s),
    estimulo: { audio: s },
    opciones: opcionesSilaba(s, c),
    correctaId: s,
    instruccion: `Toca la sílaba ${s}.`,
    pista: `¡Casi! Escucha otra vez: ${s}.`,
  }))
}

// Con apoyo: ve el dibujo y escucha la palabra.
function silabaDeLaImagen(consonante: string, c: Contexto = {}): Ronda[] {
  return objetivos(banco(c), RONDAS, deFamilia(consonante)).map((w) => {
    const s = silabaInicialCV(w)!
    return {
      tipo: 'elegir',
      item: MAYUS(s),
      estimulo: { imagen: w.imagen, audio: w.texto },
      opciones: opcionesSilaba(s, c),
      correctaId: s,
      instruccion: `${w.texto}. ¿Con qué sílaba empieza ${w.texto}?`,
      pista: `¡Casi! ${s}… ${w.texto}. ¡Otra vez!`,
      refuerzo: `¡Sí! ${MAYUS(s)}, de ${w.texto}.`,
    }
  })
}

// Decide solo: busca entre dibujos. Las parecidas empiezan con la misma
// consonante (mano / mono / mango): hay que distinguir la sílaba completa.
function imagenDeLaSilaba(consonante: string, c: Contexto = {}): Ronda[] {
  const b = banco(c)
  return objetivos(b, RONDAS, deFamilia(consonante)).map((correcta) => {
    const s = silabaInicialCV(correcta)!
    const otras = distractores(b, otrasDe(c), [correcta], (w) => !empiezaSonando(w, s), cercaniaDe((w) => empiezaSonando(w, consonante), c.nivel))
    return {
      tipo: 'elegir',
      item: MAYUS(s),
      estimulo: { texto: MAYUS(s), audio: s },
      opciones: mezclar([correcta, ...otras]).map(opcionPalabra),
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

function contenidoSilabas(consonante: (typeof CONSONANTES_SILABAS)[number]): Contenido {
  const silabas = VOCALES.map((v) => MAYUS(consonante + v)).join(', ')
  return {
    id: `silabas-${consonante}`,
    oa: ['OA 7', 'OA 3'],
    titulo: `Sílabas con ${MAYUS(consonante)}`,
    area: 'silabas',
    descripcion: `Sílabas directas ${silabas}: reconocerlas al inicio de palabras, buscarlas entre dibujos y, al final, solo de oído.`,
    categoria: 'silabas',
    ...NOMBRE_SILABAS[consonante],
    pasos: [
      { titulo: 'Escucha y toca la sílaba', generar: (c) => escucharSilaba(consonante, c) },
      { titulo: '¿Con qué sílaba empieza?', generar: (c) => silabaDeLaImagen(consonante, c), conTema: true },
      { titulo: 'Busca la imagen de la sílaba', generar: (c) => imagenDeLaSilaba(consonante, c), conTema: true },
    ],
    ordenPorDefecto: [2, 3, 1],
  }
}

// ---------- Palabras largas y cortas (OA 3, conteo de sílabas) ----------

const deLargo = (n: number) => (w: Palabra) => w.silabas.length === n

// Cuántas sílabas tienen las palabras que se comparan: en Fácil la diferencia
// es grande (SOL / MARIPOSA); en Difícil, de una sílaba (PATO / PELOTA).
function largosDe(nivel?: NivelExigencia): [number, number][] {
  const parecidas = nivel?.parecidas ?? 1
  if (parecidas === 0) return [[1, 3], [1, 4], [2, 4]]
  if (parecidas === 1) return [[1, 3], [2, 4], [2, 3]]
  return [[1, 2], [2, 3], [3, 4]]
}

// Dos imágenes: la que tiene más (o menos) sílabas.
function compararLargo(larga: boolean, c: Contexto = {}): Ronda[] {
  const b = banco({ tema: c.tema })
  const largos = largosDe(c.nivel)
  return Array.from({ length: RONDAS }, () => {
    const [cortas, largas] = largos[Math.floor(Math.random() * largos.length)]
    const corta = distractores(b, 1, [], deLargo(cortas))[0]
    const extensa = distractores(b, 1, [corta], deLargo(largas))[0]
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

// Una de cada largo; la de más sílabas es la correcta. Fácil: 1, 2 y 4 sílabas;
// Medio: 2, 3 y 4; Difícil: 1, 2, 3 y 4.
function laMasLarga(c: Contexto = {}): Ronda[] {
  const b = banco({ tema: c.tema })
  const largos = (c.nivel?.parecidas ?? 1) === 0 ? [1, 2, 4] : [1, 2, 3, 4].slice(-opcionesDe(c.nivel))
  return Array.from({ length: RONDAS }, () => {
    const elegidas: Palabra[] = []
    for (const n of largos) elegidas.push(...distractores(b, 1, elegidas, deLargo(n)))
    const opciones = mezclar(elegidas)
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

// Otra palabra que termina igual y no se confunde con ella (flor / flores).
const rimaCon = (w: Palabra) => (x: Palabra) => !parecidos(x.id, w.id) && finalSuena(x) === finalSuena(w)
// Con cuántas palabras rima cada una (se cuenta una vez: se consulta mucho).
const RIMAS = new Map(BANCO.map((w) => [w.id, BANCO.filter(rimaCon(w)).length]))
// Con al menos `n` palabras que riman con ella.
const conRimas = (n: number) => (w: Palabra) => (RIMAS.get(w.id) ?? 0) >= n
// Las que no riman pero terminan en la misma letra (gato / mano) son las parecidas.
const terminaParecido = (w: Palabra, c: Contexto) => cercaniaDe((x: Palabra) => ultimaLetra(x) === ultimaLetra(w), c.nivel)

// Con apoyo: ve el dibujo de la palabra y busca la que termina igual.
function encuentraLaRima(c: Contexto = {}): Ronda[] {
  const b = banco(c)
  return objetivos(b, RONDAS, conRimas(1)).map((w) => {
    const fin = silabaFinal(w)
    const correcta = distractores(b, 1, [w], rimaCon(w))[0]
    const otras = distractores(b, otrasDe(c), [w, correcta], (x) => finalSuena(x) !== finalSuena(w), terminaParecido(w, c))
    return {
      tipo: 'elegir',
      item: `-${MAYUS(fin)}`,
      estimulo: { imagen: w.imagen, audio: w.texto },
      opciones: mezclar([correcta, ...otras]).map(opcionPalabra),
      correctaId: correcta.id,
      instruccion: `Escucha: ${w.texto}. ¿Cuál termina igual que ${w.texto}?`,
      // La sílaba sola al final de la frase o junto a «en» la voz la pierde o la
      // pega («terminento»): va al medio y después de dos puntos.
      pista: `¡Casi! Escucha el final de ${w.texto}: ${fin}. ¡Otra vez!`,
      refuerzo: `¡Sí! Las dos terminan en ${fin}: ${w.texto} y ${correcta.texto}.`,
    }
  })
}

// Decide solo: todas riman menos una, que es la respuesta.
function cualNoRima(c: Contexto = {}): Ronda[] {
  const b = banco(c)
  const riman = Math.max(2, otrasDe(c))
  return objetivos(b, RONDAS, conRimas(riman - 1)).map((w) => {
    const fin = silabaFinal(w)
    const grupo = [w, ...distractores(b, riman - 1, [w], rimaCon(w))]
    const intrusa = distractores(b, 1, grupo, (x) => finalSuena(x) !== finalSuena(w), terminaParecido(w, c))[0]
    const opciones = mezclar([...grupo, intrusa])
    return {
      tipo: 'elegir',
      item: `-${MAYUS(fin)}`,
      estimulo: {},
      opciones: opciones.map(opcionPalabra),
      correctaId: intrusa.id,
      // En la dificultad más baja quedan dos que riman y la que no.
      minOpciones: 3,
      instruccion: `Escucha: ${opciones.map((x) => x.texto).join('… ')}. ¿Cuál no termina igual?`,
      pista: `¡Casi! Escucha los finales: ${opciones.map(silabaFinal).join('… ')}. ¡Otra vez!`,
      refuerzo: `¡Sí! Las otras terminan en ${fin}: ${grupo.map((x) => x.texto).join(' y ')}.`,
    }
  })
}

// Sin apoyo: dos palabras solo de oído, ¿terminan igual?
function terminanIgual(c: Contexto = {}): Ronda[] {
  const b = banco(c)
  return Array.from({ length: RONDAS }, () => {
    const a = distractores(b, 1, [], conRimas(1))[0]
    const igual = Math.random() < 0.5
    const otra = igual
      ? distractores(b, 1, [a], rimaCon(a))[0]
      : distractores(b, 1, [a], (x) => finalSuena(x) !== finalSuena(a), terminaParecido(a, c))[0]
    const [fa, fb] = [silabaFinal(a), silabaFinal(otra)]
    return {
      tipo: 'elegir',
      item: `-${MAYUS(fa)} y -${MAYUS(fb)}`,
      estimulo: { audio: `${a.texto}… ${otra.texto}` },
      opciones: SI_NO,
      correctaId: igual ? 'si' : 'no',
      instruccion: `Escucha: ${a.texto}… ${otra.texto}. ¿Terminan igual?`,
      pista: `¡Casi! Escucha los finales: ${fa}… ${fb}. ¡Otra vez!`,
      refuerzo: igual ? `¡Sí! Las dos terminan en ${fa}: ${a.texto} y ${otra.texto}.` : `¡Muy bien! ${a.texto} y ${otra.texto} terminan distinto.`,
    }
  })
}

// ---------- Escuchar: discriminación auditiva, sin letras (OA 3) ----------

// Palabras que empiezan con una letra del banco (vocal o M, P, L, S, T): su
// primer sonido se puede decir solo («mmm…») en las pistas.
const inicial = (w: Palabra) => quitarTildes(w.texto)[0]
const inicialSuena = (w: Palabra) => sonido(w.texto)[0]
const conSonidoInicial = (w: Palabra) => LETRAS.some((l) => l.id === inicial(w))
const empiezaIgualQue = (w: Palabra) => (x: Palabra) => conSonidoInicial(x) && inicial(x) === inicial(w)
const primeraSilaba = (w: Palabra) => quitarTildes(w.silabas[0])

// Con apoyo: escucha la palabra y la busca entre dibujos. Las parecidas
// empiezan igual o riman con ella (mano / mapa / gano).
function palabraEscuchada(c: Contexto = {}): Ronda[] {
  const b = banco(c)
  return objetivos(b, RONDAS).map((w) => {
    const parecida = (x: Palabra) => inicialSuena(x) === inicialSuena(w) || finalSuena(x) === finalSuena(w)
    const otras = distractores(b, otrasDe(c), [w], undefined, cercaniaDe(parecida, c.nivel))
    return {
      tipo: 'elegir',
      item: w.texto,
      estimulo: { audio: w.texto },
      opciones: mezclar([w, ...otras]).map(opcionPalabra),
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

// Sin apoyo: dos palabras solo de oído. En Fácil, las que empiezan igual
// comparten la sílaba (mano / mapa) y las distintas no se parecen; en Difícil,
// comparten solo el primer sonido (mano / mesa) o riman (pato / gato).
function empiezanIgual(c: Contexto = {}): Ronda[] {
  const b = banco(c)
  return Array.from({ length: RONDAS }, () => {
    const a = distractores(b, 1, [], conSonidoInicial)[0]
    const igual = Math.random() < 0.5
    const otra = igual
      ? distractores(b, 1, [a], empiezaIgualQue(a), cercaniaDe((x) => primeraSilaba(x) !== primeraSilaba(a), c.nivel))[0]
      : distractores(b, 1, [a], (x) => conSonidoInicial(x) && inicialSuena(x) !== inicialSuena(a), cercaniaDe((x) => finalSuena(x) === finalSuena(a), c.nivel))[0]
    const [ia, ib] = [inicial(a), inicial(otra)]
    return {
      tipo: 'elegir',
      item: `${MAYUS(ia)} y ${MAYUS(ib)}`,
      estimulo: { audio: `${a.texto}… ${otra.texto}` },
      opciones: SI_NO,
      correctaId: igual ? 'si' : 'no',
      instruccion: `Escucha: ${a.texto}… ${otra.texto}. ¿Empiezan con el mismo sonido?`,
      pista: `¡Casi! Escucha otra vez: ${a.texto}… ${otra.texto}.`,
      refuerzo: igual ? `¡Sí! Las dos empiezan con ${laLetra(ia)}.` : `¡Muy bien! ${a.texto} y ${otra.texto} empiezan distinto.`,
    }
  })
}

// Decide solo: escucha una palabra y busca el dibujo que empieza igual. Las
// parecidas riman con la palabra o con la respuesta.
// Las que tienen otra palabra que empieza igual y no se confunde con ella.
const CON_PAREJA = new Set(BANCO.filter((w) => conSonidoInicial(w) && BANCO.some((x) => !parecidos(x.id, w.id) && empiezaIgualQue(w)(x))).map((w) => w.id))
const conPareja = (w: Palabra) => CON_PAREJA.has(w.id)

function mismoSonidoInicial(c: Contexto = {}): Ronda[] {
  const b = banco(c)
  return objetivos(b, RONDAS, conPareja).map((w) => {
    const correcta = distractores(b, 1, [w], empiezaIgualQue(w))[0]
    const rima = (x: Palabra) => finalSuena(x) === finalSuena(w) || finalSuena(x) === finalSuena(correcta)
    const otras = distractores(b, otrasDe(c), [w, correcta], (x) => inicialSuena(x) !== inicialSuena(w), cercaniaDe(rima, c.nivel))
    return {
      tipo: 'elegir',
      item: MAYUS(inicial(w)),
      estimulo: { audio: w.texto },
      opciones: mezclar([correcta, ...otras]).map(opcionPalabra),
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
  // Teclas: las de la respuesta y algunas más (de `relleno`); el nivel ajusta cuántas.
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

function escribeVocal(c: Contexto = {}): Ronda[] {
  return objetivos(banco(c), RONDAS, empiezaConVocal).map((w) => {
    const v = paraEscribir(w.texto[0])
    return rondaEscribir(
      w,
      v,
      `${w.texto}. Escribe la vocal con que empieza ${w.texto}.`,
      `¡Casi! Escucha bien: ${w.texto}. ¡Otra vez!`,
      '¡Sí! Muy bien.',
      'AEIOU',
    )
  })
}

function escribeSilaba(c: Contexto = {}): Ronda[] {
  const conSilaba = (w: Palabra) => CONSONANTES_SILABAS.some((x) => deFamilia(x)(w))
  return objetivos(banco(c), RONDAS, conSilaba).map((w) => {
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
    descripcion: 'Discriminación auditiva sin letras: reconocer la palabra escuchada, buscar el dibujo que empieza igual y, al final, comparar sonidos iniciales solo de oído.',
    categoria: 'auditiva',
    icono: '👂',
    color: 'var(--color-nino-azul)',
    pasos: [
      { titulo: '¿Qué palabra escuchaste?', generar: palabraEscuchada, conTema: true, instrucciones: 'Escucha la palabra y toca su dibujo.' },
      {
        titulo: '¿Empiezan con el mismo sonido?',
        generar: empiezanIgual,
        conTema: true,
        instrucciones: 'Escucha dos palabras. Si empiezan igual toca el pulgar arriba; si no, el pulgar abajo.',
      },
      {
        titulo: 'Busca el dibujo que empieza igual',
        generar: mismoSonidoInicial,
        conTema: true,
        instrucciones: 'Escucha la palabra y toca el dibujo que empieza con el mismo sonido.',
      },
    ],
    ordenPorDefecto: [1, 3, 2],
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
      { titulo: 'Marca las palabras del dibujo', generar: palabrasDelDibujo, conTema: true },
    ],
  },
  {
    id: 'vocales',
    oa: ['OA 7', 'OA 3'],
    titulo: 'Las vocales',
    area: 'letras',
    descripcion: 'Vocales A, E, I, O, U: con qué vocal empieza un dibujo, buscar dibujos por su vocal y, al final, reconocerlas solo de oído.',
    categoria: 'letras',
    icono: '🐝',
    color: 'var(--color-nino-amarillo)',
    pasos: [
      { titulo: 'Escucha y toca la vocal', generar: escucharVocal },
      { titulo: '¿Con qué vocal empieza?', generar: vocalInicial, conTema: true },
      { titulo: 'Busca el dibujo de la vocal', generar: imagenConVocal, conTema: true },
    ],
    ordenPorDefecto: [2, 3, 1],
  },
  ...CONSONANTES_SILABAS.map(contenidoSilabas),
  {
    id: 'largas-cortas',
    oa: ['OA 3'],
    titulo: 'Palabras largas y cortas',
    area: 'silabas',
    descripcion: 'Comparar palabras por su cantidad de sílabas: cuál es más larga, cuál más corta y la más larga entre varias.',
    categoria: 'conteo',
    icono: '🐘',
    color: 'var(--color-nino-azul)',
    pasos: [
      { titulo: '¿Cuál es más larga?', generar: (c) => compararLargo(true, c), conTema: true },
      { titulo: '¿Cuál es más corta?', generar: (c) => compararLargo(false, c), conTema: true },
      { titulo: 'Encuentra la palabra más larga', generar: laMasLarga, conTema: true },
    ],
  },
  {
    id: 'rimas',
    oa: ['OA 3'],
    titulo: 'Rimas: ¿cuál termina igual?',
    area: 'auditiva',
    descripcion: 'Identificar la sílaba final de palabras conocidas (GATO / PATO): buscar la que rima, encontrar la que no rima y, al final, decidir solo de oído si dos palabras terminan igual.',
    categoria: 'rimas',
    icono: '🐱',
    color: 'var(--color-nino-menta)',
    pasos: [
      { titulo: 'Encuentra la que termina igual', generar: encuentraLaRima, conTema: true },
      { titulo: '¿Cuál no termina igual?', generar: cualNoRima, conTema: true, instrucciones: 'Escucha las palabras y toca la que no termina igual que las otras.' },
      {
        titulo: '¿Terminan igual?',
        generar: terminanIgual,
        conTema: true,
        instrucciones: 'Escucha dos palabras. Si terminan igual toca el pulgar arriba; si no, el pulgar abajo.',
      },
    ],
  },
  {
    id: 'formo-palabras',
    oa: ['OA 7', 'OA 3'],
    titulo: 'Formo palabras',
    area: 'palabras',
    descripcion: 'Palabras de dos sílabas: completar la sílaba que falta, armarlas con fichas y reventar globos en orden.',
    categoria: 'palabras',
    icono: '🎈',
    color: 'var(--color-nino-lila)',
    pasos: [
      { titulo: 'Arma la palabra con sílabas', generar: () => constructorDePalabras() },
      { titulo: 'Revienta los globos y forma la palabra', generar: () => globosDePalabras() },
      { titulo: 'Completa la sílaba que falta', generar: (c) => completaLaSilaba(c?.nivel) },
    ],
    ordenPorDefecto: [3, 1, 2],
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
      { titulo: 'Escribe la vocal con que empieza', generar: escribeVocal, conTema: true, instrucciones: 'Mira el dibujo y escribe la vocal con que empieza.' },
      { titulo: 'Escribe la sílaba con que empieza', generar: escribeSilaba, conTema: true, instrucciones: 'Mira el dibujo y escribe la sílaba con que empieza.' },
      { titulo: 'Escribe la palabra', generar: () => escribePalabra(), instrucciones: 'Mira el dibujo y escribe la palabra completa, letra por letra.' },
    ],
  },
]

export function contenido(id: string) {
  return CONTENIDOS.find((c) => c.id === id)
}

// Si alguna de esas actividades del contenido se puede filtrar por tema (las
// que arman palabras con la lista fija de «Formo palabras», no).
export const usaTema = (c: Contenido, pasos: number[] = c.pasos.map((_, i) => i + 1)) => pasos.some((n) => c.pasos[n - 1]?.conTema)

// ---------- Plan de una sala ----------

export interface PasoPlan {
  contenido: Contenido
  numero: number
  // Con el que se guarda el resultado: «silabas-m-2» o «escucha-letra».
  actividadId: string
  // Distingue dos pasos con la misma actividad (dos plantillas de letras).
  clave: string
  // Con el nivel de dificultad (exigencia.ts: partidaConExigencia).
  generar: (nivel?: NivelExigencia) => Ronda[]
  instrucciones?: string
  parametros?: ParametrosJuego
  // La que fijó la docente para esta actividad en la sala; sin esto, la del niño.
  exigencia?: Exigencia
  // Tema de las palabras que eligió la docente (solo actividades de contenido).
  tema?: Tema
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
          generar: (nivel) => paso.generar({ tema: paso.conTema ? p.tema : undefined, nivel }),
          instrucciones: paso.instrucciones,
          exigencia: p.exigencia,
          ...(p.tema && paso.conTema && { tema: p.tema }),
        },
      ]
    }
    const j = juegoConfigurable(p.juego)
    if (!j) return []
    const parametros = p.parametros ?? j.porDefecto
    const generar = (nivel?: NivelExigencia) => j.generar(parametros, nivel)
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
          pasos: [{ titulo: j.titulo, generar: (c) => generar(c?.nivel), instrucciones: j.instrucciones }],
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
// `tema`: el tema de las palabras del contenido (contenido/temas.ts).
export type BloquePlan = { contenido: string; pasos: number[]; exigencia?: Exigencia; tema?: Tema } | { paso: PasoSala }

export function bloqueContenido(id: string): BloquePlan {
  const c = contenido(id)
  return { contenido: id, pasos: c ? ordenDe(c) : [] }
}

// Pasos seguidos del mismo contenido forman un bloque; si un número se repite o
// cambia la dificultad o el tema, empieza otro bloque (el mismo contenido puede
// ir dos veces en el plan).
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
    const sigue = ultimo && 'contenido' in ultimo && ultimo.contenido === c.contenido.id && !ultimo.pasos.includes(n) && ultimo.exigencia === p.exigencia && ultimo.tema === p.tema
    if (sigue) ultimo.pasos.push(n)
    else bloques.push({ contenido: c.contenido.id, pasos: [n], ...(p.exigencia && { exigencia: p.exigencia }), ...(p.tema && { tema: p.tema }) })
  }
  return bloques
}

export const planDeBloques = (bloques: BloquePlan[]): PasoSala[] =>
  bloques.flatMap((b) =>
    'paso' in b ? [b.paso] : b.pasos.map((n): PasoSala => ({ juego: `${b.contenido}-${n}`, ...(b.exigencia && { exigencia: b.exigencia }), ...(b.tema && { tema: b.tema }) })),
  )

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
const NIVEL_POR_CATEGORIA: Record<Categoria, Nivel> = { auditiva: 1, oraciones: 1, vocabulario: 1, letras: 1, silabas: 2, conteo: 2, rimas: 2, palabras: 3, escritura: 3 }

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
    // En una de contenido, el tema de las palabras si la docente eligió uno.
    parametros: p.parametros ?? (p.tema && { tema: p.tema }),
  }
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
