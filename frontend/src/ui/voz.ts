import type { FocusEvent } from 'react'
import { cancelarApuntar, hablarAlApuntar } from '../lib/audio.ts'

// Lee en voz alta el nombre de un botón al apuntarlo o enfocarlo (regla de oro 1).
// El foco solo cuenta si llegó con el teclado: al hacer clic el botón también queda
// enfocado, y decir su nombre ahí cortaría lo que la app responde. Por lo mismo, un
// clic cancela el nombre que estaba por decirse.
export function useVozAlApuntar(texto: string) {
  const decir = () => hablarAlApuntar(texto)
  const alEnfocar = (e: FocusEvent<HTMLElement>) => {
    if (e.currentTarget.matches(':focus-visible')) decir()
  }
  return { onPointerEnter: decir, onFocus: alEnfocar, onPointerLeave: cancelarApuntar, onBlur: cancelarApuntar, onPointerDown: cancelarApuntar }
}
