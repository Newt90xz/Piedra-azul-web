// Modelo de dominio. Cada interfaz corresponde a una tabla futura en Supabase.

export type ModoImagen = 'foto' | 'picto' | 'mixto'
export type TamanoLetra = 'normal' | 'grande' | 'muy-grande'
export type Emocion = 'alegria' | 'calma' | 'tristeza' | 'enojo'
export type Tematica = 'animales' | 'dinosaurios' | 'futbol' | 'oceano' | 'vehiculos' | 'piratas'
export type Nivel = 1 | 2 | 3

export interface Docente {
  id: string
  nombre: string
  email: string
}

export interface Curso {
  id: string
  nombre: string
  docenteId: string
}

// RF-21: ajustes que se aplican solos al entrar el estudiante.
export interface Ajustes {
  modoImagen: ModoImagen
  tamanoLetra: TamanoLetra
  altoContraste: boolean
  reducirAnimaciones: boolean
  silenciarEfectos: boolean
  tematica: Tematica
}

// RNF-09: datos mínimos. Solo nombre de pila, sin RUT ni fecha de nacimiento.
export interface Estudiante {
  id: string
  cursoId: string
  nombre: string
  avatar: string
  color: string
  fotoUrl?: string
  activo: boolean
  // RF-09 / RF-15: nivel más alto habilitado por avance o por la docente.
  nivelHabilitado: Nivel
  monedas: number
  // Avatar comprado en la tienda que el niño lleva puesto; si no hay, se ve `avatar`.
  avatarTienda?: string
  ajustes: Ajustes
}

export interface Imagen {
  alt: string
  // Marcador provisional hasta tener fotos reales y pictogramas ARASAAC.
  emoji: string
  fotoUrl?: string
  pictoUrl?: string
}

export interface Palabra {
  id: string
  texto: string
  silabas: string[]
  imagen: Imagen
}

export interface Letra {
  id: string
  grafema: string
  // RF-04: lo que suena es el fonema, nunca el nombre de la letra.
  fonema: string
  ejemplos: string[]
  apoyoArticulatorio: string
}

export interface RegistroEmocion {
  id: string
  estudianteId: string
  emocion: Emocion
  fecha: string
}

// RF-12: una fila por ronda para saber qué letra o sílaba le cuesta.
export interface IntentoRonda {
  item: string
  intentos: number
  acertada: boolean
  // Última respuesta equivocada de la ronda (sílaba, letra, palabra o número).
  // Solo la última: tocar muchas veces por desesperación no llena el registro.
  error?: string
}

export interface ResultadoActividad {
  id: string
  estudianteId: string
  actividadId: string
  fecha: string
  duracionMs: number
  rondas: IntentoRonda[]
  estrellas: number
  monedas: number
}

export interface Observacion {
  id: string
  estudianteId: string
  texto: string
  fecha: string
}

// Salas: la docente las crea y asigna a cada niño (el niño no elige sala).
// Una sala de trabajo tiene un plan: contenidos MINEDUC en orden (cada uno con 3
// actividades) y los juegos a los que se llega al terminarlos. El playground es
// un espacio común con mensajes de pictogramas, mientras esperan otra sala.
export type TipoSala = 'trabajo' | 'playground'

export interface Sala {
  id: string
  cursoId: string
  nombre: string
  tipo: TipoSala
  contenidos: string[]
  juegos: string[]
  // Cambia cada vez que la docente asigna un plan nuevo: el avance vuelve a cero.
  asignacion: string
}

export interface MiembroSala {
  estudianteId: string
  salaId: string
}

// Lo que ve el dispositivo del alumno antes de entrar: solo nombre de pila y avatar.
export interface PerfilAlumno {
  id: string
  nombre: string
  avatar: string
  avatarTienda?: string
  color: string
  // Ya entró desde otro dispositivo: no se puede tomar hasta que salga o la docente lo libere.
  ocupado: boolean
}

// Dispositivo de alumno con sesión abierta (en espera o en una sala).
export interface Conectado {
  estudianteId: string
  desde: string
  // Última vez que el dispositivo dio señales.
  vistoEn: string
}

// Avance de un niño en el plan de su sala. `paso` cuenta actividades ya logradas
// (paso === 3 × contenidos: terminó y pasa a los juegos).
export interface Progreso {
  paso: number
  // Veces que repitió la actividad actual sin lograr el 60 %.
  repeticiones: number
}

export interface ProgresoSala extends Progreso {
  estudianteId: string
  salaId: string
  asignacion: string
  necesitaAyuda: boolean
  actualizado: string
}

// Estado del alumno conectado: dónde está y cómo va.
export interface EstadoAlumno {
  estudiante: Estudiante
  sala: Pick<Sala, 'id' | 'nombre' | 'tipo' | 'contenidos' | 'juegos' | 'asignacion'> | null
  progreso: Progreso
  avataresComprados: string[]
}

export interface MensajeSala {
  id: number
  estudianteId: string
  nombre: string
  avatar: string
  avatarTienda?: string
  color: string
  picto: string
  enviadoEn: string
}
