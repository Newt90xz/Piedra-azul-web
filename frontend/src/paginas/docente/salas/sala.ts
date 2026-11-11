import { bloquesDePlan, contenido, type BloquePlan } from '../../../contenido/contenidos.ts'
import { juegoConfigurable } from '../../../contenido/plantillas.ts'
import type { Exigencia, Sala, TipoSala } from '../../../dominio/tipos.ts'
import { RECREO } from '../../../lib/clase.ts'

export const TIPOS: Record<TipoSala, { nombre: string; ayuda: string }> = {
  trabajo: { nombre: 'Actividades', ayuda: 'Siguen un plan de contenidos, en orden.' },
  recreo: { nombre: 'Recreo', ayuda: 'Parque, dibujo, globos o juegos libres.' },
}

// Qué se hace en una sala, en una línea: los contenidos del plan o el recreo.
export function queHacen(s: Sala) {
  if (s.tipo === 'recreo') return RECREO[s.actividad].nombre
  const titulos = bloquesDePlan(s.plan).map((b) =>
    'contenido' in b ? (contenido(b.contenido)?.titulo ?? b.contenido) : (b.paso.titulo ?? juegoConfigurable(b.paso.juego)?.titulo ?? b.paso.juego),
  )
  return titulos.length ? titulos.join(', ') : undefined
}

// Cómo se muestra un bloque del plan: un contenido (con sus actividades) o una
// actividad configurable (con lo elegido, «M, P, S»).
export function datosBloque(b: BloquePlan) {
  if ('contenido' in b) {
    const c = contenido(b.contenido)
    return { titulo: c?.titulo ?? b.contenido, icono: c?.icono ?? '❔', color: c?.color ?? 'var(--color-lienzo)', detalle: `${b.pasos.length} ${b.pasos.length === 1 ? 'actividad' : 'actividades'}` }
  }
  const j = juegoConfigurable(b.paso.juego)
  return {
    titulo: b.paso.titulo ?? j?.titulo ?? b.paso.juego,
    icono: j?.icono ?? '❔',
    color: j?.color ?? 'var(--color-lienzo)',
    detalle: j?.resumen(b.paso.parametros ?? j.porDefecto) ?? '',
  }
}

// Dificultad de un bloque en esta sala (intermedia si no se elige otra).
export const exigenciaDe = (b: BloquePlan) => ('paso' in b ? b.paso.exigencia : b.exigencia)
export const conExigencia = (b: BloquePlan, exigencia?: Exigencia): BloquePlan => ('paso' in b ? { paso: { ...b.paso, exigencia } } : { ...b, exigencia })
