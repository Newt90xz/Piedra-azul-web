import { AVATARES_TIENDA } from '../contenido/tienda.ts'
import type {
  Conectado,
  Curso,
  Docente,
  Estudiante,
  MensajeSala,
  MiembroSala,
  Observacion,
  ProgresoSala,
  RegistroEmocion,
  ResultadoActividad,
  Sala,
} from '../dominio/tipos.ts'
import { guardarCredencial, leerCredencial, olvidarCredencial } from './dispositivo.ts'
import { AJUSTES_POR_DEFECTO, type Repositorio } from './repositorio.ts'

// Implementación de demostración: guarda todo en localStorage del navegador.
// Sirve para diseñar y probar las pantallas antes de conectar Supabase.

// v2: salas con plan, sesiones de dispositivo, tienda y playground.
const CLAVE = 'leer-para-todos/demo-v2'
const CLAVE_SESION = 'leer-para-todos/sesion'

interface Estado {
  docentes: Docente[]
  cursos: Curso[]
  estudiantes: Estudiante[]
  emociones: RegistroEmocion[]
  resultados: ResultadoActividad[]
  observaciones: Observacion[]
  salas: Sala[]
  miembros: MiembroSala[]
  conectados: Conectado[]
  progreso: ProgresoSala[]
  compras: { estudianteId: string; avatarId: string }[]
  mensajes: (Omit<MensajeSala, 'nombre' | 'avatar' | 'avatarTienda' | 'color'> & { salaId: string })[]
}

// Igual que la base: un dispositivo sin señales por 10 minutos libera el perfil.
const SESION_VIGENTE_MS = 10 * 60_000
const vigente = (c: Conectado) => Date.now() - new Date(c.vistoEn).getTime() < SESION_VIGENTE_MS

const id = () => crypto.randomUUID()
const haceDias = (d: number, h = 10) => {
  const f = new Date()
  f.setDate(f.getDate() - d)
  f.setHours(h, 15, 0, 0)
  return f.toISOString()
}

function semilla(): Estado {
  const docente: Docente = { id: 'docente-demo', nombre: 'Educadora de ejemplo', email: 'educadora@piedraazul.cl' }
  const cursos: Curso[] = [
    { id: 'kinder-a', nombre: 'Kínder A', docenteId: docente.id },
    { id: 'prekinder-a', nombre: 'Pre-Kínder A', docenteId: docente.id },
  ]
  const ninos: [string, string, string, 1 | 2 | 3][] = [
    ['Sofía', '🦊', '#fde2c8', 2],
    ['Tomás', '🦖', '#d3f2e3', 2],
    ['Martina', '🐬', '#cfe8fb', 1],
    ['Benjamín', '🚒', '#f6d1d1', 3],
    ['Isidora', '🦄', '#e4dcf7', 1],
    ['Lucas', '⚽', '#fff3c4', 2],
  ]
  const estudiantes: Estudiante[] = ninos.map(([nombre, avatar, color, nivel], i) => ({
    id: `est-${i + 1}`,
    cursoId: 'kinder-a',
    nombre,
    avatar,
    color,
    activo: true,
    nivelHabilitado: nivel,
    monedas: 40 + i * 25,
    ajustes: { ...AJUSTES_POR_DEFECTO, reducirAnimaciones: i === 2, modoImagen: i === 4 ? 'foto' : 'mixto' },
  }))

  // Historial inventado para que el panel de avance tenga algo que mostrar.
  const items = ['A', 'E', 'I', 'O', 'U', 'M', 'P', 'L', 'S', 'T']
  const dificiles: Record<string, string[]> = { 'est-1': ['P'], 'est-2': ['L', 'S'], 'est-3': ['E', 'M'], 'est-6': ['T'] }
  const resultados: ResultadoActividad[] = []
  const emociones: RegistroEmocion[] = []
  const ciclo = ['alegria', 'calma', 'alegria', 'tristeza', 'alegria', 'enojo'] as const
  estudiantes.forEach((e, n) => {
    for (let d = 0; d < 9; d += 1 + (n % 2)) {
      emociones.push({ id: id(), estudianteId: e.id, emocion: ciclo[(n + d) % ciclo.length], fecha: haceDias(d, 9) })
      const rondas = [0, 1, 2, 3, 4].map((k) => {
        const item = items[(n + d + k * 3) % items.length]
        const cuesta = dificiles[e.id]?.includes(item)
        const intentos = cuesta ? 2 + ((d + k) % 2) : 1 + ((n + d + k) % 4 === 0 ? 1 : 0)
        return { item, intentos, acertada: intentos < 3 }
      })
      const primeros = rondas.filter((r) => r.intentos === 1).length
      resultados.push({
        id: id(),
        estudianteId: e.id,
        actividadId: d % 2 ? 'sonido-inicial' : 'caza-letras',
        fecha: haceDias(d, 10),
        duracionMs: 90_000 + ((n * 17 + d * 23) % 70) * 1000,
        rondas,
        estrellas: primeros >= 4 ? 3 : primeros >= 2 ? 2 : 1,
        monedas: primeros * 10 + (5 - primeros) * 3,
      })
    }
  })
  const observaciones: Observacion[] = [
    { id: id(), estudianteId: 'est-2', texto: 'Practicar la L y la S con canciones y rimas.', fecha: haceDias(3) },
  ]
  const salas: Sala[] = [
    {
      id: 'sala-silabas',
      cursoId: 'kinder-a',
      nombre: 'Grupo Sílabas',
      tipo: 'trabajo',
      contenidos: ['vocales', 'silabas-m'],
      juegos: ['aplausos', 'choque-sonidos'],
      asignacion: id(),
    },
    { id: 'sala-patio', cursoId: 'kinder-a', nombre: 'Patio', tipo: 'playground', contenidos: [], juegos: [], asignacion: id() },
  ]
  return {
    docentes: [docente],
    cursos,
    estudiantes,
    emociones,
    resultados,
    observaciones,
    salas,
    miembros: [],
    conectados: [],
    progreso: [],
    compras: [],
    mensajes: [],
  }
}

function leer(): Estado {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) return JSON.parse(crudo) as Estado
  } catch {
    // Almacenamiento bloqueado o dañado: se vuelve a la semilla.
  }
  const inicial = semilla()
  escribir(inicial)
  return inicial
}

function escribir(e: Estado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(e))
  } catch {
    // Sin almacenamiento disponible la demo sigue funcionando en memoria.
  }
}

function mutar(f: (e: Estado) => void) {
  const e = leer()
  f(e)
  escribir(e)
}

const porFecha = <T extends { fecha: string }>(a: T[]) => [...a].sort((x, y) => y.fecha.localeCompare(x.fecha))

export const repositorioDemo: Repositorio = {
  async iniciarSesion(email) {
    // Demostración: acepta cualquier credencial válida. La autenticación
    // real (RF-03) la hará Supabase Auth.
    const docente = { ...leer().docentes[0], email }
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(docente))
    return docente
  },
  async cerrarSesion() {
    sessionStorage.removeItem(CLAVE_SESION)
  },
  async esperarSesion() {
    // La sesión de la demo se lee al instante.
  },
  docenteActual() {
    try {
      const crudo = sessionStorage.getItem(CLAVE_SESION)
      return crudo ? (JSON.parse(crudo) as Docente) : null
    } catch {
      return null
    }
  },
  alCambiarSesion() {
    // La sesión de la demo no vence.
    return () => {}
  },

  async listarCursos() {
    return leer().cursos
  },
  async crearCurso(nombre) {
    const docente = repositorioDemo.docenteActual() ?? leer().docentes[0]
    const curso: Curso = { id: id(), nombre, docenteId: docente.id }
    mutar((e) => e.cursos.push(curso))
    return curso
  },
  async eliminarCurso(cursoId) {
    const ids = leer()
      .estudiantes.filter((x) => x.cursoId === cursoId)
      .map((x) => x.id)
    for (const estudianteId of ids) await repositorioDemo.eliminarEstudiante(estudianteId)
    mutar((e) => {
      const salas = new Set(e.salas.filter((s) => s.cursoId === cursoId).map((s) => s.id))
      e.salas = e.salas.filter((s) => !salas.has(s.id))
      e.miembros = e.miembros.filter((m) => !salas.has(m.salaId))
      e.cursos = e.cursos.filter((c) => c.id !== cursoId)
    })
  },
  async listarEstudiantes(cursoId) {
    return leer().estudiantes.filter((e) => e.cursoId === cursoId)
  },
  async obtenerEstudiante(estudianteId) {
    return leer().estudiantes.find((e) => e.id === estudianteId) ?? null
  },
  async guardarEstudiante(datos) {
    let guardado: Estudiante
    mutar((e) => {
      if ('id' in datos) {
        guardado = datos
        e.estudiantes = e.estudiantes.map((x) => (x.id === datos.id ? datos : x))
      } else {
        guardado = { ...datos, id: id(), monedas: 0 }
        e.estudiantes.push(guardado)
      }
    })
    return guardado!
  },

  async eliminarEstudiante(estudianteId) {
    mutar((e) => {
      e.estudiantes = e.estudiantes.filter((x) => x.id !== estudianteId)
      e.emociones = e.emociones.filter((x) => x.estudianteId !== estudianteId)
      e.resultados = e.resultados.filter((x) => x.estudianteId !== estudianteId)
      e.observaciones = e.observaciones.filter((x) => x.estudianteId !== estudianteId)
      e.miembros = e.miembros.filter((m) => m.estudianteId !== estudianteId)
      e.conectados = e.conectados.filter((c) => c.estudianteId !== estudianteId)
      e.progreso = e.progreso.filter((x) => x.estudianteId !== estudianteId)
      e.compras = e.compras.filter((x) => x.estudianteId !== estudianteId)
      e.mensajes = e.mensajes.filter((x) => x.estudianteId !== estudianteId)
    })
  },

  async registrarEmocion(estudianteId, emocion) {
    mutar((e) => e.emociones.push({ id: id(), estudianteId, emocion, fecha: new Date().toISOString() }))
  },
  async listarEmociones(estudianteId) {
    return porFecha(leer().emociones.filter((x) => x.estudianteId === estudianteId))
  },
  async ultimasEmociones(cursoId) {
    const e = leer()
    const ids = new Set(e.estudiantes.filter((x) => x.cursoId === cursoId).map((x) => x.id))
    const ultimas = new Map<string, RegistroEmocion>()
    for (const r of porFecha(e.emociones)) if (ids.has(r.estudianteId) && !ultimas.has(r.estudianteId)) ultimas.set(r.estudianteId, r)
    return [...ultimas.values()].map(({ estudianteId, emocion, fecha }) => ({ estudianteId, emocion, fecha }))
  },

  async guardarResultado(r) {
    mutar((e) => {
      if (e.resultados.some((x) => x.id === r.id)) return
      e.resultados.push(r)
      const est = e.estudiantes.find((x) => x.id === r.estudianteId)
      if (est) est.monedas += r.monedas
    })
  },
  async listarResultados({ estudianteId, cursoId, desde }) {
    const e = leer()
    const ids = cursoId ? new Set(e.estudiantes.filter((x) => x.cursoId === cursoId).map((x) => x.id)) : null
    return porFecha(
      e.resultados.filter(
        (r) =>
          (!estudianteId || r.estudianteId === estudianteId) &&
          (!ids || ids.has(r.estudianteId)) &&
          (!desde || new Date(r.fecha) >= desde),
      ),
    )
  },

  async agregarObservacion(estudianteId, texto) {
    mutar((e) => e.observaciones.push({ id: id(), estudianteId, texto, fecha: new Date().toISOString() }))
  },
  async listarObservaciones(estudianteId) {
    return porFecha(leer().observaciones.filter((x) => x.estudianteId === estudianteId))
  },

  async actualizarObservacion(obsId, texto) {
    mutar((e) => (e.observaciones = e.observaciones.map((o) => (o.id === obsId ? { ...o, texto } : o))))
  },
  async eliminarObservacion(obsId) {
    mutar((e) => (e.observaciones = e.observaciones.filter((o) => o.id !== obsId)))
  },

  async listarSalas(cursoId) {
    return leer().salas.filter((s) => s.cursoId === cursoId)
  },
  async crearSala(cursoId, nombre, tipo) {
    const e = leer()
    if (e.salas.some((s) => s.cursoId === cursoId && s.nombre === nombre)) throw new Error('duplicate key value')
    const sala: Sala = { id: id(), cursoId, nombre, tipo, contenidos: [], juegos: [], asignacion: id() }
    mutar((x) => x.salas.push(sala))
    return sala
  },
  async renombrarSala(salaId, nombre) {
    mutar((e) => (e.salas = e.salas.map((s) => (s.id === salaId ? { ...s, nombre } : s))))
  },
  async asignarPlan(salaId, contenidos, juegos) {
    mutar((e) => (e.salas = e.salas.map((s) => (s.id === salaId ? { ...s, contenidos, juegos, asignacion: id() } : s))))
  },
  async eliminarSala(salaId) {
    mutar((e) => {
      e.salas = e.salas.filter((s) => s.id !== salaId)
      e.miembros = e.miembros.filter((m) => m.salaId !== salaId)
      e.progreso = e.progreso.filter((x) => x.salaId !== salaId)
      e.mensajes = e.mensajes.filter((x) => x.salaId !== salaId)
    })
  },
  async listarMiembros(cursoId) {
    const e = leer()
    const salas = new Set(e.salas.filter((s) => s.cursoId === cursoId).map((s) => s.id))
    return e.miembros.filter((m) => salas.has(m.salaId))
  },
  async conectarEstudiante(salaId, estudianteId) {
    mutar((e) => (e.miembros = [...e.miembros.filter((m) => m.estudianteId !== estudianteId), { estudianteId, salaId }]))
  },
  async desconectarEstudiante(estudianteId) {
    mutar((e) => (e.miembros = e.miembros.filter((m) => m.estudianteId !== estudianteId)))
  },
  async vaciarSala(salaId) {
    mutar((e) => (e.miembros = e.miembros.filter((m) => m.salaId !== salaId)))
  },
  async listarConectados(cursoId) {
    const e = leer()
    const ids = new Set(e.estudiantes.filter((x) => x.cursoId === cursoId).map((x) => x.id))
    return e.conectados.filter((c) => ids.has(c.estudianteId))
  },
  async cerrarDispositivo(estudianteId) {
    mutar((e) => (e.conectados = e.conectados.filter((c) => c.estudianteId !== estudianteId)))
  },
  async listarProgreso(cursoId) {
    const e = leer()
    const salas = new Set(e.salas.filter((s) => s.cursoId === cursoId).map((s) => s.id))
    return e.progreso.filter((x) => salas.has(x.salaId))
  },
  async marcarApoyado(estudianteId) {
    mutar((e) => (e.progreso = e.progreso.map((x) => (x.estudianteId === estudianteId ? { ...x, necesitaAyuda: false } : x))))
  },
  async mensajesSala(salaId) {
    return mensajesDe(leer(), salaId)
  },

  // La demo guarda todo en un solo navegador: la sesión del «dispositivo» es la
  // credencial local más una fila en `conectados` que la docente puede cerrar.
  async perfilesAlumnos() {
    const e = leer()
    return e.estudiantes
      .filter((x) => x.activo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((x) => {
        const c = e.conectados.find((c) => c.estudianteId === x.id)
        return { id: x.id, nombre: x.nombre, avatar: x.avatar, avatarTienda: x.avatarTienda, color: x.color, ocupado: !!c && vigente(c) }
      })
  },
  async entrarComoAlumno(estudianteId) {
    const e = leer()
    if (!e.estudiantes.some((x) => x.id === estudianteId && x.activo)) throw new Error('perfil_invalido')
    const c = e.conectados.find((x) => x.estudianteId === estudianteId)
    if (c && vigente(c)) throw new Error('perfil_ocupado')
    const ahora = new Date().toISOString()
    mutar((x) => (x.conectados = [...x.conectados.filter((y) => y.estudianteId !== estudianteId), { estudianteId, desde: ahora, vistoEn: ahora }]))
    guardarCredencial({ estudianteId, token: 'demo' })
  },
  alumnoDelDispositivo() {
    return leerCredencial()?.estudianteId ?? null
  },
  async salirComoAlumno() {
    const c = leerCredencial()
    olvidarCredencial()
    if (c) await repositorioDemo.cerrarDispositivo(c.estudianteId)
  },
  olvidarAlumno() {
    olvidarCredencial()
  },
  async estadoAlumno() {
    const c = leerCredencial()
    if (!c) return null
    const e = leer()
    if (!e.conectados.some((x) => x.estudianteId === c.estudianteId)) return null
    mutar((x) => (x.conectados = x.conectados.map((y) => (y.estudianteId === c.estudianteId ? { ...y, vistoEn: new Date().toISOString() } : y))))
    const m = e.miembros.find((x) => x.estudianteId === c.estudianteId)
    const sala = m ? e.salas.find((s) => s.id === m.salaId) : undefined
    const p = e.progreso.find((x) => x.estudianteId === c.estudianteId)
    const vale = sala && p && p.salaId === sala.id && p.asignacion === sala.asignacion
    const estudiante = e.estudiantes.find((x) => x.id === c.estudianteId)
    if (!estudiante?.activo) return null
    return {
      estudiante,
      sala: sala ? { id: sala.id, nombre: sala.nombre, tipo: sala.tipo, contenidos: sala.contenidos, juegos: sala.juegos, asignacion: sala.asignacion } : null,
      progreso: vale ? { paso: p.paso, repeticiones: p.repeticiones } : { paso: 0, repeticiones: 0 },
      avataresComprados: e.compras.filter((x) => x.estudianteId === c.estudianteId).map((x) => x.avatarId),
    }
  },
  async registrarProgreso(asignacion, paso, aprobado) {
    const estudianteId = alumnoConectado()
    const e = leer()
    const m = e.miembros.find((x) => x.estudianteId === estudianteId)
    const sala = m && e.salas.find((s) => s.id === m.salaId && s.tipo === 'trabajo')
    if (!sala) throw new Error('sin_sala')
    if (sala.asignacion !== asignacion) throw new Error('plan_cambiado')
    const previo = e.progreso.find((x) => x.estudianteId === estudianteId)
    const p: ProgresoSala =
      previo && previo.salaId === sala.id && previo.asignacion === sala.asignacion
        ? { ...previo }
        : { estudianteId, salaId: sala.id, asignacion, paso: 0, repeticiones: 0, necesitaAyuda: false, actualizado: '' }
    if (p.paso === paso && p.paso < sala.contenidos.length * 3) {
      if (aprobado) Object.assign(p, { paso: p.paso + 1, repeticiones: 0, necesitaAyuda: false })
      else Object.assign(p, { repeticiones: p.repeticiones + 1, necesitaAyuda: p.repeticiones + 1 >= 2 })
    }
    p.actualizado = new Date().toISOString()
    mutar((x) => (x.progreso = [...x.progreso.filter((y) => y.estudianteId !== estudianteId), p]))
    return { paso: p.paso, repeticiones: p.repeticiones }
  },
  async comprarAvatar(avatarId) {
    const estudianteId = alumnoConectado()
    const precio = AVATARES_TIENDA.find((a) => a.id === avatarId)?.precio
    if (precio === undefined) throw new Error('avatar_invalido')
    mutar((e) => {
      const est = e.estudiantes.find((x) => x.id === estudianteId)
      if (!est) throw new Error('sin_sesion')
      if (!e.compras.some((x) => x.estudianteId === estudianteId && x.avatarId === avatarId)) {
        if (est.monedas < precio) throw new Error('monedas_insuficientes')
        est.monedas -= precio
        e.compras.push({ estudianteId, avatarId })
      }
      est.avatarTienda = avatarId
    })
  },
  async usarAvatar(avatarId) {
    const estudianteId = alumnoConectado()
    mutar((e) => {
      if (avatarId && !e.compras.some((x) => x.estudianteId === estudianteId && x.avatarId === avatarId)) throw new Error('avatar_invalido')
      const est = e.estudiantes.find((x) => x.id === estudianteId)
      if (est) est.avatarTienda = avatarId ?? undefined
    })
  },
  async mensajesPlayground() {
    const estudianteId = alumnoConectado()
    const e = leer()
    const m = e.miembros.find((x) => x.estudianteId === estudianteId)
    const sala = m && e.salas.find((s) => s.id === m.salaId && s.tipo === 'playground')
    return sala ? mensajesDe(e, sala.id) : []
  },
  async enviarMensaje(picto) {
    const estudianteId = alumnoConectado()
    const e = leer()
    const m = e.miembros.find((x) => x.estudianteId === estudianteId)
    const sala = m && e.salas.find((s) => s.id === m.salaId && s.tipo === 'playground')
    if (!sala) throw new Error('sin_playground')
    const ultimo = e.mensajes.filter((x) => x.estudianteId === estudianteId).at(-1)
    if (ultimo && Date.now() - new Date(ultimo.enviadoEn).getTime() < 2000) return
    mutar((x) => x.mensajes.push({ id: x.mensajes.length + 1, salaId: sala.id, estudianteId, picto, enviadoEn: new Date().toISOString() }))
  },
}

function alumnoConectado() {
  const c = leerCredencial()
  if (!c) throw new Error('sin_sesion')
  return c.estudianteId
}

// Más recientes primero, como la base (máximo 40).
function mensajesDe(e: Estado, salaId: string): MensajeSala[] {
  return e.mensajes
    .filter((m) => m.salaId === salaId)
    .slice(-40)
    .reverse()
    .flatMap((m) => {
      const est = e.estudiantes.find((x) => x.id === m.estudianteId)
      return est ? [{ ...m, nombre: est.nombre, avatar: est.avatar, avatarTienda: est.avatarTienda, color: est.color }] : []
    })
}

export function reiniciarDemo() {
  escribir(semilla())
}
