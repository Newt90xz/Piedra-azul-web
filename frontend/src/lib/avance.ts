import { CATEGORIAS, actividad, type Categoria } from '../contenido/actividades.ts'
import { categoriaDe } from '../contenido/contenidos.ts'
import type { Emocion, ResultadoActividad } from '../dominio/tipos.ts'

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
