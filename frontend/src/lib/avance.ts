import { CATEGORIAS, actividad, type Categoria } from '../contenido/actividades.ts'
import { categoriaDe } from '../contenido/contenidos.ts'
import type { Emocion, ResultadoActividad } from '../dominio/tipos.ts'
import { capitalizar } from './texto.ts'

export interface AvanceItem {
  item: string
  categoria: Categoria
  rondas: number
  primerIntento: number
  tasa: number
}

// RF-13: tasa de acierto al primer intento por letra, sílaba, rima o palabra.
// La categoría sale de la actividad que generó la ronda, no del texto del ítem.
export function avancePorItem(resultados: ResultadoActividad[]): AvanceItem[] {
  const mapa = new Map<string, AvanceItem>()
  for (const r of resultados) {
    // En la práctica siempre se acierta al primer intento: inflaría la tasa.
    if (actividad(r.actividadId)?.practica) continue
    // Sin categoría (cuentos, actividades desconocidas) no hay letra o sílaba que medir.
    const categoria = categoriaDe(r.actividadId)
    if (!categoria) continue
    for (const ronda of r.rondas) {
      const clave = `${categoria}|${ronda.item}`
      const a = mapa.get(clave) ?? { item: ronda.item, categoria, rondas: 0, primerIntento: 0, tasa: 0 }
      a.rondas += 1
      if (ronda.intentos === 1) a.primerIntento += 1
      a.tasa = a.primerIntento / a.rondas
      mapa.set(clave, a)
    }
  }
  return [...mapa.values()].sort((x, y) => x.tasa - y.tasa)
}

// Los ítems agrupados por categoría, en el orden de CATEGORIAS y sin grupos vacíos.
// Dentro de cada grupo se respeta el orden recibido (de más difícil a más fácil).
export function porCategoria(items: AvanceItem[]) {
  return (Object.keys(CATEGORIAS) as Categoria[])
    .map((categoria) => ({ categoria, titulo: CATEGORIAS[categoria], items: items.filter((a) => a.categoria === categoria) }))
    .filter((g) => g.items.length > 0)
}

export const UMBRAL_LE_CUESTA = 0.6

// Detalle de un ítem (palabra, sílaba o sonido) al tocarlo en el avance: qué
// respondió el niño cuando se equivocó y cómo le fue en cada ronda.
export interface DetalleItem {
  rondas: number
  primerIntento: number
  // Última respuesta equivocada de cada ronda, de la más repetida a la menos.
  errores: { respuesta: string; veces: number }[]
  // Rondas de ese ítem, de la más reciente a la más antigua.
  historial: { fecha: string; actividadId: string; estudianteId: string; intentos: number; error?: string }[]
}

// En el conteo de sílabas el error es un número: «3» se lee «3 sílabas».
export function respuestaLegible(r: string, conteo: boolean) {
  if (conteo && /^\d+$/.test(r)) return `${r} ${r === '1' ? 'sílaba' : 'sílabas'}`
  return capitalizar(r)
}

export function detalleItem(resultados: ResultadoActividad[], categoria: Categoria, item: string): DetalleItem {
  const historial: DetalleItem['historial'] = []
  for (const r of resultados) {
    if (actividad(r.actividadId)?.practica || categoriaDe(r.actividadId) !== categoria) continue
    for (const ronda of r.rondas) {
      if (ronda.item !== item) continue
      historial.push({ fecha: r.fecha, actividadId: r.actividadId, estudianteId: r.estudianteId, intentos: ronda.intentos, error: ronda.error })
    }
  }
  historial.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  const veces = new Map<string, number>()
  for (const h of historial) if (h.error) veces.set(h.error, (veces.get(h.error) ?? 0) + 1)
  return {
    rondas: historial.length,
    primerIntento: historial.filter((h) => h.intentos === 1).length,
    errores: [...veces].map(([respuesta, n]) => ({ respuesta, veces: n })).sort((a, b) => b.veces - a.veces),
    historial,
  }
}

export function inicioDia(d = new Date()) {
  const f = new Date(d)
  f.setHours(0, 0, 0, 0)
  return f
}

export function inicioSemana(d = new Date()) {
  const f = inicioDia(d)
  f.setDate(f.getDate() - ((f.getDay() + 6) % 7))
  return f
}

// Se compara como fecha y no como texto: el servidor puede devolver otro huso
// u otro formato ("+00:00" en vez de "Z").
export function deEstaSemana<T extends { fecha: string }>(filas: T[], hoy = new Date()) {
  const desde = inicioSemana(hoy)
  return filas.filter((f) => new Date(f.fecha) >= desde)
}

export const EMOCIONES: Record<Emocion, { cara: string; texto: string; color: string }> = {
  alegria: { cara: '😄', texto: 'Feliz', color: '#ffe58a' },
  calma: { cara: '😌', texto: 'Tranquilo', color: '#bfe8d2' },
  tristeza: { cara: '😢', texto: 'Triste', color: '#bcd8f5' },
  enojo: { cara: '😠', texto: 'Enojado', color: '#f6b5b5' },
}

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })

export const minutos = (ms: number) => Math.max(1, Math.round(ms / 60000))
