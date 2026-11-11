import { useEffect, useRef } from 'react'

const ENFOCABLES = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Cuadro de diálogo accesible: al abrir lleva el foco adentro (al campo con
// autoFocus o al cuadro mismo), Tab no sale de él y al cerrar el foco vuelve a
// donde estaba. El cuadro debe tener tabIndex={-1}.
export function useDialogo<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const nodo = ref.current
    if (!nodo) return
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!nodo.contains(document.activeElement)) nodo.focus()
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const lista = [...nodo.querySelectorAll<HTMLElement>(ENFOCABLES)]
      if (lista.length === 0) return e.preventDefault()
      const [primero, ultimo] = [lista[0], lista[lista.length - 1]]
      if (e.shiftKey && (document.activeElement === primero || document.activeElement === nodo)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      if (previo?.isConnected) previo.focus()
    }
  }, [])
  return ref
}

// Escape cierra lo que está abierto (un menú adentro lo detiene antes).
export function useEscape(alCerrar: () => void) {
  const cerrar = useRef(alCerrar)
  useEffect(() => {
    cerrar.current = alCerrar
  })
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && cerrar.current()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])
}
