import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { JUEGOS } from '../../../contenido/actividades.ts'
import { pictoMensaje } from '../../../contenido/mensajes.ts'
import { repo } from '../../../datos/index.ts'
import type { ActividadRecreo, Sala } from '../../../dominio/tipos.ts'
import { RECREO } from '../../../lib/clase.ts'
import { useConsulta } from '../../../lib/useConsulta.ts'
import { Avatar } from '../../../ui/Avatar.tsx'
import { Aviso } from '../../../ui/aula.tsx'

const SALUDOS_CADA_MS = 10_000

// Un recreo: qué se hace (y con qué juegos), de qué salas llegan los niños y,
// en el parque, los últimos saludos. Lo elegido se guarda al instante y quienes
// están dentro lo ven cambiar en su tablet.
export function AjustesRecreo({ sala, salas }: { sala: Sala; salas: Sala[] }) {
  const [actividad, setActividad] = useState(sala.actividad)
  const [juegos, setJuegos] = useState(sala.juegos)
  const [error, setError] = useState<string | null>(null)
  const origenes = salas.filter((s) => s.siguienteSala === sala.id)

  const guardar = async (a: ActividadRecreo, j: string[]) => {
    const antes = { actividad, juegos }
    setActividad(a)
    setJuegos(j)
    setError(null)
    try {
      await repo.configurarRecreo(sala.id, a, j)
    } catch (e) {
      setActividad(antes.actividad)
      setJuegos(antes.juegos)
      setError(e instanceof Error ? e.message : 'No se pudo guardar el cambio.')
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <section aria-labelledby="titulo-recreo" className="rounded-xl border border-borde bg-white px-5 py-4">
        <h2 id="titulo-recreo" className="text-lg font-semibold text-tinta">
          ¿Qué se hace en este recreo?
        </h2>
        <p className="text-sm text-tinta-suave">Se guarda al elegir; quienes estén dentro lo ven cambiar al instante.</p>
        <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Actividad del recreo</legend>
          {(Object.keys(RECREO) as ActividadRecreo[]).map((a) => (
            <label
              key={a}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-menta-oscuro ${
                actividad === a ? 'border-menta-oscuro bg-menta-fondo/50' : 'border-borde hover:bg-lienzo'
              }`}
            >
              <input type="radio" name={`actividad-${sala.id}`} checked={actividad === a} onChange={() => void guardar(a, juegos)} className="mt-1 accent-menta-oscuro" />
              <span>
                <span className="block font-medium text-tinta">{RECREO[a].nombre}</span>
                <span className="block text-sm text-tinta-suave">{RECREO[a].ayuda}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {actividad === 'juegos' && (
          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-tinta">Juegos que pueden elegir</legend>
            {juegos.length === 0 && <p className="mt-1 text-sm text-atencion">Todavía no eliges ninguno.</p>}
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {JUEGOS.map((j) => {
                const activo = juegos.includes(j.id)
                return (
                  <label key={j.id} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm text-tinta hover:bg-lienzo">
                    <input
                      type="checkbox"
                      checked={activo}
                      onChange={() => void guardar(actividad, activo ? juegos.filter((x) => x !== j.id) : [...juegos, j.id])}
                      className="size-4 accent-menta-oscuro"
                    />
                    <span aria-hidden="true">{j.icono}</span>
                    {j.titulo}
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        {error && (
          <Aviso tono="peligro" className="mt-4">
            {error}
          </Aviso>
        )}
      </section>

      <div className="grid gap-5">
        <section aria-labelledby="titulo-llegan" className="rounded-xl border border-borde bg-white px-5 py-4">
          <h2 id="titulo-llegan" className="text-lg font-semibold text-tinta">
            Quiénes llegan aquí
          </h2>
          {origenes.length > 0 ? (
            <>
              <p className="mt-1 text-sm text-tinta-suave">Pasan solos a este recreo al terminar el plan de:</p>
              <ul className="mt-2 grid gap-1">
                {origenes.map((s) => (
                  <li key={s.id}>
                    <Link to={`/docente/salas?sala=${s.id}`} className="text-sm font-medium text-menta-oscuro underline underline-offset-2">
                      {s.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-sm text-tinta-suave">
              Ninguna sala pasa aquí al terminar. Puedes conectarla desde la página de una sala de actividades, o mover niños a este recreo desde Clase.
            </p>
          )}
        </section>
        {actividad === 'parque' && <UltimosSaludos sala={sala} />}
      </div>
    </div>
  )
}

// Lo que se dicen en el parque: el niño, su saludo (un pictograma) y la hora.
function UltimosSaludos({ sala }: { sala: Sala }) {
  const { datos: mensajes, recargar } = useConsulta(() => repo.mensajesSala(sala.id), [sala.id])
  useEffect(() => {
    const t = window.setInterval(() => document.visibilityState === 'visible' && recargar(), SALUDOS_CADA_MS)
    return () => window.clearInterval(t)
  }, [recargar])

  return (
    <section aria-labelledby="titulo-saludos" className="rounded-xl border border-borde bg-white px-5 py-4">
      <h2 id="titulo-saludos" className="text-lg font-semibold text-tinta">
        Últimos saludos
      </h2>
      {!mensajes?.length ? (
        <p className="mt-1 text-sm text-tinta-suave">Cuando se saluden en el parque, aparecerá aquí.</p>
      ) : (
        <ul className="mt-2 grid gap-1">
          {mensajes.slice(0, 8).map((m) => {
            const picto = pictoMensaje(m.picto)
            return (
              <li key={m.id} className="flex items-center gap-2.5 text-sm">
                <Avatar estudiante={m} className="size-7" />
                <span className="min-w-0 flex-1 truncate font-medium text-tinta">{m.nombre}</span>
                <span role="img" aria-label={picto?.voz ?? 'Saludo'} className="text-lg leading-none">
                  {picto?.emoji ?? '👋'}
                </span>
                <time dateTime={m.enviadoEn} className="w-12 text-right text-[13px] text-tinta-suave tabular-nums">
                  {new Date(m.enviadoEn).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </time>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
