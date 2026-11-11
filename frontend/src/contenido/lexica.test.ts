import { describe, expect, it } from 'vitest'
import type { Tarjeta } from './actividades.ts'
import { PALABRAS } from './banco.ts'
import { contenido, planDe } from './contenidos.ts'
import { partidaConExigencia } from './exigencia.ts'
import { TARJETAS, palabrasDelDibujo } from './lexica.ts'

const veces = <T,>(n: number, f: () => T) => Array.from({ length: n }, f)
const tarjetasDe = (generar: typeof palabrasDelDibujo): Tarjeta[][] =>
  veces(40, generar)
    .flat()
    .map((r) => {
      if (r.tipo !== 'marcar') throw new Error('tipo')
      return r.tarjetas
    })
const nombreDe = (t: Tarjeta) => PALABRAS.find((w) => w.imagen === t.imagen)?.texto

describe('conciencia léxica: marcar lo que corresponde', () => {
  it('el contenido trae solo las palabras del dibujo', () => {
    expect(contenido('lexica')?.pasos.map((p) => p.titulo)).toEqual(['Marca las palabras del dibujo'])
    expect(planDe(['lexica']).map((p) => p.actividadId)).toEqual(['lexica-1'])
  })

  it('cada pantalla tiene tarjetas que corresponden y otras que no', () => {
    for (const tarjetas of tarjetasDe(palabrasDelDibujo)) {
      expect(tarjetas).toHaveLength(TARJETAS)
      expect(tarjetas.filter((t) => t.corresponde).length).toBeGreaterThanOrEqual(2)
      expect(tarjetas.filter((t) => !t.corresponde).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('palabras: la palabra corresponde si y solo si es la del dibujo', () => {
    for (const t of tarjetasDe(palabrasDelDibujo).flat()) expect(t.audio === nombreDe(t), `${t.audio} / ${nombreDe(t)}`).toBe(t.corresponde)
  })

  it('en nivel inicial quedan 4 tarjetas, con al menos una de cada', () => {
    for (const r of partidaConExigencia(palabrasDelDibujo, 'inicial')) {
      if (r.tipo !== 'marcar') throw new Error('tipo')
      expect(r.tarjetas).toHaveLength(4)
      expect(r.tarjetas.some((t) => t.corresponde)).toBe(true)
      expect(r.tarjetas.some((t) => !t.corresponde)).toBe(true)
    }
  })
})
