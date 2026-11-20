import { describe, expect, it } from 'vitest'
import type { Ronda } from './actividades.ts'
import { CATEGORIAS, JUEGOS } from './actividades.ts'
import { ALFABETO, PALABRAS, aplicarBanco } from './banco.ts'
import { bloqueContenido, bloquesDePlan, categoriaDe, contextoDePaso, gruposDePlan, contenidosDePlan, nombreActividad, pasosDeContenidos, planDe, planDeBloques, planDeSala } from './contenidos.ts'
import { PLANTILLAS_SISTEMA, juegoConfigurable, letrasDe, temasDe } from './plantillas.ts'

const juego = juegoConfigurable('escucha-letra')!
const elegir = (r: Ronda) => {
  if (r.tipo !== 'elegir') throw new Error('Se esperaba una ronda de elegir')
  return r
}
const sonidoDe = (id: string) => ALFABETO.find((l) => l.id === id)!.sonido

const sqlPorArchivo = import.meta.glob<string>('../../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true })
const migraciones = Object.values(sqlPorArchivo).join('\n')

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
      const j = juegoConfigurable(p.juegoId)!
      expect(j.validar(p.parametros), p.nombre).toBeNull()
      if (j.eleccion === 'letras') expect(letrasDe(p.parametros).length).toBeGreaterThan(1)
      else expect(temasDe(p.parametros).length).toBeGreaterThan(0)
      expect(j.generar(p.parametros).length, p.nombre).toBeGreaterThanOrEqual(4)
      // Mismo límite que plantillas_actividad.nombre en la base.
      expect(p.nombre.length).toBeLessThanOrEqual(40)
    }
  })

  it('aparece en los reportes con su nombre y categoría', () => {
    // Es una actividad de sala, no un juego del recreo.
    expect(JUEGOS.some((j) => j.id === 'escucha-letra')).toBe(false)
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
    // Escalera: con apoyo (vocales-2), decide solo (vocales-3) y solo de oído (vocales-1).
    expect(nuevo.map((p) => p.actividadId).slice(0, 3)).toEqual(['vocales-2', 'vocales-3', 'vocales-1'])
  })

  it('mezcla contenidos y actividades configurables en orden', () => {
    const plan = planDeSala([...pasosDeContenidos(['vocales']), conLetras])
    expect(plan.map((p) => p.actividadId)).toEqual(['vocales-2', 'vocales-3', 'vocales-1', 'escucha-letra'])
    expect(plan[3].contenido.titulo).toBe('Mis letras')
    expect(plan[3].parametros).toEqual({ letras: ['m', 'p'] })
  })

  it('cada paso tiene su clave aunque se repita la actividad', () => {
    const plan = planDeSala([conLetras, conLetras])
    expect(new Set(plan.map((p) => p.clave)).size).toBe(2)
    expect(plan[0].contenido.id).not.toBe(plan[1].contenido.id)
  })

  it('el tema de un contenido se guarda en el plan, vuelve al editarlo y llega a las actividades', () => {
    const bloques = [{ contenido: 'escucho', pasos: [1, 3], tema: 'frutas' as const }, { contenido: 'escucho', pasos: [2] }, { contenido: 'formo-palabras', pasos: [1], tema: 'frutas' as const }]
    const plan = planDeBloques(bloques)
    expect(plan.slice(0, 3)).toEqual([{ juego: 'escucho-1', tema: 'frutas' }, { juego: 'escucho-3', tema: 'frutas' }, { juego: 'escucho-2' }])
    // Mismo contenido seguido pero con otro tema: siguen siendo dos bloques.
    expect(bloquesDePlan(plan)).toEqual(bloques)
    const pasos = planDeSala(plan)
    expect(pasos.map((p) => p.tema)).toEqual(['frutas', 'frutas', undefined, undefined])
    // Formo palabras usa una lista fija: el tema no le llega.
    const sala = { id: crypto.randomUUID(), asignacion: crypto.randomUUID() }
    const contexto = contextoDePaso(pasos[0], sala)
    expect(contexto).toMatchObject({ contenidoId: 'escucho', paso: 1, parametros: { tema: 'frutas' } })
    expect(contextoDePaso(pasos[2], sala)).toMatchObject({ contenidoId: 'escucho', paso: 2, parametros: undefined })
  })

  it('se puede editar por bloques sin perder nada', () => {
    const pasos = [...pasosDeContenidos(['silabas-m']), conLetras, ...pasosDeContenidos(['vocales'])]
    const bloques = bloquesDePlan(pasos)
    expect(bloques).toHaveLength(3)
    expect(planDeBloques(bloques)).toEqual(pasos)
    expect(contenidosDePlan(pasos)).toEqual(['silabas-m', 'vocales'])
  })

  it('un contenido puede saltarse la actividad de escuchar o dejarla al final', () => {
    const sinEscuchar = [{ juego: 'silabas-s-2' }, { juego: 'silabas-s-3' }, { juego: 'silabas-s-1' }]
    const bloques = bloquesDePlan(sinEscuchar)
    expect(bloques).toEqual([{ contenido: 'silabas-s', pasos: [2, 3, 1] }])
    expect(planDeBloques(bloques)).toEqual(sinEscuchar)
    expect(contenidosDePlan(sinEscuchar)).toEqual(['silabas-s'])

    const grupos = gruposDePlan(planDeSala(planDeBloques([{ contenido: 'silabas-l', pasos: [3] }, bloqueContenido('vocales')])))
    expect(grupos.map((g) => g.pasos.map((p) => p.numero))).toEqual([[3], [2, 3, 1]])
    expect(grupos.map((g) => g.inicio)).toEqual([0, 1])
  })
})

describe('banco de la base', () => {
  it('la semilla incluye todo el banco del código', () => {
    for (const w of PALABRAS) expect(migraciones, w.id).toContain(`('${w.id}', '${w.texto}',`)
    for (const l of ALFABETO) expect(migraciones, l.id).toContain(`('${l.id}', '${l.grafema}', '${l.fonema}', '${l.sonido}',`)
  })

  it('la base tiene el tema de cada palabra del código', () => {
    const lineas = migraciones.split('\n')
    for (const w of PALABRAS) {
      // Al insertarla («('kiwi', 'kiwi', array[…], '🥝', 'frutas')») o al actualizarla («('abeja', 'animales')»).
      const alInsertar = lineas.some((l) => l.includes(`('${w.id}', '${w.texto}', array[`) && l.includes(`', '${w.tema}')`))
      expect(alInsertar || migraciones.includes(`('${w.id}', '${w.tema}')`), w.id).toBe(true)
    }
  })

  it('la base acepta guardar las rondas de todas las categorías', () => {
    // La última migración que define las funciones que guardan: ahí van el check de la tabla y las dos funciones.
    const ultima = Object.entries(sqlPorArchivo)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, sql]) => sql)
      .filter((sql) => sql.includes('function public.guardar_resultado_sala'))
      .at(-1)!
    for (const categoria of Object.keys(CATEGORIAS)) expect(ultima.split(`'${categoria}'`).length - 1, categoria).toBeGreaterThanOrEqual(3)
  })

  it('una palabra de la base sin tema conserva el del código', () => {
    const kiwi = PALABRAS.find((w) => w.id === 'kiwi')!
    const copia = { ...kiwi, imagen: { ...kiwi.imagen } }
    aplicarBanco({ palabras: [{ id: 'kiwi', texto: 'kiwi', silabas: ['ki', 'wi'], emoji: '🥝' }], letras: [] })
    expect(PALABRAS.find((w) => w.id === 'kiwi')?.tema).toBe('frutas')
    aplicarBanco({ palabras: [{ id: 'kiwi', texto: 'kiwi', silabas: ['ki', 'wi'], emoji: '🥝', tema: 'no-es-tema' }], letras: [] })
    expect(PALABRAS.find((w) => w.id === 'kiwi')?.tema).toBe('frutas')
    aplicarBanco({ palabras: [{ id: 'kiwi', texto: 'kiwi', silabas: ['ki', 'wi'], emoji: '🥝', tema: 'verduras' }], letras: [] })
    expect(PALABRAS.find((w) => w.id === 'kiwi')?.tema).toBe('verduras')
    Object.assign(PALABRAS.find((w) => w.id === 'kiwi')!, copia)
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
