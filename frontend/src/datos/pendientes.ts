import type { ResultadoActividad } from '../dominio/tipos.ts'
import { repo } from './index.ts'

// Respaldo mínimo de RNF-12: si un resultado no se puede guardar tras unos
// reintentos, queda en localStorage y se reenvía al volver la conexión o al
// iniciar sesión. Reenviar es seguro porque el id del resultado no cambia.

const CLAVE = 'leer-para-todos/resultados-pendientes'
const ESPERAS_MS = [1000, 3000]

function leer(): ResultadoActividad[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as ResultadoActividad[]
  } catch {
    return []
  }
}

function escribir(pendientes: ResultadoActividad[]) {
  try {
    if (pendientes.length) localStorage.setItem(CLAVE, JSON.stringify(pendientes))
    else localStorage.removeItem(CLAVE)
  } catch {
    // Sin almacenamiento disponible no hay dónde respaldar.
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Devuelve true si quedó guardado y false si quedó pendiente. Nunca rechaza.
export async function guardarResultadoConRespaldo(r: ResultadoActividad): Promise<boolean> {
  for (let intento = 0; ; intento++) {
    try {
      await repo.guardarResultado(r)
      return true
    } catch (e) {
      if (intento >= ESPERAS_MS.length) {
        console.warn('[pendientes] Resultado guardado localmente para reenviar más tarde.', e)
        escribir([...leer().filter((x) => x.id !== r.id), r])
        return false
      }
      await esperar(ESPERAS_MS[intento])
    }
  }
}

let reenviando = false

export async function reenviarPendientes() {
  if (reenviando) return
  reenviando = true
  try {
    for (const r of leer()) {
      try {
        await repo.guardarResultado(r)
        escribir(leer().filter((x) => x.id !== r.id))
      } catch {
        // Sigue pendiente para el próximo intento.
      }
    }
  } finally {
    reenviando = false
  }
}
