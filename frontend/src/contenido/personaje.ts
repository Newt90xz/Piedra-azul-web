import type { Expresion, Personaje } from '../dominio/tipos.ts'
import type { EspacioOpcional } from './tienda.ts'

// Partes gratis del personaje (RF-24). Los mismos valores los valida la base
// (public.guardar_personaje en supabase/migrations).

export const PIELES = ['#fde0c8', '#f6cfa6', '#e8b184', '#c98d5e', '#a06b42', '#74492c']

export const COLORES_PELO = [
  { id: 'negro', nombre: 'Pelo negro', valor: '#2b2d3b' },
  { id: 'cafe_oscuro', nombre: 'Pelo café oscuro', valor: '#5a3a26' },
  { id: 'cafe_claro', nombre: 'Pelo café claro', valor: '#94683f' },
  { id: 'rubio', nombre: 'Pelo rubio', valor: '#e8c15f' },
  { id: 'cobrizo', nombre: 'Pelo cobrizo', valor: '#bd5f33' },
  { id: 'gris', nombre: 'Pelo gris', valor: '#a9adb8' },
]

export const EXPRESIONES: { id: Expresion; nombre: string }[] = [
  { id: 'feliz', nombre: 'Feliz' },
  { id: 'tranquilo', nombre: 'Tranquilo' },
  { id: 'triste', nombre: 'Triste' },
  { id: 'enojado', nombre: 'Enojado' },
]

// La polera base toma el color del perfil, en una versión más viva que el fondo.
const ROPA_POR_COLOR: Record<string, string> = {
  '#fde2c8': '#f2a15f',
  '#d3f2e3': '#5cc08e',
  '#cfe8fb': '#5ba8e6',
  '#f6d1d1': '#e87b7b',
  '#e4dcf7': '#9a7fdc',
  '#fff3c4': '#e6c23f',
}
export const colorRopa = (colorPerfil: string) => ROPA_POR_COLOR[colorPerfil] ?? '#5ba8e6'

export interface PersonajeBase {
  id: string
  nombre: string
  piel: number
  colorPelo: string
  pelo: string
  ojos: string
}

// Puntos de partida sin género que elige la docente.
export const PERSONAJES_BASE: PersonajeBase[] = [
  { id: 'base_corto', nombre: 'Corto', piel: 2, colorPelo: 'negro', pelo: 'pelo_corto', ojos: 'ojos_redondos' },
  { id: 'base_rulos', nombre: 'Rulos', piel: 4, colorPelo: 'cafe_oscuro', pelo: 'pelo_rulos', ojos: 'ojos_alegres' },
  { id: 'base_chasquilla', nombre: 'Chasquilla', piel: 1, colorPelo: 'rubio', pelo: 'pelo_chasquilla', ojos: 'ojos_redondos' },
  { id: 'base_colitas', nombre: 'Colitas', piel: 3, colorPelo: 'cafe_claro', pelo: 'pelo_colitas', ojos: 'ojos_alegres' },
  { id: 'base_trenza', nombre: 'Trenza', piel: 5, colorPelo: 'negro', pelo: 'pelo_trenza', ojos: 'ojos_redondos' },
  { id: 'base_afro', nombre: 'Afro', piel: 6, colorPelo: 'negro', pelo: 'pelo_afro', ojos: 'ojos_alegres' },
  { id: 'base_liso', nombre: 'Liso', piel: 2, colorPelo: 'cobrizo', pelo: 'pelo_liso', ojos: 'ojos_alegres' },
  { id: 'base_mono', nombre: 'Moño', piel: 3, colorPelo: 'negro', pelo: 'pelo_mono', ojos: 'ojos_redondos' },
  { id: 'base_puntas', nombre: 'Puntas', piel: 4, colorPelo: 'cafe_claro', pelo: 'pelo_puntas', ojos: 'ojos_alegres' },
  { id: 'base_ondas', nombre: 'Ondas', piel: 1, colorPelo: 'cobrizo', pelo: 'pelo_ondas', ojos: 'ojos_redondos' },
  { id: 'base_rapado', nombre: 'Rapado', piel: 5, colorPelo: 'cafe_oscuro', pelo: 'pelo_rapado', ojos: 'ojos_redondos' },
  { id: 'base_melena', nombre: 'Melena', piel: 3, colorPelo: 'rubio', pelo: 'pelo_melena', ojos: 'ojos_alegres' },
]

export function personajeDesdeBase(b: PersonajeBase, previo?: Personaje): Personaje {
  const { piel, colorPelo, pelo, ojos } = b
  return { expresion: 'feliz', manoArriba: false, apoyos: [], puestos: {}, ...previo, piel, colorPelo, pelo, ojos }
}

// Quien aún no tiene personaje guardado recibe siempre el mismo.
export function personajePorDefecto(semilla: string): Personaje {
  let h = 0
  for (const c of semilla) h = (h * 31 + c.charCodeAt(0)) | 0
  return personajeDesdeBase(PERSONAJES_BASE[Math.abs(h) % PERSONAJES_BASE.length])
}

// Un traje reemplaza la polera y al revés.
export function vestir(p: Personaje, espacio: EspacioOpcional, id: string | undefined): Personaje {
  const puestos = { ...p.puestos }
  if (id) puestos[espacio] = id
  else delete puestos[espacio]
  if (id && espacio === 'traje') delete puestos.ropa
  if (id && espacio === 'ropa') delete puestos.traje
  return { ...p, puestos }
}
