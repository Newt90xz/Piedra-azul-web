import { useState, type FormEvent } from 'react'
import { repo } from '../../../datos/index.ts'
import { EMOCIONES } from '../../../lib/avance.ts'
import { SIN_SALA, enLinea, estadoNino, hoyDe, llego, salasEnOrden, type DatosClase } from '../../../lib/clase.ts'
import { Avatar } from '../../../ui/Avatar.tsx'
import { Boton, BotonEnlace, Campo, Etiqueta, PanelLateral, claseEntrada } from '../../../ui/aula.tsx'

// El detalle de un niño durante la clase, con lo que se puede hacer por él. Se
// abre al tocar su fila; los datos siguen actualizándose mientras está abierto.
export function PanelNino({
  estudianteId,
  datos,
  salaDe,
  pendiente,
  mover,
  ejecutar,
  alCerrar,
}: {
  estudianteId: string
  datos: DatosClase
  salaDe: (id: string) => string
  pendiente: (id: string) => string | undefined
  mover: (id: string, destino: string) => void
  ejecutar: (accion: () => Promise<unknown>) => Promise<void>
  alCerrar: () => void
}) {
  const e = datos.estudiantes.find((x) => x.id === estudianteId)
  const actual = salaDe(estudianteId)
  const [destino, setDestino] = useState(actual)
  const [cerrandoTablet, setCerrandoTablet] = useState(false)
  if (!e) return null

  const sala = datos.salas.find((s) => s.id === actual)
  const estado = estadoNino(sala, datos.progresoDe.get(e.id))
  const conectado = datos.conectados.get(e.id)
  const online = enLinea(conectado)
  const emocion = datos.emocionDe.get(e.id)
  const hoy = hoyDe(datos, e.id)
  const siguiente = sala?.siguienteSala ? datos.salas.find((s) => s.id === sala.siguienteSala) : undefined
  const enCamino = pendiente(e.id) !== undefined

  const moverAqui = (ev: FormEvent) => {
    ev.preventDefault()
    mover(e.id, destino)
  }

  return (
    <PanelLateral
      titulo={
        <span className="flex items-center gap-3">
          <Avatar estudiante={e} className="size-10 text-2xl" />
          <span className="truncate">{e.nombre}</span>
        </span>
      }
      alCerrar={alCerrar}
    >
      <div className="grid gap-6">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Etiqueta tono={online ? 'acento' : 'neutro'}>{online ? 'Con tablet' : 'Sin tablet'}</Etiqueta>
          {emocion && (
            <span className="text-tinta-suave">
              <span aria-hidden="true">{EMOCIONES[emocion].cara}</span> {llego(emocion)}
            </span>
          )}
        </p>

        <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2.5 text-sm">
          <dt className="text-tinta-suave">Sala</dt>
          <dd className="font-medium text-tinta">{sala?.nombre ?? 'Sin sala'}</dd>
          {estado.tipo === 'actividad' && (
            <>
              <dt className="text-tinta-suave">Está en</dt>
              <dd className="text-tinta">
                <span className="block font-medium">{estado.actividad}</span>
                <span className="text-tinta-suave">{estado.contenido}</span>
              </dd>
              <dt className="text-tinta-suave">Avance</dt>
              <dd className="grid gap-1.5 text-tinta">
                Actividad {estado.numero} de {estado.total}
                <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-lienzo">
                  <span className="block h-full rounded-full bg-menta" style={{ width: `${((estado.numero - 1) / estado.total) * 100}%` }} />
                </span>
              </dd>
              <dt className="text-tinta-suave">Intento</dt>
              <dd className="flex items-center gap-2 text-tinta">
                {estado.intento}
                {estado.necesitaAyuda && <Etiqueta tono="atencion">Pide apoyo</Etiqueta>}
              </dd>
            </>
          )}
          {estado.tipo === 'recreo' && (
            <>
              <dt className="text-tinta-suave">Está</dt>
              <dd className="text-tinta">{estado.texto}</dd>
            </>
          )}
          {estado.tipo === 'termino' && (
            <>
              <dt className="text-tinta-suave">Está</dt>
              <dd className="text-tinta">{siguiente ? `Terminó el plan y pasa a ${siguiente.nombre}` : 'Terminó el plan y te espera'}</dd>
            </>
          )}
          {estado.tipo === 'sin-plan' && (
            <>
              <dt className="text-tinta-suave">Está</dt>
              <dd className="text-tinta">La sala aún no tiene plan: juega con los globos</dd>
            </>
          )}
          <dt className="text-tinta-suave">Hoy</dt>
          <dd className="text-tinta">
            {hoy.partidas === 0 ? 'Todavía no juega' : `${hoy.partidas} ${hoy.partidas === 1 ? 'partida' : 'partidas'} en ${hoy.minutos} min`}
          </dd>
        </dl>

        <div className="grid gap-3">
          {estado.tipo === 'actividad' && estado.necesitaAyuda && (
            <Boton onClick={() => void ejecutar(() => repo.marcarApoyado(e.id))}>Ya le ayudé</Boton>
          )}

          <form onSubmit={moverAqui} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Campo etiqueta="Mover a">
                <select value={destino} onChange={(ev) => setDestino(ev.target.value)} className={claseEntrada}>
                  <option value={SIN_SALA}>Sin sala</option>
                  {salasEnOrden(datos.salas).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <Boton type="submit" variante="secundario" disabled={destino === actual || enCamino}>
              {enCamino ? 'Moviendo…' : 'Mover'}
            </Boton>
          </form>

          <BotonEnlace to={`/docente/estudiantes/${e.id}`} variante="secundario">
            Ver ficha
          </BotonEnlace>

          {conectado &&
            (cerrandoTablet ? (
              <div role="group" aria-label="Confirmar" className="grid gap-3 rounded-lg bg-peligro-fondo p-3 text-sm text-tinta">
                <p>
                  ¿Cerrar la tablet de {e.nombre}? Vuelve a la pantalla donde cada niño elige su perfil. Su avance queda guardado.
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  <Boton variante="suave" onClick={() => setCerrandoTablet(false)}>
                    Cancelar
                  </Boton>
                  <Boton
                    variante="peligro"
                    onClick={() => {
                      setCerrandoTablet(false)
                      void ejecutar(() => repo.cerrarDispositivo(e.id))
                    }}
                  >
                    Cerrar tablet
                  </Boton>
                </div>
              </div>
            ) : (
              <Boton variante="peligro-suave" onClick={() => setCerrandoTablet(true)}>
                Cerrar su tablet
              </Boton>
            ))}
        </div>
      </div>
    </PanelLateral>
  )
}
