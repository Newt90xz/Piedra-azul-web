import type { Exigencia } from '../dominio/tipos.ts'
import { mezclar, type Ronda } from './actividades.ts'

// Desafíos por nivel de exigencia: la docente elige uno por niño (Perfil y
// apoyos) y todas sus actividades se ajustan solas. La actividad es la misma;
// cambian las ayudas y lo que hay que lograr para pasar.

export interface NivelExigencia {
  nombre: string
  descripcion: string
  // Opciones por ronda en las de elegir (la correcta siempre queda).
  maxOpciones: number
  // Teclas extra en las de escribir y globos que no van, además de las de la respuesta.
  teclasExtra: number
  globosExtra: number
  rondas: number
  // Fracción de rondas resueltas sin revelar la respuesta para pasar de actividad.
  umbral: number
  // Errores tras los que se ilumina la respuesta correcta.
  revelarTras: number
}

export const EXIGENCIAS: Record<Exigencia, NivelExigencia> = {
  inicial: {
    nombre: 'Inicial',
    descripcion: '2 opciones, 4 rondas, la respuesta se ilumina tras 1 error; pasa con 50 %.',
    maxOpciones: 2,
    teclasExtra: 1,
    globosExtra: 0,
    rondas: 4,
    umbral: 0.5,
    revelarTras: 1,
  },
  intermedio: {
    nombre: 'Intermedio',
    descripcion: 'Hasta 4 opciones, 5 rondas, se ilumina tras 2 errores; pasa con 60 %.',
    maxOpciones: 4,
    teclasExtra: 3,
    globosExtra: 1,
    rondas: 5,
    umbral: 0.6,
    revelarTras: 2,
  },
  avanzado: {
    nombre: 'Avanzado',
    descripcion: 'Hasta 4 opciones, 6 rondas, se ilumina tras 3 errores; pasa con 80 %.',
    maxOpciones: 4,
    teclasExtra: 6,
    globosExtra: 2,
    rondas: 6,
    umbral: 0.8,
    revelarTras: 3,
  },
}

export const nivelDe = (e: Exigencia | undefined) => EXIGENCIAS[e ?? 'intermedio'] ?? EXIGENCIAS.intermedio

const ALFABETO = [...'ABCDEFGHIJLMNÑOPRSTUVZ']

// Ajusta una ronda al nivel: menos opciones, teclas o globos que sobran.
function ajustarRonda(r: Ronda, n: NivelExigencia): Ronda {
  switch (r.tipo) {
    case 'elegir': {
      if (r.opciones.length <= n.maxOpciones) return r
      const otras = mezclar(r.opciones.filter((o) => o.id !== r.correctaId)).slice(0, n.maxOpciones - 1)
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
    case 'globos': {
      const propias = r.palabra.silabas
      const sobran = r.fichas.filter((f) => !propias.includes(f)).slice(0, n.globosExtra)
      return { ...r, fichas: mezclar([...propias, ...sobran]) }
    }
    default:
      return r
  }
}

// Arma la partida al nivel del niño: ajusta cada ronda y completa (o recorta)
// hasta el número de rondas del nivel sin repetir lo trabajado.
export function partidaConExigencia(generar: () => Ronda[], e: Exigencia | undefined): Ronda[] {
  const n = nivelDe(e)
  const rondas = generar()
  for (let intento = 0; rondas.length < n.rondas && intento < 4; intento++) {
    const vistos = new Set(rondas.map((r) => r.item))
    rondas.push(...generar().filter((r) => !vistos.has(r.item)))
  }
  // Si el pool no da para más (p. ej. las 5 vocales), la partida queda con las que hay.
  return rondas.slice(0, n.rondas).map((r) => ajustarRonda(r, n))
}
