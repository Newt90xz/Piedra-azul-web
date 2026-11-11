import { describe, expect, it } from 'vitest'
import { JUEGOS, MAX_OPCIONES, actividad, completaLaSilaba, ordenarSilabas } from './actividades.ts'

// Las rondas se arman al azar: se generan varias veces para cubrir combinaciones.
const VECES = 30

describe.each(JUEGOS)('$id', (a) => {
  it('genera una micro-partida válida', () => {
    expect(a.objetivo.trim()).not.toBe('')
    for (let n = 0; n < VECES; n++) {
      const rondas = a.generar()
      expect(rondas.length).toBeGreaterThanOrEqual(4)
      expect(rondas.length).toBeLessThanOrEqual(5)
      for (const r of rondas) {
        // Mismo límite que rondas_resultado.item en la base de datos.
        expect(r.item.length).toBeGreaterThan(0)
        expect(r.item.length).toBeLessThanOrEqual(20)
        if (r.tipo === 'elegir') {
          const ids = r.opciones.map((o) => o.id)
          expect(ids.length).toBeLessThanOrEqual(MAX_OPCIONES)
          expect(new Set(ids).size).toBe(ids.length)
          expect(ids).toContain(r.correctaId)
        }
      }
    }
  })
})

describe('juegos del recreo', () => {
  it('son el choque de sonidos, los aplausos silábicos y los globos de palabras', () => {
    expect(JUEGOS.map((a) => a.id)).toEqual(['choque-sonidos', 'aplausos', 'globos-palabras'])
  })

  it('todos miden una categoría; solo el choque es práctica', () => {
    expect(JUEGOS.every((a) => a.categoria)).toBe(true)
    expect(JUEGOS.filter((a) => a.practica).map((a) => a.id)).toEqual(['choque-sonidos'])
  })
})

describe('actividades retiradas', () => {
  it('se siguen nombrando y clasificando para las partidas antiguas', () => {
    expect(actividad('caza-letras')).toMatchObject({ titulo: 'Caza de letras', categoria: 'letras' })
    expect(actividad('explorar-sonido')?.practica).toBe(true)
    // Los cuentos no miden avance.
    expect(actividad('cuento-tito')?.categoria).toBeUndefined()
    // No se pueden jugar.
    expect(actividad('caza-letras')?.generar).toBeUndefined()
  })
})

describe('sílabas con opciones', () => {
  it('ordena de la A a la U las opciones para completar palabras', () => {
    for (const ronda of completaLaSilaba()) {
      if (ronda.tipo !== 'elegir') throw new Error('se esperaba una ronda de elegir')
      const opciones = ronda.opciones.map((opcion) => opcion.audio)
      expect(opciones).toEqual(ordenarSilabas(opciones))
    }
  })
})
