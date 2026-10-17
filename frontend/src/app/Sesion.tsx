import { createContext, use, useEffect, useState, type ReactNode } from 'react'
import { repo } from '../datos/index.ts'
import { reenviarPendientes } from '../datos/pendientes.ts'
import type { Curso, Docente } from '../dominio/tipos.ts'
import { useConsulta } from '../lib/useConsulta.ts'

interface ValorSesion {
  docente: Docente | null
  // undefined mientras cargan; [] si la docente aún no tiene cursos.
  cursos: Curso[] | undefined
  errorCursos: Error | null
  recargarCursos: () => void
  crearCurso: (nombre: string) => Promise<void>
  // '' hasta conocer un curso real de la docente: las páginas no consultan con ''.
  cursoId: string
  elegirCurso: (id: string) => void
  entrar: (email: string, clave: string) => Promise<void>
  salir: () => Promise<void>
}

const SesionContexto = createContext<ValorSesion | null>(null)
const CLAVE_CURSO = 'leer-para-todos/curso'

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [docente, setDocente] = useState(() => repo.docenteActual())
  const [cursoElegido, setCursoElegido] = useState(() => sessionStorage.getItem(CLAVE_CURSO) ?? '')
  const {
    datos: cursos,
    error: errorCursos,
    recargar: recargarCursos,
  } = useConsulta(async () => (docente ? repo.listarCursos() : undefined), [docente])

  // Si el curso guardado no es de esta docente, se toma el primero suyo.
  const cursoId = cursos?.some((c) => c.id === cursoElegido) ? cursoElegido : (cursos?.[0]?.id ?? '')

  // Sesión vencida o cerrada en otra pestaña: la UI vuelve a la entrada.
  useEffect(() => repo.alCambiarSesion(setDocente), [])

  // Resultados que no se pudieron guardar (RNF-12).
  useEffect(() => {
    if (!docente) return
    void reenviarPendientes()
    const alVolver = () => void reenviarPendientes()
    window.addEventListener('online', alVolver)
    return () => window.removeEventListener('online', alVolver)
  }, [docente])

  const elegirCurso = (id: string) => {
    sessionStorage.setItem(CLAVE_CURSO, id)
    setCursoElegido(id)
  }

  const valor: ValorSesion = {
    docente,
    cursos: docente ? cursos : undefined,
    errorCursos,
    recargarCursos,
    crearCurso: async (nombre) => {
      const curso = await repo.crearCurso(nombre)
      elegirCurso(curso.id)
      recargarCursos()
    },
    cursoId: docente ? cursoId : '',
    elegirCurso,
    entrar: async (email, clave) => setDocente(await repo.iniciarSesion(email, clave)),
    salir: async () => {
      await repo.cerrarSesion()
      setDocente(null)
    },
  }
  return <SesionContexto value={valor}>{children}</SesionContexto>
}

export function useSesion() {
  const v = use(SesionContexto)
  if (!v) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>')
  return v
}
