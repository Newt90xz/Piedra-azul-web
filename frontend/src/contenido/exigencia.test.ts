import { describe, expect, it } from 'vitest'
import type { Ronda } from './actividades.ts'
import { CONTENIDOS, bloquesDePlan, planDeBloques, planDeSala } from './contenidos.ts'
import { EXIGENCIAS, aprobo, masDificil, masFacil, metaDe, nivelDe, partidaConExigencia } from './exigencia.ts'
import { escuchaLaLetra } from './actividades.ts'
import { JUEGOS_CONFIGURABLES, PLANTILLAS_SISTEMA } from './plantillas.ts'

const elegir = (k: number): Ronda => ({
  tipo: 'elegir',
  item: 'x',
  instruccion: '',
  pista: '',
  estimulo: {},
  opciones: Array.from({ length: k }, (_, i) => ({ id: `${i}`, audio: '' })),
  correctaId: '0',
})

describe('dificultad por sala', () => {
  it('sin dificultad elegida, la actividad es Medio', () => {
    expect(nivelDe(undefined)).toEqual(EXIGENCIAS.intermedio)
    expect(Object.values(EXIGENCIAS).map((n) => n.nombre)).toEqual(['Fácil', 'Medio', 'Difícil'])
  })

  it('todas las partidas tienen 5 rondas (regla de oro 4: de 4 a 5)', () => {
    for (const n of Object.values(EXIGENCIAS)) expect(n.rondas).toBe(5)
  })

  it('la partida respeta las opciones y rondas del nivel', () => {
    const rondas = partidaConExigencia(() => escuchaLaLetra(), 'inicial')
    expect(rondas).toHaveLength(EXIGENCIAS.inicial.rondas)
    for (const r of rondas) if (r.tipo === 'elegir') expect(r.opciones.length).toBeLessThanOrEqual(EXIGENCIAS.inicial.maxOpciones)
  })

  it('sube y baja de a un nivel, sin pasarse', () => {
    expect(masFacil('avanzado')).toBe('intermedio')
    expect(masFacil('inicial')).toBe('inicial')
    expect(masDificil(undefined)).toBe('avanzado')
    expect(masDificil('avanzado')).toBe('avanzado')
  })

  it('la dificultad de un contenido se guarda en el plan y vuelve al editarlo', () => {
    const bloques = [{ contenido: 'silabas-m', pasos: [2, 3], exigencia: 'avanzado' as const }, { contenido: 'vocales', pasos: [1] }]
    const plan = planDeBloques(bloques)
    expect(plan).toEqual([{ juego: 'silabas-m-2', exigencia: 'avanzado' }, { juego: 'silabas-m-3', exigencia: 'avanzado' }, { juego: 'vocales-1' }])
    expect(bloquesDePlan(plan)).toEqual(bloques)
    expect(planDeSala(plan).map((p) => p.exigencia)).toEqual(['avanzado', 'avanzado', undefined])
  })
})

describe('para pasar de actividad', () => {
  it('se cuentan las rondas logradas al primer intento: 3 de 5', () => {
    const tres = [true, true, true, false, false].map((acertada) => ({ acertada }))
    expect(metaDe(Array.from({ length: 5 }, () => elegir(3)))).toBe(3)
    expect(metaDe(Array.from({ length: 5 }, () => elegir(4)))).toBe(3)
    expect(aprobo(tres, 3)).toBe(true)
    expect(aprobo(tres.slice(1), 3)).toBe(false)
    expect(aprobo([], 0)).toBe(false)
  })

  it('con solo dos opciones (sí / no) piden 4 de 5: al azar se llegaría a 3', () => {
    expect(metaDe(Array.from({ length: 5 }, () => elegir(2)))).toBe(4)
  })

  it('en las que no se adivinan (escribir, armar) basta el 60 %', () => {
    const escribir: Ronda = { tipo: 'escribir', item: 'A', respuesta: 'A', audio: 'a', letras: ['A'], instruccion: '', pista: '' }
    expect(metaDe(Array.from({ length: 5 }, () => escribir))).toBe(3)
  })

  // Un niño que toca al azar (descartando lo que ya tocó) acierta al primer
  // intento con probabilidad 1/opciones. Antes aprobaba hasta el 100 % de las veces.
  it('tocar al azar aprueba a lo más 1 de cada 4 partidas, en toda actividad y nivel', () => {
    const generadores = [
      ...CONTENIDOS.flatMap((c) => c.pasos.map((p) => ({ id: c.id, generar: (n: (typeof EXIGENCIAS)['inicial']) => p.generar({ nivel: n }) }))),
      ...JUEGOS_CONFIGURABLES.flatMap((j) => PLANTILLAS_SISTEMA.filter((p) => p.juegoId === j.id).slice(0, 2).map((p) => ({ id: j.id, generar: (n: (typeof EXIGENCIAS)['inicial']) => j.generar(p.parametros, n) }))),
    ]
    for (const { id, generar } of generadores) {
      for (const e of ['inicial', 'intermedio', 'avanzado'] as const) {
        let aprobadas = 0
        let total = 0
        for (let g = 0; g < 20; g++) {
          const rondas = partidaConExigencia(generar, e)
          const meta = metaDe(rondas)
          for (let t = 0; t < 100; t++) {
            const logradas = rondas.filter((r) => r.tipo === 'elegir' && Math.random() < 1 / r.opciones.length).length
            if (logradas >= meta) aprobadas++
            total++
          }
        }
        expect(aprobadas / total, `${id} en ${e}`).toBeLessThanOrEqual(0.3)
      }
    }
  })
})

describe('planes con actividades que ya no existen', () => {
  it('se ignoran en el editor y salen al guardar', () => {
    const plan = [{ juego: 'lexica-1' }, { juego: 'lexica-2' }, { juego: 'oraciones-3' }, { juego: 'vocales-1' }]
    expect(bloquesDePlan(plan)).toEqual([{ contenido: 'lexica', pasos: [1] }, { contenido: 'vocales', pasos: [1] }])
    expect(planDeBloques(bloquesDePlan(plan))).toEqual([{ juego: 'lexica-1' }, { juego: 'vocales-1' }])
  })
})
