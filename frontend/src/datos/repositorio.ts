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

// Contrato único de acceso a datos. Lo implementan `repositorioSupabase`
// (el conectado) y `repositorioDemo` (localStorage, para probar pantallas).
export interface Repositorio {
  iniciarSesion(email: string, clave: string): Promise<Docente>
  cerrarSesion(): Promise<void>
  // Se resuelve cuando ya se sabe si hay una sesión guardada; hasta entonces
  // `docenteActual()` devuelve null. No bloquea la carga de la app.
  esperarSesion(): Promise<void>
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
  // La más reciente de cada estudiante del curso que tenga alguna.
  ultimasEmociones(cursoId: string): Promise<Omit<RegistroEmocion, 'id'>[]>

  // El id lo genera quien llama, una vez por resultado: reintentar con el
  // mismo id no lo duplica (RNF-12).
  guardarResultado(r: ResultadoActividad): Promise<void>
  // Más recientes primero. `desde` deja solo los de esa fecha en adelante.
  listarResultados(filtro: { estudianteId?: string; cursoId?: string; desde?: Date }): Promise<ResultadoActividad[]>

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

  // Salas: dispositivo del alumno (sin sesión de docente). Al unirse, la sala
  // entrega una credencial que guarda el repositorio (como la sesión de la
  // docente) y que exigen las demás llamadas del alumno.
  salasAbiertas(): Promise<SalaAbierta[]>
  perfilesDeSala(salaId: string): Promise<PerfilSala[]>
  // Rechaza con Error('sala_cerrada' | 'sala_llena' | 'perfil_ocupado' | 'perfil_invalido' | 'sala_inexistente').
  unirseASala(salaId: string, estudianteId: string): Promise<void>
  // Alumno conectado desde este dispositivo, o null.
  alumnoDelDispositivo(): string | null
  // Sale de la sala y olvida la credencial (aunque falle el aviso al servidor).
  salirDeSala(): Promise<void>
  // Olvida la credencial sin avisar al servidor (p. ej. la docente ya lo desconectó).
  olvidarAlumno(): void
  // null si el alumno del dispositivo ya no está en ninguna sala.
  salaDelAlumno(): Promise<SalaActual | null>
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
