import type { Exigencia } from '../dominio/tipos.ts'
import { mezclar, type Ronda } from './actividades.ts'

// Dificultad de las actividades: Fácil, Medio o Difícil. Es un eje aparte de
// las actividades de cada contenido, que son una escalera de apoyo (con apoyo →
// decide solo → sin apoyo; contenidos.ts). La dificultad cambia qué tan
// difíciles son las preguntas, con el mismo sentido en todas las actividades:
// cuántas opciones hay, cuánto se parecen a la correcta (mano / mono) y qué tan
// largas son las palabras. La fija la docente por contenido en el plan de la
// sala, o para un niño en su perfil (Ajustes.dificultad, que manda); sin nada,
// Medio. Los ids (inicial, intermedio, avanzado) quedan por los planes guardados.

export interface NivelExigencia {
  nombre: string
  descripcion: string
  // Opciones por ronda en las de elegir (la correcta siempre queda).
  maxOpciones: number
  // Cuántas de las otras opciones se parecen a la correcta (mano / mono, MA / ME):
  // ninguna en Fácil, todas las que se pueda en Difícil.
  parecidas: number
  // Fácil: las palabras trabajadas son cortas (1 o 2 sílabas) mientras alcancen.
  palabrasCortas: boolean
  // Lo que sobra en las de escribir, armar y globos, además de lo de la respuesta.
  teclasExtra: number
  fichasExtra: number
  globosExtra: number
  // Tarjetas por pantalla en «Marca las palabras del dibujo».
  tarjetas: number
  rondas: number
  // Errores tras los que se ilumina la respuesta correcta. Es una ayuda: no
  // cambia lo que hay que lograr para pasar (metaDe).
  revelarTras: number
}

export const EXIGENCIAS: Record<Exigencia, NivelExigencia> = {
  inicial: {
    nombre: 'Fácil',
    descripcion: '3 opciones bien distintas y palabras cortas. La respuesta se ilumina tras 1 error.',
    maxOpciones: 3,
    parecidas: 0,
    palabrasCortas: true,
    teclasExtra: 1,
    fichasExtra: 0,
    globosExtra: 0,
    tarjetas: 4,
    rondas: 5,
    revelarTras: 1,
  },
  intermedio: {
    nombre: 'Medio',
    descripcion: '3 opciones, una parecida a la correcta. La respuesta se ilumina tras 2 errores.',
    maxOpciones: 3,
    parecidas: 1,
    palabrasCortas: false,
    teclasExtra: 3,
    fichasExtra: 1,
    globosExtra: 1,
    tarjetas: 6,
    rondas: 5,
    revelarTras: 2,
  },
  avanzado: {
    nombre: 'Difícil',
    descripcion: '4 opciones parecidas a la correcta (mano, mono, mapa). La respuesta se ilumina tras 2 errores.',
    maxOpciones: 4,
    parecidas: 3,
    palabrasCortas: false,
    teclasExtra: 5,
    fichasExtra: 2,
    globosExtra: 2,
    tarjetas: 8,
    rondas: 5,
    revelarTras: 2,
  },
}

export const nivelDe = (e: Exigencia | undefined) => EXIGENCIAS[e ?? 'intermedio'] ?? EXIGENCIAS.intermedio

// Una dificultad más fácil o más difícil (para sugerirla a la docente).
const ORDEN: Exigencia[] = ['inicial', 'intermedio', 'avanzado']
export const masFacil = (e: Exigencia | undefined) => ORDEN[Math.max(0, ORDEN.indexOf(e ?? 'intermedio') - 1)]
export const masDificil = (e: Exigencia | undefined) => ORDEN[Math.min(ORDEN.length - 1, ORDEN.indexOf(e ?? 'intermedio') + 1)]

// ---------- Para pasar de actividad ----------

// Una ronda cuenta como lograda solo al primer intento: con las opciones que se
// descartan al tocarlas, al segundo o tercer intento se llega tocando al azar.
// Para pasar hay que lograr al menos el 60 % de las rondas, y más si con tan
// pocas opciones se llegaría por suerte: con dos opciones (sí / no, la más
// larga) son 4 de 5. Tocar al azar aprueba a lo más 1 de cada 4 partidas.
export const UMBRAL_APROBAR = 0.6
const AZAR_MAXIMO = 0.25
export const META = 'Pasa con 3 de 5 rondas al primer intento (4 de 5 si son solo dos opciones, como sí o no).'

// Probabilidad de acertar al primer intento tocando al azar.
const alAzar = (r: Ronda) => (r.tipo === 'elegir' ? 1 / r.opciones.length : 0)

// Cuántas rondas hay que lograr en esta partida.
export function metaDe(rondas: Ronda[]) {
  // Cuántas se aciertan al azar: probabilidad de cada total (0, 1, 2…).
  let total = [1]
  for (const r of rondas) {
    const p = alAzar(r)
    total = [...total.map((x) => x * (1 - p)), 0].map((x, i) => x + (i > 0 ? total[i - 1] * p : 0))
  }
  for (let meta = Math.ceil(UMBRAL_APROBAR * rondas.length - 1e-9); meta <= rondas.length; meta++) {
    if (total.slice(meta).reduce((s, x) => s + x, 0) <= AZAR_MAXIMO) return Math.max(1, meta)
  }
  return rondas.length
}

export function aprobo(rondas: { acertada: boolean }[], meta: number) {
  return rondas.length > 0 && rondas.filter((r) => r.acertada).length >= meta
}

// ---------- Premios ----------

// Ciclo de una micro-partida (anatomía de las actividades, sección 2):
// 1.er intento = 3 estrellas y +10 monedas; tras una pista = 2 y +5;
// con la respuesta revelada = 1 y +2. Tres aciertos seguidos dan bono de racha.
export const PUNTAJE = [
  { estrellas: 3, monedas: 10 },
  { estrellas: 2, monedas: 5 },
  { estrellas: 1, monedas: 2 },
]
export const BONO_RACHA = 2
// Práctica (no se puede fallar): solo la recompensa base por completar, sin racha.
export const PRACTICA = { estrellas: 3, monedas: 2 }

// Monedas posibles al terminar una partida: lo dice el premio («Ganaste 35 monedas»).
const rondasPosibles = Object.values(EXIGENCIAS).map((n) => n.rondas)
export const MONEDAS_PARTIDA = {
  min: Math.min(...rondasPosibles) * Math.min(PRACTICA.monedas, ...PUNTAJE.map((p) => p.monedas)),
  max: Math.max(...rondasPosibles) * (PUNTAJE[0].monedas + BONO_RACHA),
}

// ---------- Armar la partida ----------

const ALFABETO = [...'ABCDEFGHIJLMNÑOPRSTUVZ']

// Ajusta una ronda al nivel: menos opciones, teclas, fichas, globos o tarjetas.
// Las actividades ya arman sus opciones según el nivel; esto es el resguardo
// para las que no (y para los juegos del recreo).
function ajustarRonda(r: Ronda, n: NivelExigencia): Ronda {
  switch (r.tipo) {
    case 'elegir': {
      const max = Math.max(n.maxOpciones, r.minOpciones ?? 0)
      if (r.opciones.length <= max) return r
      const otras = mezclar(r.opciones.filter((o) => o.id !== r.correctaId)).slice(0, max - 1)
      // Se conserva el orden original (las sílabas vienen ordenadas por vocal).
      return { ...r, opciones: r.opciones.filter((o) => o.id === r.correctaId || otras.includes(o)) }
    }
    case 'escribir': {
      const propias = [...new Set(r.respuesta)]
      // Primero las que propuso la actividad (p. ej. otras vocales), luego el resto del alfabeto.
      const sugeridas = mezclar(r.letras.filter((l) => !propias.includes(l)))
      const resto = mezclar(ALFABETO.filter((l) => !propias.includes(l) && !sugeridas.includes(l)))
      const extra = [...sugeridas, ...resto].slice(0, n.teclasExtra)
      return { ...r, letras: [...propias, ...extra].sort((a, b) => a.localeCompare(b, 'es')) }
    }
    case 'construir':
    case 'globos': {
      const propias = r.palabra.silabas
      const sobran = r.fichas.filter((f) => !propias.includes(f)).slice(0, r.tipo === 'globos' ? n.globosExtra : n.fichasExtra)
      return { ...r, fichas: mezclar([...propias, ...sobran]) }
    }
    case 'marcar': {
      // Menos tarjetas en los niveles bajos, con al menos una que corresponda y una que no.
      const cuantas = Math.min(r.tarjetas.length, n.tarjetas)
      if (r.tarjetas.length <= cuantas) return r
      const si = r.tarjetas.filter((t) => t.corresponde)
      const no = r.tarjetas.filter((t) => !t.corresponde)
      const deSi = Math.max(1, Math.min(si.length, cuantas - 1, Math.round((cuantas * si.length) / r.tarjetas.length)))
      const quedan = new Set([...si.slice(0, deSi), ...no.slice(0, cuantas - deSi)])
      return { ...r, tarjetas: r.tarjetas.filter((t) => quedan.has(t)) }
    }
    default:
      return r
  }
}

// Arma la partida al nivel: la actividad recibe el nivel para elegir sus
// palabras y opciones; después se ajusta cada ronda y se completa (o recorta)
// hasta el número de rondas del nivel sin repetir lo trabajado.
// Recibe el nivel (o su nombre; sin nada, Medio).
export function partidaConExigencia(generar: (n: NivelExigencia) => Ronda[], e: Exigencia | NivelExigencia | undefined): Ronda[] {
  const n = typeof e === 'object' ? e : nivelDe(e)
  const rondas = generar(n)
  for (let intento = 0; rondas.length < n.rondas && intento < 4; intento++) {
    const vistos = new Set(rondas.map((r) => r.item))
    rondas.push(...generar(n).filter((r) => !vistos.has(r.item)))
  }
  // Si el pool no da para más (p. ej. las 5 vocales), la partida queda con las que hay.
  return rondas.slice(0, n.rondas).map((r) => ajustarRonda(r, n))
}
