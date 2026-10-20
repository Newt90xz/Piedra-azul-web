import { describe, expect, it } from 'vitest'
import type { ResultadoActividad } from '../dominio/tipos.ts'
import { avancePorItem, deEstaSemana, inicioSemana } from './avance.ts'

const resultado = (actividadId: string, rondas: [item: string, intentos: number][]): ResultadoActividad => ({
  id: crypto.randomUUID(),
  estudianteId: 'e1',
  actividadId,
  fecha: '2026-10-20T12:00:00Z',
  duracionMs: 60_000,
  estrellas: 3,
  monedas: 10,
  rondas: rondas.map(([item, intentos]) => ({ item, intentos, acertada: intentos < 3 })),
})

describe('avancePorItem', () => {
  it('calcula la tasa al primer intento y ordena de más difícil a más fácil', () => {
    const items = avancePorItem([resultado('caza-letras', [['P', 2], ['P', 1], ['M', 1]])])
    expect(items).toEqual([
      { item: 'P', rondas: 2, primerIntento: 1, tasa: 0.5 },
      { item: 'M', rondas: 1, primerIntento: 1, tasa: 1 },
    ])
  })

  it('ignora la práctica, donde siempre se acierta al primer intento', () => {
    const items = avancePorItem([
      resultado('caza-letras', [['P', 2]]),
      resultado('explorar-sonido', [['P', 1], ['P', 1], ['P', 1]]),
      resultado('choque-sonidos', [['PA', 1]]),
    ])
    expect(items).toEqual([{ item: 'P', rondas: 1, primerIntento: 0, tasa: 0 }])
  })

  it('ignora las preguntas de comprensión del cuento', () => {
    expect(avancePorItem([resultado('cuento-tito', [['comprension', 1]])])).toEqual([])
  })
})

describe('deEstaSemana', () => {
  const miercoles = new Date(2026, 9, 21, 15)

  it('la semana parte el lunes a medianoche, también si hoy es domingo', () => {
    const lunes = inicioSemana(miercoles)
    expect([lunes.getDay(), lunes.getDate(), lunes.getHours()]).toEqual([1, 19, 0])
    expect(inicioSemana(new Date(2026, 9, 25, 20)).getTime()).toBe(lunes.getTime())
  })

  it('compara como fecha aunque el servidor no use el formato de toISOString', () => {
    const lunes = inicioSemana(miercoles)
    // PostgREST devuelve "+00:00" y no "Z": como texto quedaba antes del lunes.
    const justoElLunes = { fecha: lunes.toISOString().replace('.000Z', '+00:00') }
    const domingoAnterior = { fecha: new Date(lunes.getTime() - 1000).toISOString() }
    expect(deEstaSemana([justoElLunes, domingoAnterior], miercoles)).toEqual([justoElLunes])
  })
})
