import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { confirmarSalida } from '../../lib/cambiosSinGuardar.ts'
import { AvisoError } from '../../ui/aula.tsx'
import { Icono, type NombreIcono } from '../../ui/Icono.tsx'
import { MenuCurso } from './MenuCurso.tsx'
import PrimerCurso from './PrimerCurso.tsx'

// En el orden del día de la docente: lo que pasa ahora, preparar, perfiles y cómo va el curso.
const MENU: { to: string; texto: string; icono: NombreIcono; fin?: boolean }[] = [
  { to: '/docente', texto: 'Clase', icono: 'aula', fin: true },
  { to: '/docente/salas', texto: 'Salas', icono: 'casa' },
  { to: '/docente/estudiantes', texto: 'Estudiantes', icono: 'personas' },
  { to: '/docente/avance', texto: 'Avance', icono: 'grafico' },
]

// Las páginas con tablero o columnas usan todo el ancho; el resto, una columna legible.
const ANCHAS = [/^\/docente\/?$/]

const claseItem = (activo: boolean) =>
  `flex min-h-11 items-center gap-3 rounded-lg px-2.5 text-sm max-lg:justify-center ${
    activo ? 'bg-white/12 font-semibold text-white shadow-[inset_3px_0_0_var(--color-menta)]' : 'font-medium text-white/75 hover:bg-white/8 hover:text-white'
  }`

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
  const ancha = ANCHAS.some((r) => r.test(ubicacion.pathname))

  return (
    <div className="flex min-h-dvh bg-fondo text-[15px] text-tinta">
      <aside className="sticky top-0 flex h-dvh w-[4.5rem] shrink-0 flex-col gap-4 bg-marino px-2 py-4 text-white lg:w-60 lg:px-3 [&_:focus-visible]:outline-white">
        <p className="flex items-center gap-2.5 px-2 max-lg:justify-center">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-menta text-white">
            <Icono nombre="asterisco" className="size-4" />
          </span>
          <span className="font-semibold max-lg:sr-only">Leer para Todos</span>
        </p>
        <MenuCurso />
        <nav aria-label="Panel docente" className="grid gap-1">
          {MENU.map((m) => (
            <NavLink key={m.to} to={m.to} end={m.fin} title={m.texto} onClick={(e) => !confirmarSalida() && e.preventDefault()} className={({ isActive }) => claseItem(isActive)}>
              <Icono nombre={m.icono} />
              <span className="max-lg:sr-only">{m.texto}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-1 border-t border-white/15 pt-3">
          <p className="flex min-h-10 items-center gap-2.5 px-2 text-sm max-lg:justify-center" title={docente.nombre}>
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15 font-semibold text-white">
              {docente.nombre[0]?.toUpperCase()}
            </span>
            <span className="truncate font-medium text-white/90 max-lg:sr-only">{docente.nombre}</span>
          </p>
          <button type="button" onClick={() => confirmarSalida() && void cerrar()} title="Cerrar sesión" className={claseItem(false)}>
            <Icono nombre="salir" />
            <span className="max-lg:sr-only">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
        <div className={ancha ? '' : 'mx-auto max-w-6xl'}>
          {/* Las páginas solo se montan con un curso real elegido; al cambiar de curso parten de cero. */}
          {errorCursos ? <AvisoError alReintentar={recargarCursos} /> : cursos?.length === 0 ? <PrimerCurso /> : cursoId ? <Outlet key={cursoId} /> : null}
        </div>
      </main>
    </div>
  )
}
