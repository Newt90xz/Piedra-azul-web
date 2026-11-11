import { describe, expect, it } from 'vitest'
import type { Categoria } from '../contenido/actividades.ts'
import type { Emocion, Estudiante, IntentoRonda, ProgresoSala, Sala } from '../dominio/tipos.ts'
import { SIN_SALA, cambiosEntre, coloresDeSalas, estadoNino, hariaCirculo, hoyDe, necesitanApoyo, resumenHoy, resumenSemana, salasEnOrden, type DatosClase } from './clase.ts'

const sala = (id: string, extra: Partial<Sala> = {}): Sala => ({
  id,
  cursoId: 'c',
  nombre: id,
  tipo: 'trabajo',
  plan: [{ juego: 'vocales-1' }, { juego: 'vocales-2' }, { juego: 'vocales-3' }],
  contenidos: [],
  actividad: 'parque',
  juegos: [],
  asignacion: `a-${id}`,
  ...extra,
})
const nino = (id: string) => ({ id, nombre: id, activo: true }) as Estudiante
const progreso = (estudianteId: string, s: Sala, extra: Partial<ProgresoSala> = {}): ProgresoSala => ({
  estudianteId,
  salaId: s.id,
  asignacion: s.asignacion,
  paso: 0,
  repeticiones: 0,
  necesitaAyuda: false,
  actualizado: '',
  ...extra,
})
const datos = (extra: Partial<DatosClase>): DatosClase => ({
  salas: [],
  miembros: [],
  estudiantes: [],
  resultadosHoy: [],
  emocionDe: new Map(),
  conectados: new Map(),
  progresoDe: new Map(),
  ...extra,
})

describe('salas en el orden del tablero', () => {
  it('primero las salas de trabajo y después los recreos, cada grupo en el orden de sus rutas, sin repetir', () => {
    const recreo = sala('parque', { tipo: 'recreo' })
    const suelto = sala('dibujo', { tipo: 'recreo', actividad: 'dibujo' })
    const letras = sala('letras', { siguienteSala: 'parque' })
    const silabas = sala('silabas', { siguienteSala: 'parque' })
    expect(salasEnOrden([recreo, suelto, letras, silabas]).map((s) => s.id)).toEqual(['letras', 'silabas', 'parque', 'dibujo'])
  })

  it('una ruta de dos salas de trabajo queda en orden antes de su recreo', () => {
    const recreo = sala('parque', { tipo: 'recreo' })
    const silabas = sala('silabas', { siguienteSala: 'parque' })
    const letras = sala('letras', { siguienteSala: 'silabas' })
    expect(salasEnOrden([recreo, silabas, letras]).map((s) => s.id)).toEqual(['letras', 'silabas', 'parque'])
  })

  it('cada sala tiene su color: los recreos en menta, las de actividades distintas entre sí', () => {
    const c = coloresDeSalas([sala('parque', { tipo: 'recreo' }), sala('letras'), sala('silabas')])
    expect(c.get('parque')?.fondo).toBe('var(--color-sala-menta)')
    expect(c.get('letras')?.fondo).not.toBe(c.get('silabas')?.fondo)
  })

  it('no deja cerrar un círculo de salas', () => {
    const a = sala('a', { siguienteSala: 'b' })
    const b = sala('b')
    expect(hariaCirculo([a, b], 'b', 'a')).toBe(true)
    expect(hariaCirculo([a, b], 'a', 'b')).toBe(false)
  })
})

describe('qué está haciendo un niño', () => {
  const s = sala('letras')

  it('sin sala, en recreo o sin plan', () => {
    expect(estadoNino(undefined, undefined)).toEqual({ tipo: 'sin-sala' })
    expect(estadoNino(sala('p', { tipo: 'recreo', actividad: 'globos' }), undefined)).toEqual({ tipo: 'recreo', texto: 'Con los globos' })
    expect(estadoNino(sala('vacia', { plan: [] }), undefined)).toEqual({ tipo: 'sin-plan' })
  })

  it('la actividad en que va, su intento y si pide apoyo', () => {
    const e = estadoNino(s, progreso('n', s, { paso: 1, repeticiones: 2, necesitaAyuda: true }))
    expect(e).toMatchObject({ tipo: 'actividad', numero: 2, total: 3, intento: 3, necesitaAyuda: true, contenido: 'Las vocales' })
  })

  it('el avance de otro plan (otra asignación) no cuenta: parte de cero', () => {
    expect(estadoNino(s, progreso('n', s, { paso: 2, asignacion: 'vieja' }))).toMatchObject({ tipo: 'actividad', numero: 1 })
  })

  it('terminó y pasa a la sala siguiente, o espera', () => {
    expect(estadoNino(sala('x', { siguienteSala: 'p' }), progreso('n', sala('x'), { paso: 3 }))).toEqual({ tipo: 'termino', pasa: true })
    expect(estadoNino(s, progreso('n', s, { paso: 3 }))).toEqual({ tipo: 'termino', pasa: false })
  })
})

describe('apoyo, hoy y anuncios', () => {
  const s = sala('letras')

  it('solo piden apoyo los que están en la sala de ese avance', () => {
    const d = datos({
      salas: [s],
      estudiantes: [nino('ana'), nino('luis')],
      miembros: [{ estudianteId: 'ana', salaId: 'letras' }],
      progresoDe: new Map([
        ['ana', progreso('ana', s, { necesitaAyuda: true })],
        ['luis', progreso('luis', s, { necesitaAyuda: true })],
      ]),
    })
    expect(necesitanApoyo(d).map((a) => a.estudiante.id)).toEqual(['ana'])
  })

  it('resume la semana: quiénes jugaron, cuántas partidas y lo que más cuesta, por categoría', () => {
    const ronda = (item: string, intentos: number, categoria: Categoria) => ({ item, intentos, acertada: intentos < 3, categoria })
    const partida = (estudianteId: string, rondas: IntentoRonda[]) => ({ id: '', estudianteId, actividadId: 'x', fecha: '', duracionMs: 0, rondas, estrellas: 1, monedas: 0 })
    const r = resumenSemana(
      [nino('ana'), nino('luis'), nino('eva')],
      [
        partida('ana', [ronda('P', 2, 'letras'), ronda('A', 1, 'letras')]),
        partida('ana', [ronda('ma', 3, 'silabas')]),
        partida('luis', [ronda('P', 1, 'letras')]),
        // De alguien que ya no está activo en el curso: no cuenta.
        partida('otro', [ronda('S', 3, 'letras')]),
      ],
    )
    expect(r).toMatchObject({ jugaron: 2, partidas: 3 })
    expect(r.sinJugar.map((e) => e.id)).toEqual(['eva'])
    expect(r.cuestan.map((g) => [g.categoria, g.items.map((a) => a.item)])).toEqual([
      ['silabas', ['ma']],
      ['letras', ['P']],
    ])
  })

  it('resume el día: quiénes jugaron, cuántas partidas y cómo llegaron', () => {
    const partida = (estudianteId: string) => ({ id: '', estudianteId, actividadId: 'x', fecha: '', duracionMs: 0, rondas: [], estrellas: 1, monedas: 0 })
    const r = resumenHoy({
      estudiantes: [nino('ana'), nino('luis'), nino('eva')],
      resultadosHoy: [partida('ana'), partida('ana'), partida('luis'), partida('otro')],
      emocionDe: new Map<string, Emocion>([
        ['ana', 'alegria'],
        ['luis', 'tristeza'],
        ['otro', 'enojo'],
      ]),
    })
    expect(r).toEqual({ jugaron: 2, partidas: 3, llegaron: { alegria: 1, calma: 0, tristeza: 1, enojo: 0 }, sinResponder: 1 })
  })

  it('suma partidas y minutos de hoy', () => {
    const r = (estudianteId: string, duracionMs: number) => ({ id: '', estudianteId, actividadId: '', fecha: '', duracionMs, rondas: [], estrellas: 3, monedas: 0 })
    expect(hoyDe({ resultadosHoy: [r('ana', 90_000), r('ana', 150_000), r('luis', 60_000)] }, 'ana')).toEqual({ partidas: 2, minutos: 4 })
  })

  it('anuncia quién cambió de sala o empezó a pedir apoyo', () => {
    const antes = datos({ salas: [s], estudiantes: [nino('ana'), nino('luis')], miembros: [{ estudianteId: 'luis', salaId: 'letras' }] })
    const despues = datos({
      salas: [s],
      estudiantes: [nino('ana'), nino('luis')],
      miembros: [{ estudianteId: 'ana', salaId: 'letras' }],
      progresoDe: new Map([['ana', progreso('ana', s, { necesitaAyuda: true })]]),
    })
    expect(cambiosEntre(antes, despues)).toBe('ana pasó a letras. ana necesita apoyo. luis quedó sin sala.')
    expect(cambiosEntre(despues, despues)).toBe('')
    expect(SIN_SALA).toBe('')
  })
})
