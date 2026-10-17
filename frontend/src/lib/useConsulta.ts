import { useCallback, useEffect, useState } from 'react'

// Carga datos asíncronos del repositorio y permite recargarlos tras una edición.
// Si la consulta falla, `error` queda con el motivo hasta el próximo acierto.
export function useConsulta<T>(cargar: () => Promise<T>, deps: unknown[]) {
  const [datos, setDatos] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [version, setVersion] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cargarMemo = useCallback(cargar, deps)

  useEffect(() => {
    let vigente = true
    cargarMemo().then(
      (d) => {
        if (!vigente) return
        setDatos(d)
        setError(null)
      },
      (e: unknown) => {
        if (vigente) setError(e instanceof Error ? e : new Error(String(e)))
      },
    )
    return () => {
      vigente = false
    }
  }, [cargarMemo, version])

  return {
    datos,
    error,
    recargar: () => {
      setError(null)
      setVersion((v) => v + 1)
    },
  }
}
