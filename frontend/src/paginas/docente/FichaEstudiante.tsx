import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { nombreActividad } from '../../contenido/contenidos.ts'
import { repo } from '../../datos/index.ts'
import type { Estudiante } from '../../dominio/tipos.ts'
import { EMOCIONES, UMBRAL_LE_CUESTA, avancePorItem, deEstaSemana, fechaCorta, minutos, porCategoria } from '../../lib/avance.ts'
import { CON_EMOCION, convieneMirar } from '../../lib/clase.ts'
import { capitalizar } from '../../lib/texto.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { Aviso, AvisoError, Boton, BotonEnlace, Dialogo, Encabezado, Etiqueta, EstadoVacio, MenuAcciones, PanelPestana, Pestanas, Tarjeta, claseEntrada } from '../../ui/aula.tsx'
import { BotonInforme } from './BotonInforme.tsx'
import { DetalleItem } from './DetalleItem.tsx'
import { FormEstudiante } from './FormEstudiante.tsx'

type Pestana = 'avance' | 'observaciones' | 'ajustes'
const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: 'avance', texto: 'Avance' },
  { id: 'observaciones', texto: 'Observaciones' },
  { id: 'ajustes', texto: 'Ajustes' },
]
const MIGAS = [{ to: '/docente/estudiantes', texto: 'Estudiantes' }]

// La pestaña pedida en la dirección; «perfil» era el nombre antiguo de Ajustes.
function pestanaDe(valor: string | null): Pestana {
  if (valor === 'perfil') return 'ajustes'
  return PESTANAS.some((p) => p.id === valor) ? (valor as Pestana) : 'avance'
}

export function NuevoEstudiante() {
  const { cursoId } = useSesion()
  const navegar = useNavigate()
  return (
    <>
      <Encabezado migas={MIGAS} titulo="Añadir estudiante" descripcion="Solo el nombre de pila, el personaje que tocará para entrar y sus apoyos." />
      <FormEstudiante
        cursoId={cursoId}
        alGuardar={async (datos) => {
          const e = await repo.guardarEstudiante(datos)
          navegar(`/docente/estudiantes/${e.id}`, { replace: true })
        }}
      />
    </>
  )
}

// La ficha de un niño: arriba quién es y dónde está; abajo, en pestañas, su
// avance, las observaciones y sus ajustes. Lo que se usa poco (desactivar,
// eliminar) va en el menú ⋯.
export default function FichaEstudiante() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const pestana = pestanaDe(params.get('pestana'))
  const { cursoId } = useSesion()
  const { datos: estudiante, error, recargar } = useConsulta(() => repo.obtenerEstudiante(id), [id])
  const { datos: sala, recargar: recargarSala } = useConsulta(async () => {
    const miembro = (await repo.listarMiembros(cursoId)).find((m) => m.estudianteId === id)
    if (!miembro) return null
    return (await repo.listarSalas(cursoId)).find((x) => x.id === miembro.salaId) ?? null
  }, [id, cursoId])
  const [dialogo, setDialogo] = useState<'desactivar' | 'eliminar' | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)

  if (error && !estudiante) return <AvisoError alReintentar={recargar} />
  if (estudiante === undefined) return <p className="text-tinta-suave">Cargando la ficha…</p>
  if (estudiante === null)
    return (
      <>
        <Encabezado migas={MIGAS} titulo="Estudiante no encontrado" />
        <EstadoVacio titulo="Este perfil ya no existe" accion={<BotonEnlace to="/docente/estudiantes">Ver estudiantes</BotonEnlace>}>
          Puede que se haya eliminado o que sea de otro curso.
        </EstadoVacio>
      </>
    )

  const ejecutar = async (accion: () => Promise<unknown>, mensaje: string) => {
    setFallo(null)
    try {
      await accion()
    } catch {
      setFallo(mensaje)
    }
    recargar()
    recargarSala()
  }

  return (
    <>
      <Encabezado
        migas={MIGAS}
        titulo={
          <span className="flex items-center gap-3">
            <Avatar estudiante={estudiante} className={`size-11 ${estudiante.activo ? '' : 'opacity-60'}`} />
            {estudiante.nombre}
            {!estudiante.activo && <Etiqueta>Desactivado</Etiqueta>}
          </span>
        }
        descripcion={`${sala ? `En la sala «${sala.nombre}»` : 'Sin sala'}. ${estudiante.monedas} monedas.`}
        accion={
          <div className="flex items-center gap-2">
            <BotonInforme estudiante={estudiante} />
            <MenuAcciones
              etiqueta={`Opciones de ${estudiante.nombre}`}
              alinear="derecha"
              opciones={[
                ...(sala ? [{ texto: `Sacar de «${sala.nombre}»`, alElegir: () => void ejecutar(() => repo.desconectarEstudiante(id), 'No se pudo sacar de la sala.') }] : []),
                estudiante.activo
                  ? { texto: 'Desactivar perfil…', alElegir: () => setDialogo('desactivar') }
                  : { texto: 'Activar perfil', alElegir: () => void ejecutar(() => repo.guardarEstudiante({ ...estudiante, activo: true }), 'No se pudo activar el perfil.') },
                'separador',
                { texto: 'Eliminar perfil…', peligro: true, alElegir: () => setDialogo('eliminar') },
              ]}
            />
          </div>
        }
      />
      {fallo && (
        <Aviso tono="peligro" className="mb-4">
          {fallo}
        </Aviso>
      )}

      <Pestanas etiqueta="Secciones de la ficha" pestanas={PESTANAS} actual={pestana} alCambiar={(p) => setParams({ pestana: p }, { replace: true })} />
      <PanelPestana id={pestana}>
        {pestana === 'avance' && <Avance estudianteId={id} />}
        {pestana === 'observaciones' && <Observaciones estudianteId={id} />}
        {pestana === 'ajustes' && (
          <FormEstudiante
            inicial={estudiante}
            cursoId={cursoId}
            alGuardar={async (e) => {
              // El perfil se activa y desactiva desde el menú: se respeta el estado de ahora.
              await repo.guardarEstudiante({ ...e, activo: estudiante.activo })
              recargar()
            }}
          />
        )}
      </PanelPestana>

      {dialogo === 'desactivar' && (
        <Desactivar
          estudiante={estudiante}
          alCerrar={() => setDialogo(null)}
          alConfirmar={() => {
            setDialogo(null)
            void ejecutar(() => repo.guardarEstudiante({ ...estudiante, activo: false }), 'No se pudo desactivar el perfil.')
          }}
        />
      )}
      {dialogo === 'eliminar' && <Eliminar estudiante={estudiante} alCerrar={() => setDialogo(null)} />}
    </>
  )
}

function Desactivar({ estudiante, alCerrar, alConfirmar }: { estudiante: Estudiante; alCerrar: () => void; alConfirmar: () => void }) {
  return (
    <Dialogo titulo={`¿Desactivar a ${estudiante.nombre}?`} alCerrar={alCerrar}>
      <p className="text-tinta-suave">
        Deja de aparecer en Clase, en las salas y en la pantalla donde los niños eligen su perfil. Su historial se conserva y puedes activarlo cuando quieras.
      </p>
      <div className="flex justify-end gap-2">
        <Boton variante="suave" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton onClick={alConfirmar}>Desactivar perfil</Boton>
      </div>
    </Dialogo>
  )
}

function Eliminar({ estudiante, alCerrar }: { estudiante: Estudiante; alCerrar: () => void }) {
  const navegar = useNavigate()
  const [error, setError] = useState(false)
  const eliminar = async () => {
    setError(false)
    try {
      await repo.eliminarEstudiante(estudiante.id)
      navegar('/docente/estudiantes', { replace: true })
    } catch {
      setError(true)
    }
  }
  return (
    <Dialogo rol="alertdialog" titulo={`¿Eliminar el perfil de ${estudiante.nombre}?`} alCerrar={alCerrar}>
      <p className="text-tinta-suave">
        Se borra todo su historial: partidas, emociones y observaciones. No se puede deshacer. Si solo quieres que deje de aparecer, desactiva el perfil.
      </p>
      {error && <Aviso tono="peligro">No se pudo eliminar. Intenta otra vez.</Aviso>}
      <div className="flex justify-end gap-2">
        <Boton variante="suave" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton variante="peligro" onClick={() => void eliminar()}>
          Eliminar perfil
        </Boton>
      </div>
    </Dialogo>
  )
}

function Avance({ estudianteId }: { estudianteId: string }) {
  // Ítem abierto («categoria|item»): muestra con qué se confundió y sus últimas rondas.
  const [abierto, setAbierto] = useState<string | null>(null)
  const { datos, error, recargar } = useConsulta(
    async () => ({
      resultados: await repo.listarResultados({ estudianteId }),
      emociones: await repo.listarEmociones(estudianteId),
    }),
    [estudianteId],
  )
  if (error) return <AvisoError alReintentar={recargar} />
  if (!datos) return <p className="text-tinta-suave">Cargando el avance…</p>
  const items = avancePorItem(datos.resultados)
  const semana = deEstaSemana(datos.resultados)

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[3fr_2fr]">
      <Tarjeta>
        <h2 className="text-lg font-semibold text-tinta">Cómo llegó</h2>
        {datos.emociones.length === 0 ? (
          <p className="mt-1 text-sm text-tinta-suave">Aún no registra cómo llega.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {datos.emociones.slice(0, 8).map((e) => (
              <li
                key={e.id}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm ${convieneMirar(e.emocion) ? 'border-atencion-borde bg-atencion-fondo' : 'border-borde'}`}
              >
                <span aria-hidden="true">{EMOCIONES[e.emocion].cara}</span>
                <span className="text-tinta">{capitalizar(CON_EMOCION[e.emocion])}</span>
                <span className="text-tinta-suave">{fechaCorta(e.fecha)}</span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta>
        <h2 className="text-lg font-semibold text-tinta">Esta semana</h2>
        <dl className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-tinta-suave">Partidas</dt>
            <dd className="text-3xl font-semibold text-tinta">{semana.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-tinta-suave">Minutos jugando</dt>
            <dd className="text-3xl font-semibold text-tinta">{semana.length ? minutos(semana.reduce((s, r) => s + r.duracionMs, 0)) : 0}</dd>
          </div>
        </dl>
      </Tarjeta>

      <Tarjeta>
        <h2 className="text-lg font-semibold text-tinta">Avance por categoría</h2>
        <p className="mb-4 text-sm text-tinta-suave">Rondas logradas al primer intento, de lo más difícil a lo más fácil. Toca una letra, sílaba o palabra para ver con qué se confunde.</p>
        {items.length === 0 && <p className="text-sm text-tinta-suave">Todavía no hay partidas registradas.</p>}
        {/* Columnas compartidas (subgrid) por todos los grupos: las barras quedan alineadas. */}
        <div className="grid grid-cols-[minmax(4.5rem,max-content)_minmax(4rem,1fr)_auto] gap-x-3 gap-y-5">
          {porCategoria(items).map((g) => (
            <section key={g.categoria} aria-labelledby={`avance-${g.categoria}`} className="col-span-3 grid grid-cols-subgrid gap-y-2">
              <h3 id={`avance-${g.categoria}`} className="col-span-3 text-[13px] font-medium text-tinta-suave">
                {g.titulo}
              </h3>
              <ul className="col-span-3 grid grid-cols-subgrid items-center gap-y-2">
                {g.items.map((a) => {
                  const cuesta = a.tasa < UMBRAL_LE_CUESTA
                  const clave = `${a.categoria}|${a.item}`
                  const verDetalle = abierto === clave
                  return (
                    <li key={a.item} className="col-span-3 grid grid-cols-subgrid items-center gap-y-2">
                      <button
                        type="button"
                        aria-expanded={verDetalle}
                        onClick={() => setAbierto(verDetalle ? null : clave)}
                        className={`max-w-40 rounded text-left font-escolar font-bold break-words text-tinta underline decoration-borde decoration-2 underline-offset-4 hover:decoration-menta-oscuro ${a.item.length > 3 ? 'text-base leading-tight' : 'text-xl'}`}
                      >
                        {capitalizar(a.item)}
                      </button>
                      <span aria-hidden="true" className={`block h-2 rounded-r ${cuesta ? 'bg-atencion-fondo' : 'bg-lienzo'}`}>
                        {a.tasa > 0 && <span className={`block h-full rounded-r ${cuesta ? 'bg-cuesta' : 'bg-menta'}`} style={{ width: `${a.tasa * 100}%` }} />}
                      </span>
                      <span className="flex items-center gap-2 text-sm whitespace-nowrap">
                        <span className="text-tinta tabular-nums">{Math.round(a.tasa * 100)}%</span>
                        <span className="text-tinta-suave">de {a.rondas}</span>
                        {cuesta && <Etiqueta tono="atencion">Le cuesta</Etiqueta>}
                      </span>
                      {verDetalle && (
                        <div className="col-span-3">
                          <DetalleItem resultados={datos.resultados} item={a} />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </Tarjeta>

      <Tarjeta>
        <h2 className="text-lg font-semibold text-tinta">Últimas partidas</h2>
        {datos.resultados.length === 0 ? (
          <p className="mt-1 text-sm text-tinta-suave">Todavía no juega.</p>
        ) : (
          <ul className="mt-2 divide-y divide-borde">
            {datos.resultados.slice(0, 8).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-tinta">{nombreActividad(r.actividadId)}</span>
                  <span className="block text-tinta-suave">
                    {fechaCorta(r.fecha)}, {minutos(r.duracionMs)} min
                  </span>
                </span>
                <span aria-label={`${r.estrellas} de 3 estrellas`} className="shrink-0 tracking-tight text-cuesta">
                  {'★'.repeat(r.estrellas)}
                  <span className="text-borde">{'★'.repeat(3 - r.estrellas)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
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

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[2fr_3fr]">
      <Tarjeta>
        <form
          onSubmit={(ev) => {
            ev.preventDefault()
            if (!texto.trim()) return
            void ejecutar(async () => {
              await repo.agregarObservacion(estudianteId, texto.trim())
              setTexto('')
            })
          }}
        >
          <h2 className="text-lg font-semibold text-tinta">
            <label htmlFor="nueva-observacion">Nueva observación</label>
          </h2>
          <textarea
            id="nueva-observacion"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            className={`${claseEntrada} mt-2`}
            placeholder="Por ejemplo: practicar la R con canciones y rimas."
          />
          <Boton type="submit" disabled={!texto.trim()} className="mt-3">
            Guardar observación
          </Boton>
        </form>
      </Tarjeta>

      <Tarjeta>
        <h2 className="text-lg font-semibold text-tinta">Historial{datos?.length ? ` (${datos.length})` : ''}</h2>
        {error && (
          <Aviso tono="peligro" className="mt-2">
            No se pudo cargar el historial.{' '}
            <button type="button" onClick={recargar} className="font-semibold underline">
              Reintentar
            </button>
          </Aviso>
        )}
        {fallo && (
          <Aviso tono="peligro" className="mt-2">
            No se pudo completar la acción. Intenta otra vez.
          </Aviso>
        )}
        {datos?.length === 0 && <p className="mt-1 text-sm text-tinta-suave">Sin observaciones todavía.</p>}
        <ul className="mt-2 divide-y divide-borde">
          {datos?.map((o) => (
            <li key={o.id} className="py-3">
              {editando?.id === o.id ? (
                <>
                  <label>
                    <span className="sr-only">Editar observación</span>
                    <textarea value={editando.texto} onChange={(e) => setEditando({ id: o.id, texto: e.target.value })} rows={3} className={claseEntrada} autoFocus />
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
                    <Boton variante="suave" onClick={() => setEditando(null)}>
                      Cancelar
                    </Boton>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-tinta">{o.texto}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="mr-auto text-[13px] text-tinta-suave">{fechaCorta(o.fecha)}</span>
                    {borrando === o.id ? (
                      <>
                        <span className="text-sm text-tinta">¿Borrar esta observación?</span>
                        <Boton variante="suave" onClick={() => setBorrando(null)}>
                          Cancelar
                        </Boton>
                        <Boton
                          variante="peligro-suave"
                          onClick={() =>
                            void ejecutar(async () => {
                              await repo.eliminarObservacion(o.id)
                              setBorrando(null)
                            })
                          }
                        >
                          Borrar
                        </Boton>
                      </>
                    ) : (
                      <>
                        <Boton variante="suave" onClick={() => setEditando({ id: o.id, texto: o.texto })}>
                          Editar
                        </Boton>
                        <Boton variante="peligro-suave" onClick={() => setBorrando(o.id)}>
                          Borrar
                        </Boton>
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
