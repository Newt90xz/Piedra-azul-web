// Tienda de avatares de la sala de espera (RF-24). Los precios los vuelve a
// validar la base (privado.precio_avatar en supabase/migrations): cambiarlos o
// agregar avatares aquí sin la migración no cambia lo que se cobra.

export interface AvatarTienda {
  id: string
  emoji: string
  nombre: string
  precio: number
}

export const AVATARES_TIENDA: AvatarTienda[] = [
  { id: 'pollito', emoji: '🐥', nombre: 'Pollito', precio: 10 },
  { id: 'pulpo', emoji: '🐙', nombre: 'Pulpo', precio: 20 },
  { id: 'dragon', emoji: '🐲', nombre: 'Dragón', precio: 30 },
  { id: 'tigre', emoji: '🐯', nombre: 'Tigre', precio: 40 },
  { id: 'mago', emoji: '🧙', nombre: 'Mago', precio: 50 },
  { id: 'robot', emoji: '🤖', nombre: 'Robot', precio: 60 },
  { id: 'sirena', emoji: '🧜‍♀️', nombre: 'Sirena', precio: 70 },
  { id: 'superheroe', emoji: '🦸', nombre: 'Superhéroe', precio: 80 },
  { id: 'astronauta', emoji: '🧑‍🚀', nombre: 'Astronauta', precio: 90 },
]

export function avatarTienda(id: string | undefined) {
  return AVATARES_TIENDA.find((a) => a.id === id)
}
