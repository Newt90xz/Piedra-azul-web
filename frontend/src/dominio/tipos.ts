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
