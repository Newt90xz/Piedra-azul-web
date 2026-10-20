import type {
  Ajustes,
  Curso,
  Docente,
  Emocion,
  Estudiante,
  Observacion,
  MiembroSala,
  PerfilSala,
  RegistroEmocion,
  ResultadoActividad,
  Sala,
  SalaAbierta,
  SalaActual,
} from '../dominio/tipos.ts'

// Contrato único de acceso a datos. Hoy lo implementa `repositorioDemo`
// (localStorage); al conectar el backend se agrega una implementación que
// llama a la API Express / Supabase sin tocar las pantallas.
export interface Repositorio {
  iniciarSesion(email: string, clave: string): Promise<Docente>
  cerrarSesion(): Promise<void>
  docenteActual(): Docente | null
  // Avisa cuando la sesión cambia por fuera de la app (p. ej. vence el token).
  // Devuelve la función para anular la suscripción.
  alCambiarSesion(cb: (docente: Docente | null) => void): () => void

  listarCursos(): Promise<Curso[]>
  crearCurso(nombre: string): Promise<Curso>
  listarEstudiantes(cursoId: string): Promise<Estudiante[]>
  obtenerEstudiante(id: string): Promise<Estudiante | null>
  guardarEstudiante(datos: NuevoEstudiante | Estudiante): Promise<Estudiante>
  // Borra el perfil y todo su historial (resultados, emociones, observaciones).
  eliminarEstudiante(id: string): Promise<void>

  registrarEmocion(estudianteId: string, emocion: Emocion): Promise<void>
  listarEmociones(estudianteId: string): Promise<RegistroEmocion[]>

  // El id lo genera quien llama, una vez por resultado: reintentar con el
  // mismo id no lo duplica (RNF-12).
  guardarResultado(r: ResultadoActividad): Promise<void>
  listarResultados(filtro: { estudianteId?: string; cursoId?: string }): Promise<ResultadoActividad[]>

  agregarObservacion(estudianteId: string, texto: string): Promise<void>
  listarObservaciones(estudianteId: string): Promise<Observacion[]>
  actualizarObservacion(id: string, texto: string): Promise<void>
  eliminarObservacion(id: string): Promise<void>

  // Salas: gestión de la docente (requiere sesión).
  listarSalas(cursoId: string): Promise<Sala[]>
  crearSala(cursoId: string, nombre: string, cupos: number): Promise<Sala>
  actualizarSala(id: string, cambios: Partial<Pick<Sala, 'nombre' | 'abierta' | 'cupos'>>): Promise<void>
  eliminarSala(id: string): Promise<void>
  // Miembros de todas las salas del curso.
  listarMiembros(cursoId: string): Promise<MiembroSala[]>
  conectarEstudiante(salaId: string, estudianteId: string): Promise<void>
  desconectarEstudiante(estudianteId: string): Promise<void>
  // Saca a todos los alumnos de la sala; con `cerrar` además la cierra.
  vaciarSala(salaId: string, cerrar: boolean): Promise<void>

  // Salas: dispositivo del alumno (sin sesión de docente).
  salasAbiertas(): Promise<SalaAbierta[]>
  perfilesDeSala(salaId: string): Promise<PerfilSala[]>
  // Rechaza con Error('sala_cerrada' | 'sala_llena' | 'perfil_invalido' | 'sala_inexistente').
  unirseASala(salaId: string, estudianteId: string): Promise<void>
  salirDeSala(estudianteId: string): Promise<void>
  // null si el alumno ya no está en ninguna sala (p. ej. la docente lo desconectó).
  salaDeEstudiante(estudianteId: string): Promise<SalaActual | null>
}

export type NuevoEstudiante = Omit<Estudiante, 'id' | 'monedas'>

export const AJUSTES_POR_DEFECTO: Ajustes = {
  modoImagen: 'mixto',
  tamanoLetra: 'normal',
  altoContraste: false,
  reducirAnimaciones: false,
  silenciarEfectos: false,
  tematica: 'animales',
}
