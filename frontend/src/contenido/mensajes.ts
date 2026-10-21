// Mensajes del playground: un set fijo de pictogramas que suenan al tocarlos.
// Sin texto libre (los niños no leen ni escriben aún y así no hay nada que
// moderar). La misma lista la valida la base (mensajes_sala.picto).

export interface PictoMensaje {
  id: string
  emoji: string
  voz: string
}

export const PICTOS_MENSAJE: PictoMensaje[] = [
  { id: 'hola', emoji: '👋', voz: '¡Hola!' },
  { id: 'bien', emoji: '👍', voz: '¡Bien!' },
  { id: 'jaja', emoji: '😂', voz: '¡Ja, ja, ja!' },
  { id: 'wow', emoji: '😮', voz: '¡Guau!' },
  { id: 'amor', emoji: '❤️', voz: '¡Te quiero!' },
  { id: 'jugar', emoji: '⚽', voz: '¿Jugamos?' },
  { id: 'gracias', emoji: '🙏', voz: '¡Gracias!' },
  { id: 'chao', emoji: '🌈', voz: '¡Chao!' },
]

export function pictoMensaje(id: string) {
  return PICTOS_MENSAJE.find((p) => p.id === id)
}
