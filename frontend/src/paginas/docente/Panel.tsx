import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { repo } from '../../datos/index.ts'
import { UMBRAL_LE_CUESTA, avancePorItem, inicioSemana, porCategoria } from '../../lib/avance.ts'
import { avanceEn, enLinea } from '../../lib/clase.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { AvisoError, BotonEnlace, IconoCaja, Tarjeta } from '../../ui/aula.tsx'
import { Icono, type NombreIcono } from '../../ui/Icono.tsx'

// Cuántos ítems difíciles se muestran por categoría en el resumen.
const POR_CATEGORIA = 3
// La clase cambia sola (niños que entran, avanzan o piden apoyo): se refresca.
const REFRESCO_MS = 15_000
// Nombres que se muestran en «Necesitan tu apoyo» antes de resumir con «y N más».
const NOMBRES_APOYO = 3

// Inicio del panel: qué pasa ahora en la clase y cómo va la semana, con el
// acceso a donde se atiende cada cosa. El menú lateral lleva al resto.
export default function Panel() {
  const { docente, cursoId } = useSesion()
  const { datos, error, recargar } = useConsulta(async () => {
    const [cursos, estudiantes, semana, salas, miembros, conectados, progreso] = await Promise.all([
      repo.listarCursos(),
      repo.listarEstudiantes(cursoId),
      repo.listarResultados({ cursoId, desde: inicioSemana() }),
      repo.listarSalas(cursoId),
      repo.listarMiembros(cursoId),
      repo.listarConectados(cursoId),
      repo.listarProgreso(cursoId),
    ])
    const activos = estudiantes.filter((e) => e.activo)
    const nombre = new Map(activos.map((e) => [e.id, e.nombre]))
    const progresoDe = new Map(progreso.map((p) => [p.estudianteId, p]))
    const necesitanApoyo = miembros.flatMap((m) => {
      const sala = salas.find((s) => s.id === m.salaId)
      const n = nombre.get(m.estudianteId)
      return sala && n && avanceEn(sala, progresoDe.get(m.estudianteId))?.necesitaAyuda ? [n] : []
    })
    return {
      curso: cursos.find((c) => c.id === cursoId),
      total: activos.length,
      enSalas: miembros.filter((m) => nombre.has(m.estudianteId)).length,
      conDispositivo: conectados.filter(enLinea).length,
      necesitanApoyo,
      jugaron: new Set(semana.map((r) => r.estudianteId)).size,
      partidas: semana.length,
      // Por categoría: una letra no se compara con una rima o una palabra.
      cuestan: porCategoria(avancePorItem(semana).filter((a) => a.tasa < UMBRAL_LE_CUESTA)).map((g) => ({ ...g, items: g.items.slice(0, POR_CATEGORIA) })),
    }
  }, [cursoId])

  useEffect(() => {
    const t = window.setInterval(recargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  })

  if (error && !datos) return <AvisoError alReintentar={recargar} />

  const apoyo = datos?.necesitanApoyo ?? []
  const nombresApoyo = apoyo.length > NOMBRES_APOYO ? `${apoyo.slice(0, NOMBRES_APOYO).join(', ')} y ${apoyo.length - NOMBRES_APOYO} más` : apoyo.join(', ')

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div>
        <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#173a5e,#235a86)] px-9 py-7 text-white">
          <p className="text-xs font-bold tracking-[0.14em] text-[#9ee6c2] uppercase">{datos?.curso?.nombre ?? 'Curso actual'}</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Hola, {docente?.nombre}</h1>
          <p className="mt-2 text-white/85">
            <b className="text-white">{datos?.total ?? 0}</b> estudiantes en el curso
          </p>
          <span className="absolute top-1/2 right-10 grid size-24 -translate-y-1/2 rotate-6 place-items-center rounded-3xl border border-white/30 bg-white/10 max-md:hidden">
            <Icono nombre="asterisco" className="size-12" />
          </span>
        </section>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Resumen icono="aula" titulo="En clase ahora" to="/docente/salas" boton="Ir a salas →" primario>
            <b className="text-3xl text-tinta">{datos?.enSalas ?? 0}</b> en salas
            <span className="block text-sm">{datos?.conDispositivo ?? 0} con dispositivo encendido</span>
          </Resumen>
          <Resumen icono="personas" titulo="Necesitan tu apoyo" to="/docente/salas" boton="Ver en salas →" alerta={apoyo.length > 0}>
            <b className={`text-3xl ${apoyo.length ? 'text-[#9a4d00]' : 'text-tinta'}`}>{apoyo.length}</b>
            <span className="block text-sm">{apoyo.length ? `${nombresApoyo}: repitieron 2 veces la misma actividad.` : 'Nadie por ahora.'}</span>
          </Resumen>
          <Resumen icono="grafico" titulo="Esta semana" to="/docente/avance" boton="Ver avance →">
            <b className="text-3xl text-tinta">{datos?.jugaron ?? 0}</b> de {datos?.total ?? 0} jugaron
            <span className="block text-sm">{datos?.partidas ?? 0} partidas desde el lunes</span>
          </Resumen>
        </div>
      </div>

      <aside aria-labelledby="titulo-cuestan" className="xl:sticky xl:top-6">
        <h2 id="titulo-cuestan" className="text-lg font-bold text-tinta">Lo que más le cuesta esta semana</h2>
        <Tarjeta className="mt-4">
          {!datos?.cuestan.length ? (
            <p className="text-tinta-suave">Aún no hay suficientes partidas esta semana para detectar dificultades.</p>
          ) : (
            <div className="grid gap-5">
              {datos.cuestan.map((g) => (
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
              <Link to="/docente/avance" className="text-sm font-semibold text-menta-oscuro underline">
                Ver el detalle por niño en Avance
              </Link>
            </div>
          )}
        </Tarjeta>
      </aside>
    </div>
  )
}

function Resumen({
  icono,
  titulo,
  to,
  boton,
  primario,
  alerta,
  children,
}: {
  icono: NombreIcono
  titulo: string
  to: string
  boton: string
  primario?: boolean
  alerta?: boolean
  children: ReactNode
}) {
  return (
    <Tarjeta className={`flex flex-col ${alerta ? 'border-[#f0b97a] bg-[#fffaf3]' : ''}`}>
      <IconoCaja nombre={icono} className={alerta ? 'bg-[#fdf1e4] text-[#9a4d00]' : ''} />
      <h2 className="mt-4 text-lg font-bold text-tinta">{titulo}</h2>
      <p className="mt-1 flex-1 text-tinta-suave">{children}</p>
      <BotonEnlace to={to} variante={primario ? 'primario' : 'secundario'} className="mt-5 self-start">
        {boton}
      </BotonEnlace>
    </Tarjeta>
  )
}
