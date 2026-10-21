// Tienda de avatares de la sala de espera (RF-24). Versión de prueba: 3
// avatares para mostrar la compra. Los precios los vuelve a validar la base
// (privado.precio_avatar en supabase/migrations): cambiarlos aquí sin la
// migración no cambia lo que se cobra.

export interface AvatarTienda {
  id: string
  emoji: string
  nombre: string
  precio: number
}

export const AVATARES_TIENDA: AvatarTienda[] = [
  { id: 'dragon', emoji: '🐲', nombre: 'Dragón', precio: 30 },
  { id: 'robot', emoji: '🤖', nombre: 'Robot', precio: 60 },
  { id: 'astronauta', emoji: '🧑‍🚀', nombre: 'Astronauta', precio: 90 },
]

export function avatarTienda(id: string | undefined) {
  return AVATARES_TIENDA.find((a) => a.id === id)
}
