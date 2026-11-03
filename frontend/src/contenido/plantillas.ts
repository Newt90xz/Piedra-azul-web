import type { ParametrosJuego, PlantillaActividad } from '../dominio/tipos.ts'
import { ALFABETO } from './banco.ts'
import { escuchaLaLetra, type Categoria, type Ronda } from './actividades.ts'
import type { Area, CodigoOA } from './contenidos.ts'

// Actividades que configura la docente: la mecánica está en código y ella elige
// con qué se juega (RF-15). Cada configuración se puede guardar como plantilla y
// reutilizar. Para sumar otra actividad configurable basta agregarla a esta lista.

export interface JuegoConfigurable {
  id: string
  titulo: string
  descripcion: string
  instrucciones: string
  icono: string
  color: string
  categoria: Categoria
  area: Area
  oa: CodigoOA[]
  porDefecto: ParametrosJuego
  // Qué falta para poder jugarla; null si está lista.
  validar: (p: ParametrosJuego) => string | null
  generar: (p: ParametrosJuego) => Ronda[]
  // Lo elegido, en corto, para el plan de la docente: «M, P, S».
  resumen: (p: ParametrosJuego) => string
}

export const letrasDe = (p: ParametrosJuego) => (Array.isArray(p.letras) ? p.letras.filter((l): l is string => typeof l === 'string') : [])

export const TODAS_LAS_LETRAS = ALFABETO.map((l) => l.id)
export const VOCALES_ALFABETO = ['a', 'e', 'i', 'o', 'u']

export const JUEGOS_CONFIGURABLES: JuegoConfigurable[] = [
  {
    id: 'escucha-letra',
    titulo: 'Escucha y toca la letra',
    descripcion: 'Suena una letra y el niño toca cuál es, entre las letras que elijas.',
    instrucciones: 'Escucha el sonido y toca la letra.',
    icono: '🔤',
    color: 'var(--color-nino-amarillo)',
    categoria: 'letras',
    area: 'letras',
    oa: ['OA 7'],
    porDefecto: { letras: TODAS_LAS_LETRAS },
    validar: (p) => {
      const letras = ALFABETO.filter((l) => letrasDe(p).includes(l.id))
      if (letras.length < 2) return 'Elige al menos 2 letras.'
      // Con solo B y V, o solo C, K y Q, no habría forma de distinguirlas de oído.
      if (new Set(letras.map((l) => l.sonido)).size < 2) return 'Esas letras suenan igual: agrega una que suene distinto.'
      return null
    },
    generar: (p) => escuchaLaLetra(letrasDe(p)),
    resumen: (p) => {
      const letras = letrasDe(p)
      if (letras.length === ALFABETO.length) return 'Todas las letras'
      return ALFABETO.filter((l) => letras.includes(l.id))
        .map((l) => l.grafema)
        .join(', ')
    },
  },
]

export const juegoConfigurable = (id: string) => JUEGOS_CONFIGURABLES.find((j) => j.id === id)

// Plantillas listas para usar, iguales para todas las docentes. Las propias se
// guardan en la base (plantillas_actividad).
export const PLANTILLAS_SISTEMA: PlantillaActividad[] = [
  { id: 'sistema-todas', nombre: 'Todas las letras', juegoId: 'escucha-letra', parametros: { letras: TODAS_LAS_LETRAS }, sistema: true },
  { id: 'sistema-vocales', nombre: 'Vocales', juegoId: 'escucha-letra', parametros: { letras: VOCALES_ALFABETO }, sistema: true },
  { id: 'sistema-consonantes', nombre: 'Consonantes', juegoId: 'escucha-letra', parametros: { letras: TODAS_LAS_LETRAS.filter((l) => !VOCALES_ALFABETO.includes(l)) }, sistema: true },
  { id: 'sistema-mplst', nombre: 'M, P, L, S, T', juegoId: 'escucha-letra', parametros: { letras: ['m', 'p', 'l', 's', 't'] }, sistema: true },
]
