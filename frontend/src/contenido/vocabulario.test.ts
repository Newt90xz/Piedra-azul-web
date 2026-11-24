import { describe, expect, it } from 'vitest'
import type { Ronda } from './actividades.ts'
import { PALABRAS } from './banco.ts'
import { categoriaDe, nombreActividad } from './contenidos.ts'
import { EXIGENCIAS, nivelDe, partidaConExigencia } from './exigencia.ts'
import { juegoConfigurable } from './plantillas.ts'
import { TEMAS, contrastables, parecidos, type Tema } from './temas.ts'
import { RONDAS_VOCABULARIO, cualEs, cualNoVa, temasPreguntables } from './vocabulario.ts'

const VECES = 30
const temaDe = (id: string) => PALABRAS.find((w) => w.id === id)!.tema!
const elegir = (r: Ronda) => {
  if (r.tipo !== 'elegir') throw new Error('Se esperaba una ronda de elegir')
  return r
}
// La pregunta lleva el tema: «¿Cuál es una fruta?».
const temaPreguntado = (r: Ronda) => temasPreguntables().find((t) => r.instruccion.endsWith(` ${TEMAS[t].uno}?`))!

function opcionesValidas(r: ReturnType<typeof elegir>) {
  const ids = r.opciones.map((o) => o.id)
  expect(new Set(ids).size).toBe(ids.length)
  expect(ids).toContain(r.correctaId)
  expect(r.item.length).toBeGreaterThan(0)
  expect(r.item.length).toBeLessThanOrEqual(20)
  const emojis = r.opciones.map((o) => o.imagen!.emoji)
  expect(new Set(emojis).size).toBe(emojis.length)
}

describe.each(temasPreguntables())('vocabulario: %s', (tema: Tema) => {
  it('«¿Cuál es…?»: una sola opción del tema; las otras, de temas que no se confunden', () => {
    for (let n = 0; n < VECES; n++) {
      const nivel = EXIGENCIAS[n % 2 ? 'avanzado' : 'intermedio']
      const rondas = cualEs([tema], nivel).map(elegir)
      expect(rondas).toHaveLength(RONDAS_VOCABULARIO)
      for (const r of rondas) {
        opcionesValidas(r)
        expect(r.opciones).toHaveLength(nivel.maxOpciones)
        expect(temaDe(r.correctaId)).toBe(tema)
        for (const o of r.opciones.filter((x) => x.id !== r.correctaId)) {
          expect(contrastables(tema, temaDe(o.id)), `${tema} / ${o.id}`).toBe(true)
          expect(parecidos(o.id, r.correctaId)).toBe(false)
        }
      }
    }
  })

  it('«¿Cuál no va?»: dos o tres del tema (según el nivel) y la que no va, de un tema que no se confunde', () => {
    for (let n = 0; n < VECES; n++) {
      const nivel = EXIGENCIAS[n % 2 ? 'avanzado' : 'intermedio']
      for (const r of cualNoVa([tema], nivel).map(elegir)) {
        opcionesValidas(r)
        expect(r.item).toBe(TEMAS[tema].nombre)
        const delTema = r.opciones.filter((o) => temaDe(o.id) === tema)
        // Las del nivel, o menos (nunca menos de dos) si el tema no tiene tantos
        // dibujos que no se confundan (ropa: el zapato y la bota).
        expect(delTema.length).toBeLessThanOrEqual(nivel.maxOpciones - 1)
        expect(delTema.length).toBeGreaterThanOrEqual(2)
        for (const a of delTema) for (const b of delTema) if (a !== b) expect(parecidos(a.id, b.id), `${a.id} / ${b.id}`).toBe(false)
        expect(r.opciones.filter((o) => temaDe(o.id) !== tema).map((o) => o.id)).toEqual([r.correctaId])
        expect(contrastables(tema, temaDe(r.correctaId))).toBe(true)
      }
    }
  })
})

describe('actividades de vocabulario', () => {
  it('con varios temas se turnan', () => {
    const rondas = cualEs(['frutas', 'oficios']).map(elegir)
    const temas = rondas.map((r) => temaDe(r.correctaId))
    expect(new Set(temas)).toEqual(new Set(['frutas', 'oficios']))
    for (let i = 1; i < temas.length; i++) expect(temas[i]).not.toBe(temas[i - 1])
    for (const r of rondas) expect(temaDe(r.correctaId)).toBe(temaPreguntado(r))
  })

  it('en la dificultad más baja «¿Cuál no va?» deja al menos dos del tema y la que no va', () => {
    for (let n = 0; n < VECES; n++) {
      const rondas = partidaConExigencia((nivel) => cualNoVa(['frutas'], nivel), 'inicial').map(elegir)
      expect(rondas).toHaveLength(EXIGENCIAS.inicial.rondas)
      for (const r of rondas) {
        expect(r.opciones).toHaveLength(3)
        expect(r.opciones.map((o) => o.id)).toContain(r.correctaId)
      }
    }
    // Y alcanza sus rondas aunque el ítem sea siempre el tema.
    expect(partidaConExigencia((nivel) => cualNoVa(['frutas'], nivel), 'avanzado')).toHaveLength(EXIGENCIAS.avanzado.rondas)
    expect(nivelDe('avanzado').rondas).toBe(RONDAS_VOCABULARIO)
  })

  it('no acepta configuraciones que no se pueden jugar', () => {
    const juego = juegoConfigurable('cual-es')!
    expect(juego.validar({ temas: [] })).toBeTruthy()
    expect(juego.validar({ temas: ['personajes'] })).toBeTruthy()
    expect(juego.validar({ temas: ['casa'] })).toBeTruthy()
    expect(juego.validar({ temas: ['frutas', 'meses'] })).toBeNull()
    expect(cualEs(['personajes'])).toEqual([])
  })

  it('aparecen en los reportes como vocabulario', () => {
    expect(categoriaDe('cual-es')).toBe('vocabulario')
    expect(categoriaDe('cual-no-va')).toBe('vocabulario')
    expect(nombreActividad('cual-no-va')).toBe('Encuentra el que no va')
  })
})
