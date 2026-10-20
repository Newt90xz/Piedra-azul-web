import type {
  Curso,
  Docente,
  Estudiante,
  MiembroSala,
  Observacion,
  RegistroEmocion,
  ResultadoActividad,
  Sala,
} from '../dominio/tipos.ts'
import { AJUSTES_POR_DEFECTO, type Repositorio } from './repositorio.ts'

// Implementación de demostración: guarda todo en localStorage del navegador.
// Sirve para diseñar y probar las pantallas antes de conectar Supabase.

const CLAVE = 'leer-para-todos/demo-v1'
const CLAVE_SESION = 'leer-para-todos/sesion'

interface Estado {
  docentes: Docente[]
  cursos: Curso[]
  estudiantes: Estudiante[]
  emociones: RegistroEmocion[]
  resultados: ResultadoActividad[]
  observaciones: Observacion[]
  salas?: Sala[]
  miembros?: MiembroSala[]
}

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
  return { docentes: [docente], cursos, estudiantes, emociones, resultados, observaciones }
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
      e.miembros = (e.miembros ?? []).filter((m) => m.estudianteId !== estudianteId)
    })
  },

  async registrarEmocion(estudianteId, emocion) {
    mutar((e) => e.emociones.push({ id: id(), estudianteId, emocion, fecha: new Date().toISOString() }))
  },
  async listarEmociones(estudianteId) {
    return porFecha(leer().emociones.filter((x) => x.estudianteId === estudianteId))
  },

  async guardarResultado(r) {
    mutar((e) => {
      if (e.resultados.some((x) => x.id === r.id)) return
      e.resultados.push(r)
      const est = e.estudiantes.find((x) => x.id === r.estudianteId)
      if (est) est.monedas += r.monedas
    })
  },
  async listarResultados({ estudianteId, cursoId }) {
    const e = leer()
    const ids = cursoId ? new Set(e.estudiantes.filter((x) => x.cursoId === cursoId).map((x) => x.id)) : null
    return porFecha(
      e.resultados.filter((r) => (!estudianteId || r.estudianteId === estudianteId) && (!ids || ids.has(r.estudianteId))),
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
    return (leer().salas ?? []).filter((s) => s.cursoId === cursoId)
  },
  async crearSala(cursoId, nombre, cupos) {
    const sala: Sala = { id: id(), cursoId, nombre, abierta: true, cupos }
    mutar((e) => (e.salas = [...(e.salas ?? []), sala]))
    return sala
  },
  async actualizarSala(salaId, cambios) {
    mutar((e) => (e.salas = (e.salas ?? []).map((s) => (s.id === salaId ? { ...s, ...cambios } : s))))
  },
  async eliminarSala(salaId) {
    mutar((e) => {
      e.salas = (e.salas ?? []).filter((s) => s.id !== salaId)
      e.miembros = (e.miembros ?? []).filter((m) => m.salaId !== salaId)
    })
  },
  async listarMiembros(cursoId) {
    const e = leer()
    const salas = new Set((e.salas ?? []).filter((s) => s.cursoId === cursoId).map((s) => s.id))
    return (e.miembros ?? []).filter((m) => salas.has(m.salaId))
  },
  async conectarEstudiante(salaId, estudianteId) {
    mutar((e) => (e.miembros = [...(e.miembros ?? []).filter((m) => m.estudianteId !== estudianteId), { estudianteId, salaId }]))
  },
  async desconectarEstudiante(estudianteId) {
    mutar((e) => (e.miembros = (e.miembros ?? []).filter((m) => m.estudianteId !== estudianteId)))
  },

  async vaciarSala(salaId, cerrar) {
    mutar((e) => {
      if (cerrar) e.salas = (e.salas ?? []).map((s) => (s.id === salaId ? { ...s, abierta: false } : s))
      e.miembros = (e.miembros ?? []).filter((m) => m.salaId !== salaId)
    })
  },

  // La demo guarda todo en un solo navegador, así que no distingue dispositivos.
  async salasAbiertas() {
    const e = leer()
    return (e.salas ?? [])
      .filter((s) => s.abierta)
      .map((s) => ({
        id: s.id,
        nombre: s.nombre,
        curso: e.cursos.find((c) => c.id === s.cursoId)?.nombre ?? '',
        cupos: s.cupos,
        ocupados: (e.miembros ?? []).filter((m) => m.salaId === s.id).length,
      }))
  },
  async perfilesDeSala(salaId) {
    const e = leer()
    const sala = (e.salas ?? []).find((s) => s.id === salaId)
    if (!sala) return []
    return e.estudiantes
      .filter((x) => x.cursoId === sala.cursoId && x.activo)
      .map((x) => ({
        id: x.id,
        nombre: x.nombre,
        avatar: x.avatar,
        color: x.color,
        salaId: (e.miembros ?? []).find((m) => m.estudianteId === x.id)?.salaId ?? null,
      }))
  },
  async unirseASala(salaId, estudianteId) {
    const e = leer()
    const sala = (e.salas ?? []).find((s) => s.id === salaId)
    if (!sala) throw new Error('sala_inexistente')
    const yaEsta = (e.miembros ?? []).some((m) => m.estudianteId === estudianteId && m.salaId === salaId)
    if (yaEsta) return
    if (!sala.abierta) throw new Error('sala_cerrada')
    if ((e.miembros ?? []).filter((m) => m.salaId === salaId).length >= sala.cupos) throw new Error('sala_llena')
    await repositorioDemo.conectarEstudiante(salaId, estudianteId)
  },
  async salirDeSala(estudianteId) {
    await repositorioDemo.desconectarEstudiante(estudianteId)
  },
  async salaDeEstudiante(estudianteId) {
    const e = leer()
    const m = (e.miembros ?? []).find((x) => x.estudianteId === estudianteId)
    const sala = m && (e.salas ?? []).find((s) => s.id === m.salaId)
    return sala ? { id: sala.id, nombre: sala.nombre } : null
  },
}

export function reiniciarDemo() {
  escribir(semilla())
}
