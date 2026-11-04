import { describe, expect, it } from 'vitest'
import { ACTIVIDADES, escuchaLaLetra } from '../contenido/actividades.ts'
import { CONTENIDOS } from '../contenido/contenidos.ts'
import { paraVoz } from './audio.ts'

const ALARGADO = /(?<!\p{L})(\p{L})\1{2,}(?!\p{L})/iu

describe('paraVoz', () => {
  it('cambia los sonidos alargados por el nombre de la letra', () => {
    expect(paraVoz('Escucha: uuuu. Ahora mmmm y SSSS.')).toBe('Escucha: u. Ahora eme y ese.')
  })

  it('no toca las palabras normales', () => {
    expect(paraVoz('¡Muy bien!   Toca la letra a.')).toBe('¡Muy bien! Toca la letra a.')
  })
})

describe('textos que dice la voz en las actividades', () => {
  const rondas = [
    ...ACTIVIDADES.flatMap((a) => a.generar()),
    ...CONTENIDOS.flatMap((c) => c.pasos.flatMap((p) => p.generar())),
    ...escuchaLaLetra(),
  ]

  it('ningún enunciado, pista ni refuerzo trae sonidos alargados como «uuuu»', () => {
    for (const r of rondas) {
      const textos = [r.instruccion, r.refuerzo, 'pista' in r ? r.pista : undefined]
      for (const t of textos) if (t) expect(t, `ronda ${r.item}`).not.toMatch(ALARGADO)
    }
  })
})
