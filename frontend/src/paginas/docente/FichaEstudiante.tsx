import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { actividad } from '../../contenido/actividades.ts'
import { repo } from '../../datos/index.ts'
import { EMOCIONES, UMBRAL_LE_CUESTA, avancePorItem, deEstaSemana, fechaCorta, minutos } from '../../lib/avance.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { Antetitulo, AvisoError, Boton, BotonEnlace, Encabezado, Tarjeta, claseEntrada } from '../../ui/aula.tsx'
import { FormEstudiante } from './FormEstudiante.tsx'

const PESTANAS = [
  { id: 'avance', texto: 'Avance' },
  { id: 'perfil', texto: 'Perfil y apoyos' },
  { id: 'observaciones', texto: 'Observaciones' },
] as const

export function NuevoEstudiante() {
  const { cursoId } = useSesion()
  const navegar = useNavigate()
  return (
    <>
      <BotonEnlace to="/docente/estudiantes" variante="suave" className="mb-5">← Volver a estudiantes</BotonEnlace>
      <Encabezado antetitulo="Estudiantes / Nuevo" titulo="Añadir estudiante" descripcion="Solo el nombre de pila: no ingreses apellidos ni RUT (Ley 19.628 / 21.719)." />
      <FormEstudiante
        cursoId={cursoId}
        alGuardar={async (datos) => {
          const e = await repo.guardarEstudiante(datos)
          navegar(`/docente/estudiantes/${e.id}?pestana=perfil`, { replace: true })
        }}
      />
    </>
  )
}

export default function FichaEstudiante() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const pestana = params.get('pestana') ?? 'avance'
  const { cursoId } = useSesion()
  const navegar = useNavigate()
  const { datos: estudiante, error, recargar } = useConsulta(() => repo.obtenerEstudiante(id), [id])
  const { datos: sala, recargar: recargarSala } = useConsulta(async () => {
    const miembro = (await repo.listarMiembros(cursoId)).find((m) => m.estudianteId === id)
    if (!miembro) return null
    return (await repo.listarSalas(cursoId)).find((x) => x.id === miembro.salaId) ?? null
  }, [id, cursoId])

  if (error && !estudiante) return <AvisoError alReintentar={recargar} />
  if (estudiante === undefined) return null
  if (estudiante === null) return <p>No se encontró el estudiante. <Link to="/docente/estudiantes" className="underline">Volver</Link></p>

  return (
    <>
      <BotonEnlace to="/docente/estudiantes" variante="suave" className="mb-5">← Volver a estudiantes</BotonEnlace>
      <div className="mb-6 flex items-center gap-5">
        <Avatar estudiante={estudiante} className="size-20 text-5xl" />
        <div>
          <Antetitulo>Ficha del estudiante</Antetitulo>
          <h1 className="text-3xl font-bold tracking-tight">{estudiante.nombre}</h1>
          <p className="text-tinta-suave">
            Nivel {estudiante.nivelHabilitado} habilitado · {estudiante.monedas} monedas{!estudiante.activo && ' · Desactivado'}
          </p>
          {sala && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-menta-oscuro">
              <span className="size-2.5 rounded-full bg-menta" aria-hidden="true" />
              Conectado a «{sala.nombre}»
              <Boton
                variante="suave"
                onClick={async () => {
                  await repo.desconectarEstudiante(id)
                  recargarSala()
                }}
              >
                Sacar de la sala
              </Boton>
            </p>
          )}
        </div>
      </div>

      <div role="tablist" aria-label="Secciones de la ficha" className="mb-6 flex gap-2 border-b border-borde">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setParams({ pestana: p.id }, { replace: true })}
            className={`-mb-px border-b-3 px-4 py-2.5 font-semibold ${pestana === p.id ? 'border-menta text-tinta' : 'border-transparent text-tinta-suave hover:text-tinta'}`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {pestana === 'avance' && <Avance estudianteId={id} />}
      {pestana === 'perfil' && (
        <>
          <FormEstudiante
            inicial={estudiante}
            cursoId={cursoId}
            alGuardar={async (e) => {
              await repo.guardarEstudiante(e)
              recargar()
            }}
          />
          <ZonaEliminar nombre={estudiante.nombre} alEliminar={async () => {
            await repo.eliminarEstudiante(id)
            navegar('/docente/estudiantes', { replace: true })
          }} />
        </>
      )}
      {pestana === 'observaciones' && <Observaciones estudianteId={id} />}
    </>
  )
}

function Avance({ estudianteId }: { estudianteId: string }) {
  const { datos, error, recargar } = useConsulta(
    async () => ({
      resultados: await repo.listarResultados({ estudianteId }),
      emociones: await repo.listarEmociones(estudianteId),
    }),
    [estudianteId],
  )
  if (error) return <AvisoError alReintentar={recargar} />
  if (!datos) return null
  const items = avancePorItem(datos.resultados)
  const semana = deEstaSemana(datos.resultados)

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <Tarjeta>
        <h2 className="text-lg font-bold">Avance por letra y sílaba</h2>
        <p className="mb-5 text-sm text-tinta-suave">Porcentaje de rondas resueltas al primer intento. Ordenado de más difícil a más fácil.</p>
        {items.length === 0 && <p className="text-tinta-suave">Todavía no hay partidas registradas.</p>}
        <ul className="grid gap-3">
          {items.map((a) => {
            const cuesta = a.tasa < UMBRAL_LE_CUESTA
            return (
              <li key={a.item} className="grid grid-cols-[3.5rem_1fr_10rem] items-center gap-3">
                <span className="font-escolar text-2xl font-bold">{a.item}</span>
                <span className="h-3.5 overflow-hidden rounded-full bg-fondo" aria-hidden="true">
                  <span className={`block h-full rounded-full ${cuesta ? 'bg-[#e8a35c]' : 'bg-menta'}`} style={{ width: `${Math.max(4, a.tasa * 100)}%` }} />
                </span>
                <span className="text-sm">
                  <b>{Math.round(a.tasa * 100)}%</b> <span className="text-tinta-suave">de {a.rondas}</span>
                  {cuesta && <span className="ml-1 rounded-md bg-[#fdf1e4] px-1.5 py-0.5 text-xs font-bold text-[#9a4d00]">Le cuesta</span>}
                </span>
              </li>
            )
          })}
        </ul>
      </Tarjeta>

      <div className="grid content-start gap-6">
        <Tarjeta>
          <h2 className="text-lg font-bold">Esta semana</h2>
          <p className="mt-1 text-tinta-suave">
            <b className="text-tinta">{semana.length}</b> partidas · <b className="text-tinta">{minutos(semana.reduce((s, r) => s + r.duracionMs, 0))}</b> min
          </p>
          <ul className="mt-4 grid gap-2">
            {datos.resultados.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-fondo px-3 py-2 text-sm">
                <span className="truncate">
                  <b>{actividad(r.actividadId)?.titulo ?? r.actividadId}</b>
                  <span className="block text-tinta-suave">{fechaCorta(r.fecha)} · {minutos(r.duracionMs)} min</span>
                </span>
                <span aria-label={`${r.estrellas} de 3 estrellas`} className="shrink-0 tracking-tight">
                  {'★'.repeat(r.estrellas)}
                  <span className="text-borde">{'★'.repeat(3 - r.estrellas)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta>
          <h2 className="text-lg font-bold">¿Cómo llegó a la sesión?</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {datos.emociones.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm" style={{ background: EMOCIONES[e.emocion].color }}>
                <span aria-hidden="true">{EMOCIONES[e.emocion].cara}</span>
                {EMOCIONES[e.emocion].texto} · {fechaCorta(e.fecha)}
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>
    </div>
  )
}

function ZonaEliminar({ nombre, alEliminar }: { nombre: string; alEliminar: () => Promise<void> }) {
  const [confirmar, setConfirmar] = useState(false)
  const [error, setError] = useState(false)
  return (
    <Tarjeta className="mt-6 border-[#f0c9c4]">
      <h2 className="text-lg font-bold text-[#b42318]">Eliminar perfil</h2>
      <p className="mt-1 text-tinta-suave">
        Borra a {nombre} y todo su historial: partidas, emociones y observaciones. No se puede deshacer. Si solo quieres que no aparezca en las salas, desactívalo arriba.
      </p>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-[#b42318]">No se pudo eliminar. Intenta otra vez.</p>}
      {confirmar ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-semibold">¿Seguro que quieres eliminar a {nombre}?</span>
          <Boton
            variante="secundario"
            onClick={() => {
              setError(false)
              alEliminar().catch(() => setError(true))
            }}
          >
            Sí, eliminar
          </Boton>
          <Boton variante="suave" onClick={() => setConfirmar(false)}>Cancelar</Boton>
        </div>
      ) : (
        <Boton variante="suave" className="mt-4" onClick={() => setConfirmar(true)}>Eliminar perfil</Boton>
      )}
    </Tarjeta>
  )
}

function Observaciones({ estudianteId }: { estudianteId: string }) {
  const [texto, setTexto] = useState('')
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null)
  const [borrando, setBorrando] = useState<string | null>(null)
  const [fallo, setFallo] = useState(false)
  const { datos, error, recargar } = useConsulta(() => repo.listarObservaciones(estudianteId), [estudianteId])

  const ejecutar = async (accion: () => Promise<void>) => {
    setFallo(false)
    try {
      await accion()
    } catch {
      setFallo(true)
    }
    recargar()
  }

  const agregar = () => {
    if (!texto.trim()) return
    void ejecutar(async () => {
      await repo.agregarObservacion(estudianteId, texto.trim())
      setTexto('')
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Tarjeta>
        <h2 className="text-lg font-bold">Nueva observación</h2>
        <label className="mt-3 block">
          <span className="sr-only">Observación</span>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} className={claseEntrada} placeholder="Ej.: practicar la R con canciones y rimas." />
        </label>
        <Boton onClick={agregar} className="mt-3">Guardar observación</Boton>
      </Tarjeta>
      <Tarjeta>
        <h2 className="text-lg font-bold">Historial</h2>
        {error && (
          <p className="mt-2 text-sm text-[#b42318]">
            No se pudo cargar el historial.{' '}
            <button onClick={recargar} className="font-semibold underline">Reintentar</button>
          </p>
        )}
        {fallo && <p role="alert" className="mt-2 text-sm font-semibold text-[#b42318]">No se pudo completar la acción. Intenta otra vez.</p>}
        {datos?.length === 0 && <p className="mt-2 text-tinta-suave">Sin observaciones todavía.</p>}
        <ul className="mt-3 grid gap-3">
          {datos?.map((o) => (
            <li key={o.id} className="rounded-xl bg-fondo px-4 py-3">
              {editando?.id === o.id ? (
                <>
                  <label>
                    <span className="sr-only">Editar observación</span>
                    <textarea
                      value={editando.texto}
                      onChange={(e) => setEditando({ id: o.id, texto: e.target.value })}
                      rows={3}
                      className={claseEntrada}
                      autoFocus
                    />
                  </label>
                  <div className="mt-2 flex gap-2">
                    <Boton
                      disabled={!editando.texto.trim()}
                      onClick={() =>
                        void ejecutar(async () => {
                          await repo.actualizarObservacion(o.id, editando.texto.trim())
                          setEditando(null)
                        })
                      }
                    >
                      Guardar cambios
                    </Boton>
                    <Boton variante="suave" onClick={() => setEditando(null)}>Cancelar</Boton>
                  </div>
                </>
              ) : (
                <>
                  <p>{o.texto}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="mr-auto text-xs text-tinta-suave">{fechaCorta(o.fecha)}</span>
                    {borrando === o.id ? (
                      <>
                        <span className="text-sm font-semibold">¿Borrar?</span>
                        <Boton
                          variante="secundario"
                          onClick={() =>
                            void ejecutar(async () => {
                              await repo.eliminarObservacion(o.id)
                              setBorrando(null)
                            })
                          }
                        >
                          Sí, borrar
                        </Boton>
                        <Boton variante="suave" onClick={() => setBorrando(null)}>No</Boton>
                      </>
                    ) : (
                      <>
                        <Boton variante="suave" onClick={() => setEditando({ id: o.id, texto: o.texto })}>Editar</Boton>
                        <Boton variante="suave" onClick={() => setBorrando(o.id)}>Borrar</Boton>
                      </>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  )
}
