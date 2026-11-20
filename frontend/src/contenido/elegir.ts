import type { Palabra } from '../dominio/tipos.ts'
import { mezclar } from './actividades.ts'
import type { NivelExigencia } from './exigencia.ts'
import { parecidos, type Tema } from './temas.ts'

// Cómo se eligen las palabras de una partida.
//   · Tema: si la docente filtró el contenido por tema, sus palabras van primero
//     y, si no alcanzan para lo que pide la actividad (p. ej. frutas que empiecen
//     con MA), se completa con las demás.
//   · Dificultad (exigencia.ts): en Fácil se prefieren palabras cortas, y cada
//     nivel decide cuántas de las otras opciones se parecen a la correcta.
// Sin tema ni nivel, es igual que elegir al azar de todo el banco.

// Lo que recibe cada actividad al armarse.
export interface Contexto {
  tema?: Tema
  nivel?: NivelExigencia
}

export interface Banco {
  // Por orden de preferencia: del tema y cortas, del tema, cortas.
  preferidas: Palabra[][]
  todas: Palabra[]
}

const corta = (w: Palabra) => w.silabas.length <= 2

export function bancoDe(todas: Palabra[], { tema, nivel }: Contexto = {}): Banco {
  const delTema = tema ? todas.filter((w) => w.tema === tema) : []
  const cortas = nivel?.palabrasCortas
  return { preferidas: cortas ? [delTema.filter(corta), delTema, todas.filter(corta)] : [delTema], todas }
}

type Filtro = (w: Palabra) => boolean
const todas: Filtro = () => true

// Las candidatas por grupo, en orden de preferencia y al azar dentro de cada uno.
const grupos = (b: Banco, filtro: Filtro) => [...b.preferidas, b.todas].map((g) => mezclar(g.filter(filtro)))
const candidatas = (b: Banco, filtro: Filtro) => grupos(b, filtro).flat()

// Las palabras que se trabajan en las rondas (una por ronda), sin repetir.
export function objetivos(b: Banco, n: number, filtro: Filtro = todas) {
  const r: Palabra[] = []
  for (const w of candidatas(b, filtro)) {
    if (r.length >= n) break
    if (!r.some((x) => x.id === w.id)) r.push(w)
  }
  return mezclar(r)
}

// Qué otra opción se parece a la correcta en esta actividad (empieza igual,
// rima…) y cuántas así pide el nivel.
export interface Cercania {
  parecida: Filtro
  cuantas: number
}

export const cercaniaDe = (parecida: Filtro, nivel?: NivelExigencia): Cercania => ({ parecida, cuantas: nivel?.parecidas ?? 1 })

// Otras opciones de una ronda: sin repetir y sin ninguna que se confunda con
// las ya elegidas (`con`) ni entre sí (temas.ts: PARECIDOS). Con `cercania`,
// primero las parecidas que pide el nivel y después las distintas; si no
// alcanzan las distintas, se completa con parecidas. El tema manda: se agotan
// sus palabras antes de pasar a las demás.
export function distractores(b: Banco, n: number, con: Palabra[], filtro: Filtro = todas, cercania?: Cercania) {
  const r: Palabra[] = []
  const agregar = (lista: Palabra[], max: number) => {
    let puestas = 0
    for (const w of lista) {
      if (r.length >= n || puestas >= max) break
      if ([...con, ...r].some((x) => parecidos(x.id, w.id))) continue
      r.push(w)
      puestas++
    }
    return puestas
  }
  const porGrupo = grupos(b, filtro)
  if (!cercania) for (const g of porGrupo) agregar(g, n)
  else {
    let parecidas = 0
    for (const g of porGrupo) {
      parecidas += agregar(g.filter(cercania.parecida), cercania.cuantas - parecidas)
      agregar(
        g.filter((w) => !cercania.parecida(w)),
        n,
      )
    }
    for (const g of porGrupo) agregar(g.filter(cercania.parecida), n)
  }
  return r
}

// Cuántas opciones lleva una ronda de elegir en este nivel (sin nivel, Medio: 3).
export const opcionesDe = (nivel?: NivelExigencia) => nivel?.maxOpciones ?? 3
