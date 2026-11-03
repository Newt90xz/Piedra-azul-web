import { describe, expect, it } from 'vitest'
import { DECORADO, JUEGOS_PARQUE, LIMITES, escalaEn, juegoEn, puestoLibre, rutaEntre } from './parque.ts'

const pisa = (p: { x: number; y: number }) =>
  [...DECORADO, ...JUEGOS_PARQUE].some((o) => o.pie && p.x > o.x - o.pie[0] / 2 + 0.6 && p.x < o.x + o.pie[0] / 2 - 0.6 && p.y > o.y - o.pie[1] + 0.6 && p.y < o.y - 0.6)

function camino(a: { x: number; y: number }, ruta: { x: number; y: number }[]) {
  const puntos = []
  let desde = a
  for (const b of ruta) {
    for (let k = 0; k <= 20; k++) puntos.push({ x: desde.x + ((b.x - desde.x) * k) / 20, y: desde.y + ((b.y - desde.y) * k) / 20 })
    desde = b
  }
  return puntos
}

describe('mapa del parque', () => {
  it('lo lejano se ve más chico que lo cercano', () => {
    expect(escalaEn(LIMITES.yMin)).toBeLessThan(escalaEn(LIMITES.yMax))
  })

  it('una ruta sin nada al medio va directo', () => {
    expect(rutaEntre({ x: 40, y: 90 }, { x: 60, y: 90 })).toEqual([{ x: 60, y: 90 }])
  })

  it('rodea lo que hay al medio', () => {
    const a = { x: 49, y: 50 }
    const b = { x: 49, y: 66 }
    const ruta = rutaEntre(a, b)
    expect(ruta.length).toBeGreaterThan(1)
    expect(ruta.at(-1)).toEqual(b)
    expect(camino(a, ruta).some(pisa)).toBe(false)
  })

  it('se puede llegar a todos los puestos de todos los juegos', () => {
    for (const j of JUEGOS_PARQUE) {
      for (const p of j.puestos) {
        expect(rutaEntre({ x: 50, y: 88 }, p).at(-1), j.id).toEqual(p)
        expect(juegoEn(p)?.tipo, j.id).toBe(j.id)
      }
    }
  })

  it('elige un puesto libre', () => {
    const columpio = JUEGOS_PARQUE.find((j) => j.id === 'columpio')!
    expect(puestoLibre(columpio, [columpio.puestos[0]])).toEqual(columpio.puestos[1])
  })
})
