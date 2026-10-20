import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarCredencial, leerCredencial, olvidarCredencial } from './dispositivo.ts'

const CLAVE = 'leer-para-todos/alumno'

beforeEach(() => {
  const datos = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('credencial del dispositivo', () => {
  it('se guarda, se lee y se olvida', () => {
    expect(leerCredencial()).toBeNull()
    guardarCredencial({ estudianteId: 'e1', token: 't1' })
    expect(leerCredencial()).toEqual({ estudianteId: 'e1', token: 't1' })
    olvidarCredencial()
    expect(leerCredencial()).toBeNull()
  })

  it('el formato anterior (solo el id, sin token) cuenta como sin credencial', () => {
    localStorage.setItem(CLAVE, '3f0c2a5e-8b1d-4c39-9a57-0d6f1e2b4c88')
    expect(leerCredencial()).toBeNull()
    localStorage.setItem(CLAVE, JSON.stringify({ estudianteId: 'e1' }))
    expect(leerCredencial()).toBeNull()
  })

  it('sin almacenamiento disponible no rompe la app', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
      removeItem: () => {
        throw new Error('bloqueado')
      },
    })
    expect(() => guardarCredencial({ estudianteId: 'e1', token: 't1' })).not.toThrow()
    expect(leerCredencial()).toBeNull()
    expect(() => olvidarCredencial()).not.toThrow()
  })
})
