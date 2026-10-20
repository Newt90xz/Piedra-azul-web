import { describe, expect, it } from 'vitest'
import { ACTIVIDADES, CANCION_RATON, MAX_OPCIONES, actividad } from './actividades.ts'
import { quitarTildes } from './banco.ts'

// Las rondas se arman al azar: se generan varias veces para cubrir combinaciones.
const VECES = 30

describe.each(ACTIVIDADES.filter((a) => a.id !== CANCION_RATON.id))('$id', (a) => {
  it('genera una micro-partida válida', () => {
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
        if (r.tipo === 'construir') {
          expect(r.fichas.length).toBeLessThanOrEqual(MAX_OPCIONES)
          expect(r.fichas).toEqual(expect.arrayContaining(r.palabra.silabas))
        }
      }
    }
  })
})

describe('sonido-inicial', () => {
  it('solo una imagen empieza con el sonido pedido', () => {
    for (let n = 0; n < VECES; n++) {
      for (const r of actividad('sonido-inicial')!.generar()) {
        if (r.tipo !== 'elegir') throw new Error('se esperaba una ronda de elegir')
        const empiezan = r.opciones.filter((o) => quitarTildes(o.audio).startsWith(r.item.toLowerCase()))
        expect(empiezan.map((o) => o.id)).toEqual([r.correctaId])
      }
    }
  })
})

describe('práctica', () => {
  it('solo explorar y choque son práctica: el resto mide avance', () => {
    expect(ACTIVIDADES.filter((a) => a.practica).map((a) => a.id)).toEqual(['explorar-sonido', 'choque-sonidos'])
  })
})
