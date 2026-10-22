import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { repo } from '../../datos/index.ts'
import type { Curso } from '../../dominio/tipos.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { AvisoError, Boton, claseEntrada } from '../../ui/aula.tsx'
import { Icono, type NombreIcono } from '../../ui/Icono.tsx'
import PrimerCurso from './PrimerCurso.tsx'

const MENU: { to: string; texto: string; icono: NombreIcono; fin?: boolean }[] = [
  { to: '/docente', texto: 'Inicio', icono: 'casa', fin: true },
  { to: '/docente/estudiantes', texto: 'Estudiantes', icono: 'personas' },
  { to: '/docente/avance', texto: 'Avance del curso', icono: 'grafico' },
  { to: '/docente/salas', texto: 'Salas', icono: 'aula' },
]

export default function LayoutDocente() {
  const { docente, cursos, errorCursos, recargarCursos, cursoId, salir } = useSesion()
  const ubicacion = useLocation()
  const navegar = useNavigate()

  if (docente === undefined) return null
  if (!docente) return <Navigate to="/docente/entrar" state={{ desde: ubicacion.pathname }} replace />

  const cerrar = async () => {
    await salir()
    navegar('/')
  }

  return (
    <div className="flex min-h-dvh bg-fondo">
      <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col bg-marino px-4 py-7 text-white max-md:w-20 max-md:px-2">
        <p className="mb-10 flex items-center gap-3 px-2 text-xl leading-tight font-bold">
          <span className="grid size-9 place-items-center rounded-xl bg-menta">
            <Icono nombre="asterisco" className="size-5" />
          </span>
          <span className="max-md:sr-only">Leer para Todos</span>
        </p>
        <nav aria-label="Menú docente" className="grid gap-1.5">
          {MENU.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.fin}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold transition-colors ${
                  isActive ? 'bg-menta-fondo text-marino' : 'text-white/85 hover:bg-white/10'
                }`
              }
            >
              <Icono nombre={m.icono} />
              <span className="max-md:sr-only">{m.texto}</span>
            </NavLink>
          ))}
          <button onClick={cerrar} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-semibold text-white/85 hover:bg-white/10">
            <Icono nombre="salir" />
            <span className="max-md:sr-only">Cerrar sesión</span>
          </button>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-4 border-b border-borde bg-white px-8 py-4 max-md:px-4">
          <SelectorCurso />
          <span className="flex-1" />
          <span className="flex items-center gap-2 text-sm font-semibold text-tinta">
            <span className="grid size-8 place-items-center rounded-lg bg-celeste-fondo">{docente.nombre[0]}</span>
            {docente.nombre}
          </span>
        </header>
        <main className="mx-auto max-w-6xl px-8 py-8 max-md:px-4">
          {/* Las páginas solo se montan con un curso real elegido. */}
          {errorCursos ? (
            <AvisoError alReintentar={recargarCursos} />
          ) : cursos?.length === 0 ? (
            <PrimerCurso />
          ) : cursoId ? (
            <Outlet />
          ) : null}
        </main>
      </div>
    </div>
  )
}

const NUEVO = '__nuevo__'
// Cursos habituales del liceo: se sugieren los que la docente aún no tiene.
const SUGERIDOS = ['Pre-Kínder A', 'Kínder A', 'Pre-Kínder B', 'Kínder B']
const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()

// Curso con el que se trabaja; la última opción abre un formulario para crear otro.
function SelectorCurso() {
  const { cursos, cursoId, elegirCurso, crearCurso } = useSesion()
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)

  if (!cursos?.length) return <span />
  const actual = cursos.find((c) => c.id === cursoId)

  const existe = (n: string) => cursos.some((c) => sinTildes(c.nombre) === sinTildes(n))
  const sugeridos = SUGERIDOS.filter((n) => !existe(n)).slice(0, 2)

  const crear = async (n: string) => {
    const limpio = n.trim()
    if (!limpio) return
    if (existe(limpio)) return setError('Ya tienes un curso con ese nombre.')
    setEnviando(true)
    setError(null)
    try {
      await crearCurso(limpio)
      setCreando(false)
      setNombre('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el curso.')
    }
    setEnviando(false)
  }

  if (creando)
    return (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          void crear(nombre)
        }}
        className="flex flex-wrap items-center gap-2 text-sm"
      >
        <label className="flex items-center gap-2 font-semibold whitespace-nowrap text-tinta">
          Nuevo curso
          <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder="Ej.: Pre-Kínder A" className={`${claseEntrada} w-44 py-1.5`} />
        </label>
        {sugeridos.map((n) => (
          <button key={n} type="button" disabled={enviando} onClick={() => void crear(n)} className="rounded-lg bg-celeste-fondo px-2.5 py-1.5 font-semibold text-marino hover:bg-[#d5e7f7]">
            + {n}
          </button>
        ))}
        <Boton type="submit" disabled={!nombre.trim() || enviando} className="py-1.5">
          {enviando ? 'Creando…' : 'Crear'}
        </Boton>
        <Boton
          type="button"
          variante="suave"
          className="py-1.5"
          onClick={() => {
            setCreando(false)
            setError(null)
          }}
        >
          Cancelar
        </Boton>
        {error && (
          <span role="alert" className="font-semibold text-[#b42318]">
            {error}
          </span>
        )}
      </form>
    )

  return (
    <span className="flex items-center gap-1.5">
      <label className="flex items-center gap-2 text-sm font-semibold text-tinta">
        <span className="size-2.5 rounded-full bg-menta" aria-hidden="true" />
        Curso actual
        <select
          value={cursoId}
          onChange={(e) => (e.target.value === NUEVO ? setCreando(true) : elegirCurso(e.target.value))}
          className="rounded-lg border border-borde bg-white px-2 py-1 font-semibold"
        >
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
          <option value={NUEVO}>+ Nuevo curso…</option>
        </select>
      </label>
      {actual && (
        <button
          type="button"
          aria-label={`Eliminar el curso ${actual.nombre}`}
          title="Eliminar este curso"
          onClick={() => setEliminando(true)}
          className="grid size-8 place-items-center rounded-lg text-tinta-suave hover:bg-red-50 hover:text-[#b42318]"
        >
          <Icono nombre="basura" className="size-4" />
        </button>
      )}
      {eliminando && actual && <EliminarCurso curso={actual} alCerrar={() => setEliminando(false)} />}
    </span>
  )
}

// Confirmación para borrar un curso. Si tiene estudiantes, también se borran
// ellos y su historial: hay que escribir el nombre del curso para confirmarlo.
function EliminarCurso({ curso, alCerrar }: { curso: Curso; alCerrar: () => void }) {
  const { eliminarCurso } = useSesion()
  const { datos: estudiantes, error: errorCarga } = useConsulta(() => repo.listarEstudiantes(curso.id), [curso.id])
  const [escrito, setEscrito] = useState('')
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const n = estudiantes?.length ?? 0
  const confirmado = n === 0 || escrito.trim().toLowerCase() === curso.nombre.trim().toLowerCase()

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && !borrando && alCerrar()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [alCerrar, borrando])

  const borrar = async () => {
    setBorrando(true)
    setError(null)
    try {
      await eliminarCurso(curso.id)
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el curso.')
      setBorrando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-tinta/40 p-4" onClick={(e) => e.target === e.currentTarget && !borrando && alCerrar()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="titulo-eliminar-curso" className="grid w-full max-w-md gap-4 rounded-3xl bg-white p-6 shadow-2xl">
        <span className="grid size-12 place-items-center rounded-2xl bg-red-50 text-[#b42318]">
          <Icono nombre="basura" className="size-6" />
        </span>
        <h2 id="titulo-eliminar-curso" className="text-xl font-bold text-tinta">
          ¿Eliminar «{curso.nombre}»?
        </h2>
        {estudiantes === undefined && !errorCarga ? (
          <p className="text-tinta-suave">Revisando el curso…</p>
        ) : errorCarga ? (
          <p className="text-[#b42318]">No se pudo revisar el curso. Cierra e intenta otra vez.</p>
        ) : n === 0 ? (
          <p className="text-tinta-suave">El curso no tiene estudiantes. Se borran también sus salas.</p>
        ) : (
          <>
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">
              Se borrarán sus <b>{n} {n === 1 ? 'estudiante' : 'estudiantes'}</b> con todo su historial (partidas, emociones y observaciones) y sus
              salas. <b>No se puede deshacer.</b>
            </p>
            <label className="grid gap-1.5 text-sm font-semibold text-tinta">
              Escribe «{curso.nombre}» para confirmar
              <input value={escrito} onChange={(e) => setEscrito(e.target.value)} autoFocus className={claseEntrada} />
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm font-semibold text-[#b42318]">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Boton variante="suave" disabled={borrando} onClick={alCerrar}>
            Cancelar
          </Boton>
          <button
            type="button"
            disabled={estudiantes === undefined || !confirmado || borrando}
            onClick={() => void borrar()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#b42318] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#912018] disabled:opacity-50"
          >
            <Icono nombre="basura" className="size-4" /> {borrando ? 'Eliminando…' : 'Eliminar curso'}
          </button>
        </div>
      </div>
    </div>
  )
}
