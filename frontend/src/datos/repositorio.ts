import type {
  Ajustes,
  Conectado,
  Curso,
  Docente,
  Emocion,
  EstadoAlumno,
  Estudiante,
  MensajeSala,
  MiembroSala,
  Observacion,
  PerfilAlumno,
  Progreso,
  ProgresoSala,
  RegistroEmocion,
  ResultadoActividad,
  Sala,
  TipoSala,
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
  crearSala(cursoId: string, nombre: string, tipo: TipoSala): Promise<Sala>
  renombrarSala(id: string, nombre: string): Promise<void>
  // Plan de una sala de trabajo. Genera una asignación nueva: el avance de
  // quienes están en ella vuelve a la primera actividad.
  asignarPlan(salaId: string, contenidos: string[], juegos: string[]): Promise<void>
  eliminarSala(id: string): Promise<void>
  // Miembros de todas las salas del curso.
  listarMiembros(cursoId: string): Promise<MiembroSala[]>
  // Pone al alumno en la sala (si estaba en otra, lo mueve).
  conectarEstudiante(salaId: string, estudianteId: string): Promise<void>
  // Lo saca de su sala: vuelve a la espera.
  desconectarEstudiante(estudianteId: string): Promise<void>
  vaciarSala(salaId: string): Promise<void>
  // Dispositivos de alumnos del curso con sesión abierta.
  listarConectados(cursoId: string): Promise<Conectado[]>
  // Cierra la sesión del dispositivo del alumno: vuelve a elegir su perfil.
  cerrarDispositivo(estudianteId: string): Promise<void>
  listarProgreso(cursoId: string): Promise<ProgresoSala[]>
  // La docente ya fue a ayudarlo: se apaga el aviso.
  marcarApoyado(estudianteId: string): Promise<void>
  mensajesSala(salaId: string): Promise<MensajeSala[]>

  // Dispositivo del alumno (sin sesión de docente). Al entrar, el perfil
  // entrega una credencial que guarda el repositorio (como la sesión de la
  // docente) y que exigen las demás llamadas del alumno.
  perfilesAlumnos(): Promise<PerfilAlumno[]>
  // Rechaza con Error('perfil_ocupado' | 'perfil_invalido').
  entrarComoAlumno(estudianteId: string): Promise<void>
  // Alumno conectado desde este dispositivo, o null.
  alumnoDelDispositivo(): string | null
  // Cierra la sesión del dispositivo y olvida la credencial (aunque falle el aviso al servidor).
  salirComoAlumno(): Promise<void>
  // Olvida la credencial sin avisar al servidor (p. ej. la docente ya la cerró).
  olvidarAlumno(): void
  // null si la credencial ya no vale (la docente cerró el dispositivo o otro tomó el perfil).
  estadoAlumno(): Promise<EstadoAlumno | null>
  // Termina la actividad `paso` del plan `asignacion` con el resultado `resultadoId`
  // (reenviar el mismo no cuenta dos veces). Si el plan cambió entretanto rechaza
  // con Error('plan_cambiado'). Devuelve el avance actualizado.
  registrarProgreso(asignacion: string, paso: number, aprobado: boolean, resultadoId: string): Promise<Progreso>
  // Compra (y se pone) un avatar de la tienda. Rechaza con Error('monedas_insuficientes').
  comprarAvatar(avatarId: string): Promise<void>
  // Se pone un avatar ya comprado; null vuelve al que eligió la docente.
  usarAvatar(avatarId: string | null): Promise<void>
  mensajesPlayground(): Promise<MensajeSala[]>
  enviarMensaje(picto: string): Promise<void>
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
