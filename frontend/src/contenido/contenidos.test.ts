import { describe, expect, it } from 'vitest'
import { MAX_OPCIONES, type Ronda } from './actividades.ts'
import { PALABRAS, quitarTildes } from './banco.ts'
import { CONTENIDOS, UMBRAL_APROBAR, aprobo, nombreActividad, planDe } from './contenidos.ts'

// Las rondas se arman al azar desde el pool: se generan varias veces para cubrir combinaciones.
const VECES = 40

const elegir = (r: Ronda) => {
  if (r.tipo !== 'elegir') throw new Error('se esperaba una ronda de elegir')
  return r
}
const palabraDe = (id: string) => PALABRAS.find((w) => w.id === id)!

describe.each(CONTENIDOS.flatMap((c) => c.pasos.map((p, i) => ({ id: `${c.id}-${i + 1}`, generar: p.generar }))))('$id', ({ generar }) => {
  it('genera una micro-partida válida', () => {
    for (let n = 0; n < VECES; n++) {
      const rondas = generar()
      expect(rondas.length).toBeGreaterThanOrEqual(4)
      expect(rondas.length).toBeLessThanOrEqual(5)
      for (const r of rondas.map(elegir)) {
        // Mismo límite que rondas_resultado.item en la base de datos.
        expect(r.item.length).toBeGreaterThan(0)
        expect(r.item.length).toBeLessThanOrEqual(20)
        const ids = r.opciones.map((o) => o.id)
        expect(ids.length).toBeGreaterThanOrEqual(2)
        expect(ids.length).toBeLessThanOrEqual(MAX_OPCIONES)
        expect(new Set(ids).size).toBe(ids.length)
        expect(ids).toContain(r.correctaId)
        // Dos opciones con el mismo dibujo serían imposibles de distinguir.
        const emojis = r.opciones.flatMap((o) => (o.imagen ? [o.imagen.emoji] : []))
        expect(new Set(emojis).size).toBe(emojis.length)
      }
    }
  })
})

describe('una sola respuesta correcta', () => {
  it('sílabas: solo una imagen empieza con la sílaba pedida, aunque las otras compartan consonante', () => {
    for (const c of CONTENIDOS.filter((x) => x.id.startsWith('silabas-'))) {
      for (let n = 0; n < VECES; n++) {
        for (const r of c.pasos[2].generar().map(elegir)) {
          const silaba = r.item.toLowerCase()
          const empiezan = r.opciones.filter((o) => quitarTildes(o.audio).startsWith(silaba))
          expect(empiezan.map((o) => o.id)).toEqual([r.correctaId])
        }
      }
    }
  })

  it('vocales: solo una imagen empieza con la vocal pedida', () => {
    const vocales = CONTENIDOS.find((c) => c.id === 'vocales')!
    for (let n = 0; n < VECES; n++) {
      for (const r of vocales.pasos[2].generar().map(elegir)) {
        const empiezan = r.opciones.filter((o) => quitarTildes(o.audio).startsWith(r.item.toLowerCase()))
        expect(empiezan.map((o) => o.id)).toEqual([r.correctaId])
      }
    }
  })

  it('rimas: solo la correcta termina igual que la palabra del estímulo', () => {
    const rimas = CONTENIDOS.find((c) => c.id === 'rimas')!
    for (const paso of rimas.pasos) {
      for (let n = 0; n < VECES; n++) {
        for (const r of paso.generar().map(elegir)) {
          const fin = r.item.slice(1).toLowerCase()
          const riman = r.opciones.filter((o) => {
            const s = palabraDe(o.id).silabas
            return quitarTildes(s[s.length - 1]) === fin
          })
          expect(riman.map((o) => o.id)).toEqual([r.correctaId])
          expect(r.estimulo.imagen?.alt).not.toBe(palabraDe(r.correctaId).texto)
        }
      }
    }
  })

  it('largas y cortas: la correcta tiene más (o menos) sílabas que todas las demás', () => {
    const largas = CONTENIDOS.find((c) => c.id === 'largas-cortas')!
    largas.pasos.forEach((paso, i) => {
      for (let n = 0; n < VECES; n++) {
        for (const r of paso.generar().map(elegir)) {
          const largo = (id: string) => palabraDe(id).silabas.length
          const correcta = largo(r.correctaId)
          for (const o of r.opciones.filter((x) => x.id !== r.correctaId)) {
            if (i === 1) expect(correcta).toBeLessThan(largo(o.id))
            else expect(correcta).toBeGreaterThan(largo(o.id))
          }
        }
      }
    })
  })
})

describe('plan de una sala', () => {
  it('despliega cada contenido en sus 3 actividades, en orden, con ids válidos para la base', () => {
    const plan = planDe(['silabas-m', 'vocales', 'no-existe'])
    expect(plan.map((p) => p.actividadId)).toEqual(['silabas-m-1', 'silabas-m-2', 'silabas-m-3', 'vocales-1', 'vocales-2', 'vocales-3'])
    // Mismo formato que exige guardar_resultado_sala.
    for (const p of planDe(CONTENIDOS.map((c) => c.id))) expect(p.actividadId).toMatch(/^[a-z0-9-]{1,60}$/)
  })

  it('logra la actividad con el 60 % de rondas resueltas sin revelar la respuesta', () => {
    const rondas = (bien: number, total: number) => Array.from({ length: total }, (_, i) => ({ acertada: i < bien }))
    expect(UMBRAL_APROBAR).toBe(0.6)
    expect(aprobo(rondas(3, 5))).toBe(true)
    expect(aprobo(rondas(2, 5))).toBe(false)
    expect(aprobo(rondas(3, 4))).toBe(true)
    expect(aprobo([])).toBe(false)
  })

  it('nombra actividades de contenido y juegos para los reportes', () => {
    expect(nombreActividad('silabas-m-2')).toBe('Sílabas con M · Actividad 2')
    expect(nombreActividad('aplausos')).toBe('Aplausos silábicos')
    expect(nombreActividad('desconocida')).toBe('desconocida')
  })
})
