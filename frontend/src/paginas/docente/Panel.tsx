import { Link } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { repo } from '../../datos/index.ts'
import { UMBRAL_LE_CUESTA, avancePorItem, deEstaSemana, porCategoria } from '../../lib/avance.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { AvisoError, BotonEnlace, IconoCaja, Tarjeta } from '../../ui/aula.tsx'
import { Icono, type NombreIcono } from '../../ui/Icono.tsx'

// Cuántos ítems difíciles se muestran por categoría en el resumen.
const POR_CATEGORIA = 3

export default function Panel() {
  const { docente, cursoId } = useSesion()
  const { datos, error, recargar } = useConsulta(async () => {
    const [cursos, estudiantes, resultados] = await Promise.all([
      repo.listarCursos(),
      repo.listarEstudiantes(cursoId),
      repo.listarResultados({ cursoId }),
    ])
    return { curso: cursos.find((c) => c.id === cursoId), estudiantes, resultados }
  }, [cursoId])

  if (error) return <AvisoError alReintentar={recargar} />

  const semana = deEstaSemana(datos?.resultados ?? [])
  const activos = new Set(semana.map((r) => r.estudianteId))
  // Por categoría: una letra no se compara con una rima o una palabra.
  const cuestan = porCategoria(avancePorItem(datos?.resultados ?? []).filter((a) => a.tasa < UMBRAL_LE_CUESTA)).map((g) => ({
    ...g,
    items: g.items.slice(0, POR_CATEGORIA),
  }))

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
    <div>
      <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#173a5e,#235a86)] px-9 py-8 text-white">
        <p className="text-xs font-bold tracking-[0.14em] text-[#9ee6c2] uppercase">Curso actual</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Panel docente</h1>
        <p className="mt-2 text-white/85">
          {docente?.nombre} · {datos?.curso?.nombre ?? '…'}
        </p>
        <p className="mt-4 text-white/85">
          <b className="text-white">{datos?.estudiantes.length ?? 0}</b> estudiantes ·{' '}
          <b className="text-white">{activos.size}</b> jugaron esta semana
        </p>
        <span className="absolute top-1/2 right-10 grid size-28 -translate-y-1/2 rotate-6 place-items-center rounded-3xl border border-white/30 bg-white/10 max-md:hidden">
          <Icono nombre="asterisco" className="size-14" />
        </span>
      </section>

      <h2 className="mt-9 text-lg font-bold text-tinta">Tu espacio de trabajo</h2>
      <p className="text-tinta-suave">Herramientas para la clase de hoy.</p>
      <div className="mt-4 grid gap-5 md:grid-cols-3">
        <Acceso icono="aula" titulo="Salas" texto="Asigna a cada niño su sala y los contenidos que trabajará." to="/docente/salas" boton="Ir a salas →" primario />
        <Acceso icono="personas" titulo="Estudiantes" texto="Crea perfiles, ajusta apoyos y asigna niveles." to="/docente/estudiantes" boton="Ver estudiantes →" />
        <Acceso icono="grafico" titulo="Avance del curso" texto="Participación semanal, emociones y letras difíciles." to="/docente/avance" boton="Ver avance →" />
      </div>

    </div>

    <aside aria-labelledby="titulo-cuestan" className="xl:sticky xl:top-6">
      <h2 id="titulo-cuestan" className="text-lg font-bold text-tinta">Lo que más le cuesta al curso</h2>
      <Tarjeta className="mt-4">
        {cuestan.length === 0 ? (
          <p className="text-tinta-suave">Aún no hay suficientes partidas para detectar dificultades.</p>
        ) : (
          <div className="grid gap-5">
            {cuestan.map((g) => (
              <section key={g.categoria} aria-labelledby={`cuesta-${g.categoria}`}>
                <h3 id={`cuesta-${g.categoria}`} className="mb-2 text-sm font-bold text-tinta-suave">
                  {g.titulo}
                </h3>
                <ol className="grid gap-3">
                  {g.items.map((a) => (
                    <li key={a.item} className="flex items-center gap-3 rounded-2xl bg-[#fdf1e4] px-4 py-3">
                      <span
                        className={`w-24 shrink-0 text-center font-escolar font-bold break-words text-tinta ${a.item.length > 3 ? 'text-base leading-tight' : 'text-3xl'}`}
                      >
                        {a.item}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block h-2.5 overflow-hidden rounded-full bg-white" aria-hidden="true">
                          <span className="block h-full rounded-full bg-[#e8a35c]" style={{ width: `${Math.max(4, a.tasa * 100)}%` }} />
                        </span>
                        <span className="mt-1 block text-sm text-tinta-suave">{Math.round(a.tasa * 100)}% al primer intento</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </Tarjeta>
    </aside>
    </div>
  )
}

function Acceso({ icono, titulo, texto, to, boton, primario }: { icono: NombreIcono; titulo: string; texto: string; to: string; boton: string; primario?: boolean }) {
  return (
    <Tarjeta className="flex flex-col">
      <IconoCaja nombre={icono} />
      <h3 className="mt-5 text-xl font-bold text-tinta">
        <Link to={to} className="hover:underline">{titulo}</Link>
      </h3>
      <p className="mt-1 flex-1 text-tinta-suave">{texto}</p>
      <BotonEnlace to={to} variante={primario ? 'primario' : 'secundario'} className="mt-5 self-start">
        {boton}
      </BotonEnlace>
    </Tarjeta>
  )
}
