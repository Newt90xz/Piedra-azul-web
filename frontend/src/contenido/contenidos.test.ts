import { describe, expect, it } from 'vitest'
import { MAX_OPCIONES, ordenarSilabas, type Ronda } from './actividades.ts'
import { PALABRAS, quitarTildes, sinAcentos } from './banco.ts'
import { CONTENIDOS, contenido, nombreActividad, planDe } from './contenidos.ts'
import { EXIGENCIAS, partidaConExigencia } from './exigencia.ts'
import { TEMAS_FILTRO, parecidos } from './temas.ts'
import type { Exigencia } from '../dominio/tipos.ts'

// Las rondas se arman al azar desde el pool: se generan varias veces para cubrir combinaciones.
const VECES = 40
const NIVELES = ['inicial', 'intermedio', 'avanzado'] as const satisfies Exigencia[]

const elegir = (r: Ronda) => {
  if (r.tipo !== 'elegir') throw new Error('se esperaba una ronda de elegir')
  return r
}
const palabraDe = (id: string) => PALABRAS.find((w) => w.id === id)!
const finDe = (id: string) => {
  const s = palabraDe(id).silabas
  return sinAcentos(s[s.length - 1])
}

// 4 o 5 rondas; en las de elegir, de 2 a 4 opciones distintas que incluyen la
// correcta. El ítem, como rondas_resultado.item en la base: de 1 a 20 caracteres.
function partidaValida(rondas: Ronda[]) {
  expect(rondas.length).toBeGreaterThanOrEqual(4)
  expect(rondas.length).toBeLessThanOrEqual(5)
  for (const r of rondas) {
    expect(r.item.length).toBeGreaterThan(0)
    expect(r.item.length).toBeLessThanOrEqual(20)
  }
  for (const r of rondas.filter((x) => x.tipo === 'elegir').map(elegir)) {
    const ids = r.opciones.map((o) => o.id)
    expect(ids.length).toBeGreaterThanOrEqual(2)
    expect(ids.length).toBeLessThanOrEqual(MAX_OPCIONES)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain(r.correctaId)
    const emojis = r.opciones.flatMap((o) => (o.imagen ? [o.imagen.emoji] : []))
    expect(new Set(emojis).size).toBe(emojis.length)
    // Ni dos dibujos que se confundan (la doctora y la profesora, el melón y la sandía).
    for (const a of ids) for (const b of ids) if (a !== b) expect(parecidos(a, b), `${a} / ${b}`).toBe(false)
  }
}

const pasos = CONTENIDOS.flatMap((c) => c.pasos.map((p, i) => ({ id: `${c.id}-${i + 1}`, generar: p.generar, conTema: p.conTema })))

describe.each(pasos)('$id', ({ generar }) => {
  it('genera una micro-partida válida en cada nivel de dificultad', () => {
    for (const e of NIVELES) for (let n = 0; n < VECES / 2; n++) partidaValida(partidaConExigencia((nivel) => generar({ nivel }), e))
  })
})

// Con el tema que elige la docente: las mismas reglas, con cada tema.
describe.each(pasos.filter((p) => p.conTema))('$id con tema', ({ generar }) => {
  it('genera micro-partidas válidas con cada tema', () => {
    for (const tema of TEMAS_FILTRO) for (const e of NIVELES) for (let n = 0; n < 3; n++) partidaValida(partidaConExigencia((nivel) => generar({ tema, nivel }), e))
  })
})

describe('filtro por tema', () => {
  it('las palabras trabajadas son del tema cuando alcanzan', () => {
    const escucho = contenido('escucho')!
    for (let n = 0; n < VECES; n++) {
      for (const r of escucho.pasos[0].generar({ tema: 'animales' }).map(elegir)) expect(palabraDe(r.correctaId).tema).toBe('animales')
      // Y las otras opciones también, mientras haya.
      for (const r of escucho.pasos[0].generar({ tema: 'frutas' }).map(elegir)) for (const o of r.opciones) expect(palabraDe(o.id).tema).toBe('frutas')
    }
  })

  it('si el tema no alcanza, se completa con otras palabras', () => {
    // No hay frutas de cuatro sílabas: igual se arma la partida.
    for (let n = 0; n < VECES; n++) partidaValida(contenido('largas-cortas')!.pasos[2].generar({ tema: 'frutas' }))
  })

  it('sin tema nunca salen meses ni estaciones', () => {
    for (const c of CONTENIDOS)
      for (const p of c.pasos)
        for (let n = 0; n < 10; n++)
          for (const r of p.generar().filter((x) => x.tipo === 'elegir').map(elegir))
            for (const o of r.opciones.filter((x) => x.imagen)) expect(['meses', 'estaciones']).not.toContain(palabraDe(o.id).tema)
  })
})

describe('una sola respuesta correcta', () => {
  it('sílabas: solo una imagen empieza con la sílaba pedida, aunque las otras compartan consonante', () => {
    for (const c of CONTENIDOS.filter((x) => x.id.startsWith('silabas-'))) {
      for (const e of NIVELES) {
        for (let n = 0; n < VECES / 4; n++) {
          for (const r of c.pasos[2].generar({ nivel: EXIGENCIAS[e] }).map(elegir)) {
            const silaba = r.item.toLowerCase()
            const empiezan = r.opciones.filter((o) => quitarTildes(o.audio).startsWith(silaba))
            expect(empiezan.map((o) => o.id)).toEqual([r.correctaId])
          }
        }
      }
    }
  })

  it('vocales: solo una imagen empieza con la vocal pedida', () => {
    const vocales = contenido('vocales')!
    for (const e of NIVELES) {
      for (let n = 0; n < VECES / 2; n++) {
        for (const r of vocales.pasos[2].generar({ nivel: EXIGENCIAS[e] }).map(elegir)) {
          const empiezan = r.opciones.filter((o) => quitarTildes(o.audio).startsWith(r.item.toLowerCase()))
          expect(empiezan.map((o) => o.id)).toEqual([r.correctaId])
        }
      }
    }
  })

  it('rimas: la que termina igual es la correcta; en «¿Cuál no termina igual?», la única distinta', () => {
    const rimas = contenido('rimas')!
    for (const e of NIVELES) {
      const nivel = EXIGENCIAS[e]
      for (let n = 0; n < VECES / 2; n++) {
        for (const r of rimas.pasos[0].generar({ nivel }).map(elegir)) {
          const fin = r.item.slice(1).toLowerCase()
          expect(r.opciones.filter((o) => finDe(o.id) === fin).map((o) => o.id)).toEqual([r.correctaId])
          expect(r.estimulo.imagen?.alt).not.toBe(palabraDe(r.correctaId).texto)
        }
        for (const r of rimas.pasos[1].generar({ nivel }).map(elegir)) {
          const fin = r.item.slice(1).toLowerCase()
          expect(r.opciones.filter((o) => finDe(o.id) !== fin).map((o) => o.id)).toEqual([r.correctaId])
          expect(r.opciones.length).toBeGreaterThanOrEqual(3)
        }
        for (const r of rimas.pasos[2].generar({ nivel }).map(elegir)) {
          const [a, b] = r.estimulo.audio!.split('… ').map((t) => PALABRAS.find((w) => w.texto === t)!.id)
          expect(r.correctaId).toBe(finDe(a) === finDe(b) ? 'si' : 'no')
        }
      }
    }
  })

  it('largas y cortas: la correcta tiene más (o menos) sílabas que todas las demás', () => {
    const largas = contenido('largas-cortas')!
    largas.pasos.forEach((paso, i) => {
      for (const e of NIVELES) {
        for (let n = 0; n < VECES / 2; n++) {
          for (const r of paso.generar({ nivel: EXIGENCIAS[e] }).map(elegir)) {
            const largo = (id: string) => palabraDe(id).silabas.length
            const correcta = largo(r.correctaId)
            for (const o of r.opciones.filter((x) => x.id !== r.correctaId)) {
              if (i === 1) expect(correcta).toBeLessThan(largo(o.id))
              else expect(correcta).toBeGreaterThan(largo(o.id))
            }
          }
        }
      }
    })
  })
})

describe('dificultad: qué tan difíciles son las preguntas', () => {
  const silabasM = contenido('silabas-m')!
  const empiezaConM = (id: string) => quitarTildes(palabraDe(id).texto).startsWith('m')

  it('las opciones son las del nivel: 3 en Fácil y Medio, 4 en Difícil', () => {
    for (const e of NIVELES) {
      for (const r of silabasM.pasos[2].generar({ nivel: EXIGENCIAS[e] }).map(elegir)) expect(r.opciones).toHaveLength(EXIGENCIAS[e].maxOpciones)
    }
  })

  it('en Fácil las otras opciones no se parecen a la correcta; en Difícil sí (mano / mono / mesa)', () => {
    for (let n = 0; n < VECES; n++) {
      for (const r of silabasM.pasos[2].generar({ nivel: EXIGENCIAS.inicial }).map(elegir))
        expect(r.opciones.filter((o) => o.id !== r.correctaId).some((o) => empiezaConM(o.id))).toBe(false)
      for (const r of silabasM.pasos[2].generar({ nivel: EXIGENCIAS.avanzado }).map(elegir))
        expect(r.opciones.filter((o) => o.id !== r.correctaId).every((o) => empiezaConM(o.id))).toBe(true)
      // Sílabas: en Fácil, de otra consonante (MA / PE / LU); en Difícil, todas con M.
      for (const r of silabasM.pasos[0].generar({ nivel: EXIGENCIAS.inicial }).map(elegir)) expect(r.opciones.filter((o) => o.id[0] === 'm')).toHaveLength(1)
      for (const r of silabasM.pasos[0].generar({ nivel: EXIGENCIAS.avanzado }).map(elegir)) expect(r.opciones.every((o) => o.id[0] === 'm')).toBe(true)
    }
  })

  it('en Fácil las palabras trabajadas son cortas', () => {
    const escucho = contenido('escucho')!
    for (let n = 0; n < VECES; n++)
      for (const r of escucho.pasos[0].generar({ nivel: EXIGENCIAS.inicial }).map(elegir)) expect(palabraDe(r.correctaId).silabas.length).toBeLessThanOrEqual(2)
  })

  it('largas y cortas: en Fácil la diferencia es grande; en Difícil, de una sílaba', () => {
    const largas = contenido('largas-cortas')!
    const diferencia = (r: ReturnType<typeof elegir>) => Math.abs(palabraDe(r.opciones[0].id).silabas.length - palabraDe(r.opciones[1].id).silabas.length)
    for (let n = 0; n < VECES; n++) {
      for (const r of largas.pasos[0].generar({ nivel: EXIGENCIAS.inicial }).map(elegir)) expect(diferencia(r)).toBeGreaterThanOrEqual(2)
      for (const r of largas.pasos[0].generar({ nivel: EXIGENCIAS.avanzado }).map(elegir)) expect(diferencia(r)).toBe(1)
    }
  })
})

describe('plan de una sala', () => {
  it('despliega cada contenido en su escalera (con apoyo → decide solo → sin apoyo), con ids válidos para la base', () => {
    const plan = planDe(['silabas-m', 'vocales', 'escucho', 'no-existe'])
    // Primero con imagen; «Escucha y toca», solo de oído, al final.
    expect(plan.map((p) => p.actividadId)).toEqual(['silabas-m-2', 'silabas-m-3', 'silabas-m-1', 'vocales-2', 'vocales-3', 'vocales-1', 'escucho-1', 'escucho-3', 'escucho-2'])
    expect(planDe(['formo-palabras']).map((p) => p.actividadId)).toEqual(['formo-palabras-3', 'formo-palabras-1', 'formo-palabras-2'])
    // Mismo formato que exige guardar_resultado_sala.
    for (const p of planDe(CONTENIDOS.map((c) => c.id))) expect(p.actividadId).toMatch(/^[a-z0-9-]{1,60}$/)
  })

  it('nombra actividades de contenido y juegos para los reportes', () => {
    expect(nombreActividad('silabas-m-2')).toBe('Sílabas con M · ¿Con qué sílaba empieza?')
    expect(nombreActividad('aplausos')).toBe('Aplausos silábicos')
    expect(nombreActividad('desconocida')).toBe('desconocida')
  })
})

describe('orden de sílabas', () => {
  it('ordena las opciones por vocal, de la A a la U', () => {
    expect(ordenarSilabas(['mu', 'ma', 'mi', 'me', 'mo'])).toEqual(['ma', 'me', 'mi', 'mo', 'mu'])
  })

  it('mantiene las opciones de sílabas en orden en sus actividades', () => {
    const silabasM = contenido('silabas-m')!
    for (const paso of [silabasM.pasos[0], silabasM.pasos[1]]) {
      for (const ronda of paso.generar().map(elegir)) {
        const audios = ronda.opciones.map((opcion) => opcion.audio)
        expect(audios).toEqual(ordenarSilabas(audios))
      }
    }
  })
})

describe('refuerzo de las sílabas', () => {
  it('no reproduce una frase cuando acierta al reconocer la sílaba', () => {
    const silabasM = contenido('silabas-m')!
    for (const ronda of silabasM.pasos[0].generar()) {
      expect(ronda.refuerzo).toBeUndefined()
    }
  })
})

describe('escritura: siempre en mayúscula', () => {
  const escribo = contenido('escribo')!
  it('la respuesta va en mayúscula, sin tildes, y el teclado tiene todas sus letras', () => {
    for (const paso of escribo.pasos) {
      for (const e of NIVELES) {
        for (let n = 0; n < VECES / 4; n++) {
          for (const r of partidaConExigencia((nivel) => paso.generar({ nivel }), e)) {
            if (r.tipo !== 'escribir') throw new Error('se esperaba una ronda de escribir')
            expect(r.respuesta).toMatch(/^[A-ZÑ]+$/)
            for (const l of r.respuesta) expect(r.letras).toContain(l)
            expect(r.letras.every((l) => /^[A-ZÑ]$/.test(l))).toBe(true)
            expect(r.letras.length - new Set(r.respuesta).size).toBe(EXIGENCIAS[e].teclasExtra)
          }
        }
      }
    }
  })
})

describe('formo palabras', () => {
  const formo = contenido('formo-palabras')!
  it('los globos y las fichas traen todas las sílabas, y las que sobran según el nivel', () => {
    for (const e of NIVELES) {
      for (let n = 0; n < VECES / 4; n++) {
        for (const paso of [formo.pasos[0], formo.pasos[1]]) {
          for (const r of partidaConExigencia((nivel) => paso.generar({ nivel }), e)) {
            if (r.tipo !== 'globos' && r.tipo !== 'construir') throw new Error('se esperaba una ronda de globos o de armar')
            for (const s of r.palabra.silabas) expect(r.fichas).toContain(s)
            expect(r.fichas.length - r.palabra.silabas.length).toBe(r.tipo === 'globos' ? EXIGENCIAS[e].globosExtra : EXIGENCIAS[e].fichasExtra)
          }
        }
      }
    }
  })
})
