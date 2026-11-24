import { describe, expect, it } from 'vitest'
import type { Ronda } from './actividades.ts'
import { AREAS, CONTENIDOS, ETAPAS, bloqueContenido, contenido, ordenSugerido, type BloquePlan } from './contenidos.ts'
import { estacionDe } from './estaciones.ts'
import { EXIGENCIAS } from './exigencia.ts'
import { ORACIONES, cuentaLasPalabras, escuchaYCuenta, laPalabraQueFalta, oracion } from './lexica.ts'
import { marcaLaCategoria } from './vocabulario.ts'
import { TEMAS } from './temas.ts'
import { PALABRAS } from './banco.ts'

const oraciones = (r: Ronda) => {
  if (r.tipo !== 'oracion') throw new Error(`se esperaba una oración y llegó ${r.tipo}`)
  return r
}

describe('conciencia léxica: las oraciones están formadas por palabras', () => {
  it('cada palabra entre llaves es del banco y lleva su dibujo', () => {
    for (const plantilla of ORACIONES) {
      const o = oracion(plantilla)
      expect(o.palabras.length).toBeGreaterThanOrEqual(2)
      expect(o.palabras.length).toBeLessThanOrEqual(5)
      o.ids.forEach((id, i) => expect(Boolean(o.palabras[i].imagen)).toBe(Boolean(id)))
      expect(o.texto[0]).toBe(o.texto[0].toUpperCase())
    }
  })

  it('contar: la respuesta es el número de palabras, entre las opciones, y en Fácil las oraciones son cortas', () => {
    for (const nivel of Object.values(EXIGENCIAS)) {
      for (let n = 0; n < 30; n++) {
        for (const r of [...cuentaLasPalabras({ nivel }), ...escuchaYCuenta({ nivel })].map(oraciones)) {
          expect(r.correctaId).toBe(String(r.palabras.length))
          expect(r.opciones.map((o) => o.id)).toContain(r.correctaId)
          expect(r.opciones).toHaveLength(nivel.maxOpciones)
          expect(r.opciones.every((o) => Number(o.id) >= 1)).toBe(true)
          expect(r.item.length).toBeLessThanOrEqual(20)
          if (nivel.palabrasCortas) expect(r.palabras.length).toBeLessThanOrEqual(3)
        }
      }
    }
  })

  it('¿qué palabra falta?: el hueco es una palabra con dibujo y es la respuesta, sin otra opción que se confunda', () => {
    for (let n = 0; n < 40; n++) {
      for (const r of laPalabraQueFalta({ nivel: EXIGENCIAS.avanzado }).map(oraciones)) {
        expect(r.hueco).toBeDefined()
        const falta = r.palabras[r.hueco!]
        expect(falta.imagen).toBeDefined()
        const correcta = r.opciones.find((o) => o.id === r.correctaId)
        expect(correcta?.audio).toBe(falta.texto)
        expect(new Set(r.opciones.map((o) => o.id)).size).toBe(r.opciones.length)
        expect(r.item.length).toBeLessThanOrEqual(20)
        // Ninguna otra opción es palabra de la misma oración.
        for (const o of r.opciones.filter((x) => x.id !== r.correctaId)) expect(r.palabras.map((p) => p.texto)).not.toContain(o.audio)
      }
    }
  })
})

describe('categorías: frutas, profesiones y oficios', () => {
  it('marcar: las que corresponden son del tema y las otras no', () => {
    const temaDe = (texto: string) => PALABRAS.find((w) => w.texto.toUpperCase() === texto)?.tema
    for (const tema of ['frutas', 'profesiones', 'oficios'] as const) {
      for (const r of marcaLaCategoria([tema])) {
        if (r.tipo !== 'marcar') throw new Error('tipo')
        expect(r.item).toBe(TEMAS[tema].nombre)
        for (const t of r.tarjetas) expect(temaDe(t.texto!) === tema).toBe(t.corresponde)
        expect(r.tarjetas.filter((t) => t.corresponde).length).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('el contenido trae las tres actividades y sin tema usa las tres categorías', () => {
    const c = contenido('categorias')!
    expect(c.pasos).toHaveLength(3)
    const items = new Set(c.pasos[1].generar().map((r) => r.item))
    for (const i of items) expect(['Frutas', 'Profesiones', 'Oficios']).toContain(i)
  })
})

describe('orden sugerido por el equipo PIE', () => {
  it('las etapas son léxica, silábica, intrasilábica (rimas) y fonémica, en ese orden', () => {
    expect(ETAPAS.slice(0, 4).map((a) => AREAS[a].nombre)).toEqual([
      'Conciencia léxica',
      'Conciencia silábica',
      'Conciencia intrasilábica (rimas)',
      'Conciencia fonémica',
    ])
  })

  it('en la fonémica van primero las vocales y después las consonantes', () => {
    const fonemica = CONTENIDOS.filter((c) => c.area === 'letras').map((c) => c.id)
    expect(fonemica[0]).toBe('vocales')
    expect(fonemica.indexOf('vocales')).toBeLessThan(fonemica.indexOf('silabas-m'))
  })

  it('ordena un plan desordenado y deja al final lo que no tiene etapa (en el orden del catálogo)', () => {
    const plan: BloquePlan[] = ['escribo', 'silabas-m', 'vocales', 'rimas', 'categorias', 'largas-cortas', 'conciencia-lexica'].map(bloqueContenido)
    const orden = ordenSugerido(plan).map((b) => ('contenido' in b ? b.contenido : ''))
    expect(orden).toEqual(['conciencia-lexica', 'largas-cortas', 'rimas', 'vocales', 'silabas-m', 'categorias', 'escribo'])
  })

  it('«Escucha y toca la letra» solo con vocales va con las vocales, antes de las consonantes', () => {
    const plan: BloquePlan[] = [bloqueContenido('silabas-m'), { paso: { juego: 'escucha-letra', parametros: { letras: ['a', 'e', 'i', 'o', 'u'] } } }, bloqueContenido('vocales')]
    const orden = ordenSugerido(plan).map((b) => ('contenido' in b ? b.contenido : b.paso.juego))
    expect(orden).toEqual(['vocales', 'escucha-letra', 'silabas-m'])
  })
})

describe('estaciones del año (Chile)', () => {
  const dia = (mes: number, d: number) => new Date(2026, mes - 1, d)
  it('cambian el 21 de cada mes de cambio', () => {
    expect(estacionDe(dia(9, 20))).toBe('invierno')
    expect(estacionDe(dia(9, 21))).toBe('primavera')
    expect(estacionDe(dia(11, 23))).toBe('primavera')
    expect(estacionDe(dia(12, 20))).toBe('primavera')
    expect(estacionDe(dia(12, 21))).toBe('verano')
    expect(estacionDe(dia(1, 15))).toBe('verano')
    expect(estacionDe(dia(3, 20))).toBe('verano')
    expect(estacionDe(dia(3, 21))).toBe('otono')
    expect(estacionDe(dia(6, 20))).toBe('otono')
    expect(estacionDe(dia(6, 21))).toBe('invierno')
  })
})
