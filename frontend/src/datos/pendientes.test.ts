import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoActividad } from '../dominio/tipos.ts'
import { guardarResultadoConRespaldo, reenviarPendientes } from './pendientes.ts'

const { guardarResultado } = vi.hoisted(() => ({ guardarResultado: vi.fn<(r: ResultadoActividad) => Promise<void>>() }))
vi.mock('./index.ts', () => ({ repo: { guardarResultado } }))

const CLAVE = 'leer-para-todos/resultados-pendientes'

function almacenamiento() {
  const datos = new Map<string, string>()
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  }
}

const resultado = (id: string): ResultadoActividad => ({
  id,
  estudianteId: 'e1',
  actividadId: 'caza-letras',
  fecha: '2026-10-20T12:00:00Z',
  duracionMs: 60_000,
  rondas: [{ item: 'P', intentos: 1, acertada: true }],
  estrellas: 3,
  monedas: 10,
})

// Así llegan desde repositorioSupabase: el mensaje y el código SQL de PostgREST.
const errorDe = (message: string, code: string) => Object.assign(new Error(message), { code })
const sinRed = () => errorDe('TypeError: Failed to fetch', '')

const pendientes = () => (JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as ResultadoActividad[]).map((r) => r.id)
const sembrar = (...ids: string[]) => localStorage.setItem(CLAVE, JSON.stringify(ids.map(resultado)))

beforeEach(() => {
  vi.stubGlobal('localStorage', almacenamiento())
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.useFakeTimers()
  guardarResultado.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function guardar(r: ResultadoActividad) {
  const promesa = guardarResultadoConRespaldo(r)
  await vi.runAllTimersAsync()
  return promesa
}

describe('guardarResultadoConRespaldo', () => {
  it('guarda al primer intento sin dejar nada pendiente', async () => {
    guardarResultado.mockResolvedValue()
    expect(await guardar(resultado('a'))).toBe(true)
    expect(pendientes()).toEqual([])
  })

  it('sin red reintenta y lo deja pendiente', async () => {
    guardarResultado.mockRejectedValue(sinRed())
    expect(await guardar(resultado('a'))).toBe(false)
    expect(guardarResultado).toHaveBeenCalledTimes(3)
    expect(pendientes()).toEqual(['a'])
  })

  it.each([
    ['perfil borrado', errorDe('insert or update violates foreign key constraint', '23503')],
    ['datos inválidos', errorDe('invalid input syntax for type uuid', '22P02')],
    ['rechazo de la función', errorDe('resultado_invalido', 'P0001')],
  ])('descarta un rechazo definitivo (%s) sin reintentar', async (_, error) => {
    guardarResultado.mockRejectedValue(error)
    expect(await guardar(resultado('a'))).toBe(false)
    expect(guardarResultado).toHaveBeenCalledTimes(1)
    expect(pendientes()).toEqual([])
  })

  it('sin sala lo deja pendiente: se guarda al volver a una sala o al entrar la docente', async () => {
    guardarResultado.mockRejectedValue(errorDe('sin_sala', 'P0001'))
    await guardar(resultado('a'))
    expect(pendientes()).toEqual(['a'])
  })
})

describe('reenviarPendientes', () => {
  it('quita los guardados y los definitivos, y deja los que fallan por la red', async () => {
    sembrar('ok', 'red', 'borrado')
    guardarResultado.mockImplementation(async (r) => {
      if (r.id === 'red') throw sinRed()
      if (r.id === 'borrado') throw errorDe('foreign key', '23503')
    })
    await reenviarPendientes(true)
    expect(pendientes()).toEqual(['red'])
  })

  it('sin forzar espera la pausa entre reenvíos automáticos', async () => {
    sembrar('a')
    guardarResultado.mockRejectedValue(sinRed())
    await reenviarPendientes(true)
    await reenviarPendientes()
    expect(guardarResultado).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(30_000)
    await reenviarPendientes()
    expect(guardarResultado).toHaveBeenCalledTimes(2)
  })
})
