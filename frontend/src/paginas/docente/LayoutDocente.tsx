import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { AvisoError } from '../../ui/aula.tsx'
import { Icono, type NombreIcono } from '../../ui/Icono.tsx'
import PrimerCurso from './PrimerCurso.tsx'

const MENU: { to: string; texto: string; icono: NombreIcono; fin?: boolean }[] = [
  { to: '/docente', texto: 'Inicio', icono: 'casa', fin: true },
  { to: '/docente/estudiantes', texto: 'Estudiantes', icono: 'personas' },
  { to: '/docente/avance', texto: 'Avance del curso', icono: 'grafico' },
  { to: '/docente/salas', texto: 'Salas', icono: 'aula' },
]

export default function LayoutDocente() {
  const { docente, cursos, errorCursos, recargarCursos, cursoId, elegirCurso, salir } = useSesion()
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
          <label className={`flex items-center gap-2 text-sm font-semibold text-tinta ${cursos?.length ? '' : 'invisible'}`}>
            <span className="size-2.5 rounded-full bg-menta" aria-hidden="true" />
            Curso actual
            <select
              value={cursoId}
              onChange={(e) => elegirCurso(e.target.value)}
              className="rounded-lg border border-borde bg-white px-2 py-1 font-semibold"
            >
              {cursos?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
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
