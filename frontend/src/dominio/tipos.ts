// Modelo de dominio. Cada interfaz corresponde a una tabla futura en Supabase.

import type { Categoria } from '../contenido/actividades.ts'
import type { EspacioOpcional } from '../contenido/tienda.ts'

export type ModoImagen = 'foto' | 'picto' | 'mixto'
export type TamanoLetra = 'normal' | 'grande' | 'muy-grande'
export type Emocion = 'alegria' | 'calma' | 'tristeza' | 'enojo'
export type Tematica = 'animales' | 'dinosaurios' | 'futbol' | 'oceano' | 'vehiculos' | 'piratas'
// Nivel de exigencia de los desafíos (contenido/exigencia.ts): cuántas opciones,
// rondas y ayudas tiene cada actividad, y cuánto hay que lograr para pasar.
export type Exigencia = 'inicial' | 'intermedio' | 'avanzado'
export type Nivel = 1 | 2 | 3
export type Expresion = 'feliz' | 'triste' | 'enojado' | 'tranquilo'

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
  exigencia: Exigencia
}

// RF-24: personaje por capas. Solo guarda ids (contenido/tienda.ts), sin datos del niño.
export interface Personaje {
  // 1 a 6 (contenido/personaje.ts).
  piel: number
  colorPelo: string
  pelo: string
  ojos: string
  expresion: Expresion
  manoArriba: boolean
  // Lentes, audífono o silla de ruedas: gratis para todos.
  apoyos: string[]
  puestos: Partial<Record<EspacioOpcional, string>>
}

// RNF-09: datos mínimos. Solo nombre de pila, sin RUT ni fecha de nacimiento.
export interface Estudiante {
  id: string
  cursoId: string
  nombre: string
  // Emoji anterior al personaje: ya no se muestra, pero la base aún lo exige.
  avatar: string
  color: string
  fotoUrl?: string
  activo: boolean
  // RF-09 / RF-15: nivel más alto habilitado por avance o por la docente.
  nivelHabilitado: Nivel
  monedas: number
  personaje?: Personaje
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
  // Qué mide esta ronda: un mismo juego puede medir cosas distintas.
  categoria?: Categoria
  // Desde que aparece hasta que se resuelve.
  tiempoMs?: number
  // Se le iluminó la respuesta correcta.
  revelada?: boolean
  // Métricas propias de cada juego (acotadas).
  detalle?: Record<string, unknown>
}

// Foto de la partida al jugarla (nulo lo que no aplica): si el catálogo cambia o
// una actividad se borra, sus partidas no desaparecen del avance.
export interface ContextoPartida {
  // Tipo de ronda: elegir, construir, escribir…
  mecanica?: string
  contenidoId?: string
  paso?: number
  nivel?: Nivel
  oa?: string[]
  salaId?: string
  asignacion?: string
  practica?: boolean
  parametros?: ParametrosJuego
  version?: number
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
  contexto?: ContextoPartida
}

export interface Observacion {
  id: string
  estudianteId: string
  texto: string
  fecha: string
}

// Salas: la docente las crea y asigna a cada niño (el niño no elige sala).
// Una sala de trabajo tiene un plan: contenidos MINEDUC en orden (cada uno con 3
// actividades). Al terminarlo, el niño pasa solo a la sala conectada: otra de
// trabajo o un recreo, donde se hace la actividad que elige la docente.
export type TipoSala = 'trabajo' | 'recreo'
export type ActividadRecreo = 'parque' | 'dibujo' | 'globos' | 'juegos'

// Con qué se juega una actividad configurable: «{ letras: ['m', 'p', 's'] }».
export type ParametrosJuego = Record<string, unknown>

// Un paso del plan de la sala. `juego` es una actividad de un contenido
// («silabas-m-2») o una configurable («escucha-letra») con sus parámetros.
export interface PasoSala {
  juego: string
  parametros?: ParametrosJuego
  // Nombre de la plantilla de la que salió, para reconocerla en el plan.
  titulo?: string
}

// Una configuración guardada para reutilizarla (RF-15). Al agregarla a un plan se
// copia: editarla después no le cambia la actividad a quien ya la está jugando.
export interface PlantillaActividad {
  id: string
  nombre: string
  juegoId: string
  parametros: ParametrosJuego
  // Viene con la app: no se edita ni se borra.
  sistema?: boolean
}

export interface Sala {
  id: string
  cursoId: string
  nombre: string
  tipo: TipoSala
  // Solo trabajo: los pasos, en orden. `contenidos` queda para versiones anteriores de la app.
  plan: PasoSala[]
  contenidos: string[]
  // Solo recreo: qué se hace ahí, y los juegos si la actividad es 'juegos'.
  actividad: ActividadRecreo
  juegos: string[]
  // Solo trabajo: a dónde pasa el niño al terminar.
  siguienteSala?: string
  // Cambia cada vez que la docente asigna un plan nuevo: el avance vuelve a cero.
  asignacion: string
}

export interface MiembroSala {
  estudianteId: string
  salaId: string
}

// Lo que ve el dispositivo del alumno antes de entrar: solo nombre de pila y personaje.
export interface PerfilAlumno {
  id: string
  nombre: string
  personaje?: Personaje
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
  sala: (Pick<Sala, 'id' | 'nombre' | 'tipo' | 'actividad' | 'plan' | 'contenidos' | 'juegos' | 'siguienteSala' | 'asignacion'> & { siguienteTipo?: TipoSala }) | null
  progreso: Progreso
  articulosComprados: string[]
}

export interface MensajeSala {
  id: number
  estudianteId: string
  nombre: string
  personaje?: Personaje
  color: string
  picto: string
  enviadoEn: string
}

// Compañero en el parque. `ficha` lo identifica en el canal en tiempo real sin
// revelar su id (RNF-09); nombre y personaje llegan solo por la función validada.
export interface MiembroParque {
  ficha: string
  mia: boolean
  nombre: string
  color: string
  personaje?: Personaje
}

export interface DatosParque {
  // Nombre secreto del canal de esta sala; null si el alumno ya no está en un playground.
  canal: string | null
  miembros: MiembroParque[]
}

// x e y en porcentaje del parque.
export interface PosicionParque {
  ficha: string
  x: number
  y: number
}

export interface AvisosParque {
  // Quiénes están conectados y a dónde van.
  alMoverse: (posiciones: PosicionParque[]) => void
  alDecir: (ficha: string, picto: string) => void
}

export interface ConexionParque {
  mover: (x: number, y: number) => void
  decir: (picto: string) => void
  cerrar: () => void
}
