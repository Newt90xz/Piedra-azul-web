import type {
  Ajustes,
  Curso,
  Docente,
  Emocion,
  Estudiante,
  Observacion,
  RegistroEmocion,
  ResultadoActividad,
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

  registrarEmocion(estudianteId: string, emocion: Emocion): Promise<void>
  listarEmociones(estudianteId: string): Promise<RegistroEmocion[]>

  // El id lo genera quien llama, una vez por resultado: reintentar con el
  // mismo id no lo duplica (RNF-12).
  guardarResultado(r: ResultadoActividad): Promise<void>
  listarResultados(filtro: { estudianteId?: string; cursoId?: string }): Promise<ResultadoActividad[]>

  agregarObservacion(estudianteId: string, texto: string): Promise<void>
  listarObservaciones(estudianteId: string): Promise<Observacion[]>
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
