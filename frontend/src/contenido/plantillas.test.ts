import { describe, expect, it } from 'vitest'
import type { Ronda } from './actividades.ts'
import { actividad } from './actividades.ts'
import { ALFABETO, PALABRAS, aplicarBanco } from './banco.ts'
import { bloquesDePlan, categoriaDe, contenidosDePlan, nombreActividad, pasosDeContenidos, planDe, planDeBloques, planDeSala } from './contenidos.ts'
import { PLANTILLAS_SISTEMA, juegoConfigurable, letrasDe } from './plantillas.ts'

const juego = juegoConfigurable('escucha-letra')!
const elegir = (r: Ronda) => {
  if (r.tipo !== 'elegir') throw new Error('Se esperaba una ronda de elegir')
  return r
}
const sonidoDe = (id: string) => ALFABETO.find((l) => l.id === id)!.sonido

const migraciones = Object.values(import.meta.glob<string>('../../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true })).join('\n')

describe('alfabeto', () => {
  it('tiene las 27 letras, una vez cada una', () => {
    expect(ALFABETO).toHaveLength(27)
    expect(new Set(ALFABETO.map((l) => l.id)).size).toBe(27)
    expect(ALFABETO.map((l) => l.grafema)).toContain('Ñ')
  })
})

describe('Escucha y toca la letra', () => {
  it('solo usa las letras elegidas', () => {
    for (let i = 0; i < 50; i++) {
      for (const r of juego.generar({ letras: ['m', 'p', 's'] }).map(elegir)) {
        expect(['m', 'p', 's']).toContain(r.correctaId)
        for (const o of r.opciones) expect(['m', 'p', 's']).toContain(o.id)
      }
    }
  })

  it('da una partida completa aunque haya pocas letras', () => {
    expect(juego.generar({ letras: ['a', 'm'] })).toHaveLength(5)
  })

  it('cada ronda incluye la correcta, sin más de 4 opciones ni repetidas', () => {
    for (let i = 0; i < 100; i++) {
      for (const r of juego.generar({ letras: ALFABETO.map((l) => l.id) }).map(elegir)) {
        const ids = r.opciones.map((o) => o.id)
        expect(ids).toContain(r.correctaId)
        expect(new Set(ids).size).toBe(ids.length)
        expect(ids.length).toBeLessThanOrEqual(4)
      }
    }
  })

  it('nunca pone juntas dos letras que suenan igual', () => {
    for (let i = 0; i < 200; i++) {
      for (const r of juego.generar({ letras: ['b', 'v', 'c', 'k', 'q', 's', 'z', 'm'] }).map(elegir)) {
        const sonidos = r.opciones.map((o) => sonidoDe(o.id))
        expect(new Set(sonidos).size).toBe(sonidos.length)
      }
    }
  })

  it('no acepta configuraciones que no se pueden jugar', () => {
    expect(juego.validar({ letras: [] })).toBeTruthy()
    expect(juego.validar({ letras: ['m'] })).toBeTruthy()
    expect(juego.validar({ letras: ['b', 'v'] })).toMatch(/suenan igual/)
    expect(juego.validar({ letras: ['b', 'v', 'a'] })).toBeNull()
  })

  it('las plantillas del sistema se pueden jugar', () => {
    for (const p of PLANTILLAS_SISTEMA) {
      expect(juegoConfigurable(p.juegoId)!.validar(p.parametros), p.nombre).toBeNull()
      expect(letrasDe(p.parametros).length).toBeGreaterThan(1)
    }
  })

  it('aparece en los reportes con su nombre y categoría', () => {
    expect(actividad('escucha-letra')?.juego).toBeFalsy()
    expect(nombreActividad('escucha-letra')).toBe('Escucha y toca la letra')
    expect(categoriaDe('escucha-letra')).toBe('letras')
  })
})

describe('plan por pasos', () => {
  const conLetras = { juego: 'escucha-letra', parametros: { letras: ['m', 'p'] }, titulo: 'Mis letras' }

  it('los contenidos existentes siguen igual que antes', () => {
    const viejo = planDe(['vocales', 'silabas-m'])
    const nuevo = planDeSala(pasosDeContenidos(['vocales', 'silabas-m']))
    expect(nuevo.map((p) => p.actividadId)).toEqual(viejo.map((p) => p.actividadId))
    expect(nuevo.map((p) => p.actividadId).slice(0, 3)).toEqual(['vocales-1', 'vocales-2', 'vocales-3'])
  })

  it('mezcla contenidos y actividades configurables en orden', () => {
    const plan = planDeSala([...pasosDeContenidos(['vocales']), conLetras])
    expect(plan.map((p) => p.actividadId)).toEqual(['vocales-1', 'vocales-2', 'vocales-3', 'escucha-letra'])
    expect(plan[3].contenido.titulo).toBe('Mis letras')
    expect(plan[3].parametros).toEqual({ letras: ['m', 'p'] })
  })

  it('cada paso tiene su clave aunque se repita la actividad', () => {
    const plan = planDeSala([conLetras, conLetras])
    expect(new Set(plan.map((p) => p.clave)).size).toBe(2)
    expect(plan[0].contenido.id).not.toBe(plan[1].contenido.id)
  })

  it('se puede editar por bloques sin perder nada', () => {
    const pasos = [...pasosDeContenidos(['silabas-m']), conLetras, ...pasosDeContenidos(['vocales'])]
    const bloques = bloquesDePlan(pasos)
    expect(bloques).toHaveLength(3)
    expect(planDeBloques(bloques)).toEqual(pasos)
    expect(contenidosDePlan(pasos)).toEqual(['silabas-m', 'vocales'])
  })
})

describe('banco de la base', () => {
  it('la semilla incluye todo el banco del código', () => {
    for (const w of PALABRAS) expect(migraciones, w.id).toContain(`('${w.id}', '${w.texto}',`)
    for (const l of ALFABETO) expect(migraciones, l.id).toContain(`('${l.id}', '${l.grafema}', '${l.fonema}', '${l.sonido}',`)
  })

  it('agrega palabras nuevas, cambia las existentes e ignora lo inválido', () => {
    const pato = PALABRAS.find((w) => w.id === 'pato')!
    const copia = { ...pato, imagen: { ...pato.imagen } }
    const antes = PALABRAS.length
    aplicarBanco({
      palabras: [
        { id: 'prueba', texto: 'prueba', silabas: ['prue', 'ba'], emoji: '🧪' },
        { id: 'pato', texto: 'pato', silabas: ['pa', 'to'], emoji: '🦆', fotoUrl: 'https://x/pato.jpg' },
        { id: 'mala', texto: 'mala', silabas: [], emoji: '❌' },
      ],
      letras: [{ id: 'm', fonema: 'mmmmm' }, { id: 'no-existe', fonema: 'x' }],
    })
    expect(PALABRAS).toHaveLength(antes + 1)
    expect(PALABRAS.find((w) => w.id === 'prueba')?.silabas).toEqual(['prue', 'ba'])
    expect(PALABRAS.find((w) => w.id === 'pato')?.imagen.fotoUrl).toBe('https://x/pato.jpg')
    expect(PALABRAS.some((w) => w.id === 'mala')).toBe(false)
    expect(ALFABETO.find((l) => l.id === 'm')?.fonema).toBe('mmmmm')
    // Se deja el banco como estaba para las demás pruebas.
    PALABRAS.splice(PALABRAS.findIndex((w) => w.id === 'prueba'), 1)
    Object.assign(PALABRAS.find((w) => w.id === 'pato')!, copia)
    aplicarBanco({ palabras: [], letras: [{ id: 'm', fonema: 'mmmm' }] })
  })
})
