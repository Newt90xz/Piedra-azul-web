import { actividad } from '../contenido/actividades.ts'
import type { Emocion, ResultadoActividad } from '../dominio/tipos.ts'

export interface AvanceItem {
  item: string
  rondas: number
  primerIntento: number
  tasa: number
}

// RF-13: tasa de acierto al primer intento por letra, sílaba o palabra.
export function avancePorItem(resultados: ResultadoActividad[]): AvanceItem[] {
  const mapa = new Map<string, { rondas: number; primerIntento: number }>()
  for (const r of resultados) {
    // En la práctica siempre se acierta al primer intento: inflaría la tasa.
    if (actividad(r.actividadId)?.practica) continue
    for (const ronda of r.rondas) {
      if (ronda.item === 'comprension') continue
      const a = mapa.get(ronda.item) ?? { rondas: 0, primerIntento: 0 }
      a.rondas += 1
      if (ronda.intentos === 1) a.primerIntento += 1
      mapa.set(ronda.item, a)
    }
  }
  return [...mapa.entries()]
    .map(([item, a]) => ({ item, ...a, tasa: a.primerIntento / a.rondas }))
    .sort((x, y) => x.tasa - y.tasa)
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
