import type { ResultadoActividad } from '../dominio/tipos.ts'
import { repo } from './index.ts'

// Respaldo mínimo de RNF-12: si un resultado no se puede guardar tras unos
// reintentos, queda en localStorage y se reenvía al volver la conexión o al
// iniciar sesión. Reenviar es seguro porque el id del resultado no cambia.

const CLAVE = 'leer-para-todos/resultados-pendientes'
const ESPERAS_MS = [1000, 3000]
// Entre reenvíos automáticos (la vista del niño lo pide cada pocos segundos).
const PAUSA_REENVIO_MS = 30_000

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

// Rechazos que reenviar no arregla: datos inválidos (22xxx), restricciones como
// un perfil ya borrado (23xxx) o el rechazo explícito de la función. `sin_sala`
// no es definitivo: se guarda al volver el niño a una sala o al entrar la docente.
function esDefinitivo(e: unknown) {
  if (!(e instanceof Error)) return false
  const codigo = (e as Error & { code?: string }).code ?? ''
  return /^2[23]/.test(codigo) || e.message === 'resultado_invalido'
}

// Devuelve true si quedó guardado y false si quedó pendiente o se descartó. Nunca rechaza.
export async function guardarResultadoConRespaldo(r: ResultadoActividad): Promise<boolean> {
  for (let intento = 0; ; intento++) {
    try {
      await repo.guardarResultado(r)
      return true
    } catch (e) {
      if (esDefinitivo(e)) {
        console.warn('[pendientes] Resultado descartado: el servidor lo rechazó.', e)
        return false
      }
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
let ultimoReenvio = 0

// `forzar` salta la pausa: al volver la conexión o al iniciar sesión vale la pena reintentar ya.
export async function reenviarPendientes(forzar = false) {
  if (reenviando || (!forzar && Date.now() - ultimoReenvio < PAUSA_REENVIO_MS)) return
  reenviando = true
  ultimoReenvio = Date.now()
  try {
    for (const r of leer()) {
      try {
        await repo.guardarResultado(r)
      } catch (e) {
        // Sigue pendiente para el próximo intento, salvo que nunca vaya a entrar.
        if (!esDefinitivo(e)) continue
        console.warn('[pendientes] Resultado pendiente descartado: el servidor lo rechazó.', e)
      }
      escribir(leer().filter((x) => x.id !== r.id))
    }
  } finally {
    reenviando = false
  }
}
