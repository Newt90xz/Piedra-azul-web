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

// Salas de trabajo: la docente las crea; el alumno elige una abierta y luego su perfil.
export interface Sala {
  id: string
  cursoId: string
  nombre: string
  abierta: boolean
  cupos: number
}

export interface MiembroSala {
  estudianteId: string
  salaId: string
}

// Lo que ve un dispositivo de alumno antes de entrar: sin datos de niños.
export interface SalaAbierta {
  id: string
  nombre: string
  curso: string
  cupos: number
  ocupados: number
}

export interface PerfilSala {
  id: string
  nombre: string
  avatar: string
  color: string
  // Ya entró desde otro dispositivo: no se puede tomar hasta que la docente lo libere.
  ocupado: boolean
}

export interface SalaActual {
  id: string
  nombre: string
}
