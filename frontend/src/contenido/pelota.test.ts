import { describe, expect, it } from 'vitest'
import { INICIO_PELOTA, LIMITES, libre } from './parque.ts'
import { moverPelota, pelotaEn, quieta, type Pelota, type Pie } from './pelota.ts'

const simular = (b: Pelota, segundos: number, pies: (t: number) => Pie[] = () => []) => {
  const dt = 1 / 60
  for (let t = 0; t < segundos; t += dt) b = moverPelota(b, pies(t), dt)
  return b
}

describe('pelota', () => {
  it('sin nadie cerca no se mueve', () => {
    const b = simular(pelotaEn(INICIO_PELOTA), 1)
    expect(b.x).toBe(INICIO_PELOTA.x)
    expect(b.y).toBe(INICIO_PELOTA.y)
    expect(quieta(b)).toBe(true)
  })

  it('un niño que pasa caminando la patea hacia donde va, y bota', () => {
    const b = simular(pelotaEn(INICIO_PELOTA), 3, (t) => {
      const x = INICIO_PELOTA.x - 6 + 12 * t
      return [{ x, y: INICIO_PELOTA.y, vx: 12, vy: 0 }]
    })
    expect(b.x).toBeGreaterThan(INICIO_PELOTA.x + 5)
    const golpe = moverPelota(pelotaEn(INICIO_PELOTA), [{ x: INICIO_PELOTA.x - 1, y: INICIO_PELOTA.y, vx: 12, vy: 0 }], 1 / 60)
    expect(golpe.vx).toBeGreaterThan(12)
    expect(golpe.vAlto).toBeGreaterThan(0)
  })

  it('el pasto la frena hasta dejarla quieta', () => {
    const b = simular({ ...pelotaEn(INICIO_PELOTA), vx: 20 }, 8)
    expect(quieta(b)).toBe(true)
  })

  it('rebota en el borde del parque y no sale', () => {
    const b = simular({ ...pelotaEn({ x: 90, y: 85 }), vx: 40 }, 0.5)
    expect(b.x).toBeLessThanOrEqual(LIMITES.xMax)
    expect(b.vx).toBeLessThan(0)
  })

  it('no se mete en los juegos: rebota en ellos', () => {
    // Rodando hacia el arenero.
    let b: Pelota = { ...pelotaEn({ x: 32, y: 78 }), vx: -30 }
    for (let k = 0; k < 120; k++) {
      b = moverPelota(b, [], 1 / 60)
      expect(libre(b.x, b.y)).toBe(true)
    }
    expect(b.x).toBeGreaterThan(24)
  })
})
