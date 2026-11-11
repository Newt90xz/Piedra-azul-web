import { useEffect } from 'react'

// Cambios sin guardar en una página del panel (hoy, el plan de una sala). El
// router (BrowserRouter) no puede frenar una navegación: los enlaces del panel
// preguntan con `confirmarSalida` antes de irse, y cerrar o recargar la pestaña
// usa el aviso propio del navegador (`beforeunload`).
let mensajePendiente: string | null = null

export function useCambiosSinGuardar(hay: boolean, mensaje: string) {
  useEffect(() => {
    if (!hay) return
    mensajePendiente = mensaje
    const alSalir = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', alSalir)
    return () => {
      mensajePendiente = null
      window.removeEventListener('beforeunload', alSalir)
    }
  }, [hay, mensaje])
}

// true si se puede salir: no hay cambios pendientes o la docente acepta perderlos.
export function confirmarSalida() {
  return mensajePendiente === null || window.confirm(mensajePendiente)
}
