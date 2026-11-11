import { describe, expect, it } from 'vitest'
import { bloquesDePlan, planDeBloques, planDeSala } from './contenidos.ts'
import { EXIGENCIAS, nivelDe, partidaConExigencia } from './exigencia.ts'
import { escuchaLaLetra } from './actividades.ts'

describe('dificultad por sala', () => {
  it('sin dificultad elegida, la actividad es intermedia', () => {
    expect(nivelDe(undefined)).toEqual(EXIGENCIAS.intermedio)
  })

  it('la partida respeta las opciones y rondas del nivel', () => {
    const rondas = partidaConExigencia(() => escuchaLaLetra(), 'inicial')
    expect(rondas).toHaveLength(EXIGENCIAS.inicial.rondas)
    for (const r of rondas) if (r.tipo === 'elegir') expect(r.opciones.length).toBeLessThanOrEqual(EXIGENCIAS.inicial.maxOpciones)
  })

  it('la dificultad de un contenido se guarda en el plan y vuelve al editarlo', () => {
    const bloques = [{ contenido: 'silabas-m', pasos: [2, 3], exigencia: 'avanzado' as const }, { contenido: 'vocales', pasos: [1] }]
    const plan = planDeBloques(bloques)
    expect(plan).toEqual([{ juego: 'silabas-m-2', exigencia: 'avanzado' }, { juego: 'silabas-m-3', exigencia: 'avanzado' }, { juego: 'vocales-1' }])
    expect(bloquesDePlan(plan)).toEqual(bloques)
    expect(planDeSala(plan).map((p) => p.exigencia)).toEqual(['avanzado', 'avanzado', undefined])
  })
})

describe('planes con actividades que ya no existen', () => {
  it('se ignoran en el editor y salen al guardar', () => {
    const plan = [{ juego: 'lexica-1' }, { juego: 'lexica-2' }, { juego: 'oraciones-3' }, { juego: 'vocales-1' }]
    expect(bloquesDePlan(plan)).toEqual([{ contenido: 'lexica', pasos: [1] }, { contenido: 'vocales', pasos: [1] }])
    expect(planDeBloques(bloquesDePlan(plan))).toEqual([{ juego: 'lexica-1' }, { juego: 'vocales-1' }])
  })
})
