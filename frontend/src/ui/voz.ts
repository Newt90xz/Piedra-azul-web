import { cancelarApuntar, hablarAlApuntar } from '../lib/audio.ts'

// Lee en voz alta el nombre de un botón al apuntarlo o enfocarlo (regla de oro 1).
export function useVozAlApuntar(texto: string) {
  const decir = () => hablarAlApuntar(texto)
  return { onPointerEnter: decir, onFocus: decir, onPointerLeave: cancelarApuntar, onBlur: cancelarApuntar }
}
