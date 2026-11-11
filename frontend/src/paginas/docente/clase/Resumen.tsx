import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Emocion } from '../../../dominio/tipos.ts'
import { EMOCIONES } from '../../../lib/avance.ts'
import { CON_EMOCION, convieneMirar, type resumenHoy, type resumenSemana } from '../../../lib/clase.ts'
import { Avatar } from '../../../ui/Avatar.tsx'
import { capitalizar } from '../../../lib/texto.ts'

// Lo primero de Clase: el curso en cifras (ahora, hoy y en la semana), lo que
// más les cuesta, cómo llegaron y quiénes aún no juegan. Es lo más grande de la
// página; el tablero de salas viene después. El detalle por niño está en Avance.
export function Resumen({
  total,
  conTablet,
  sinSala,
  hoy,
  semana,
  errorSemana,
  alAbrir,
}: {
  total: number
  conTablet: number
  sinSala: number
  hoy: ReturnType<typeof resumenHoy>
  semana?: ReturnType<typeof resumenSemana>
  errorSemana: boolean
  // Abre el panel de un niño (el mismo del tablero).
  alAbrir: (estudianteId: string) => void
}) {
  const sinSemana = errorSemana ? 'No se pudo cargar la semana.' : 'Cargando…'
  return (
    <div className="mb-6 grid gap-4">
      <section aria-label="La clase en cifras" className="grid gap-3 md:grid-cols-3">
        <Cifra etiqueta="Con tablet ahora" valor={conTablet} total={total} className="bg-celeste-fondo">
          {sinSala === 0 ? 'Todos están en una sala' : `${sinSala} sin sala`}
        </Cifra>
        <Cifra etiqueta="Jugaron hoy" valor={hoy.jugaron} total={total} className="bg-menta-fondo">
          {partidas(hoy.partidas)}
        </Cifra>
        <Cifra etiqueta="Jugaron esta semana" valor={semana?.jugaron} total={total} className="bg-sala-amarillo">
          {semana ? `${partidas(semana.partidas)} desde el lunes` : sinSemana}
        </Cifra>
      </section>

      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[3fr_2fr]">
        <Panel
          titulo="Lo que más les cuesta esta semana"
          accion={
            <Link to="/docente/avance" className="shrink-0 text-sm font-medium text-menta-oscuro underline underline-offset-2">
              Ver en Avance
            </Link>
          }
        >
          {!semana ? (
            <p className="text-sm text-tinta-suave">{sinSemana}</p>
          ) : semana.cuestan.length === 0 ? (
            <p className="text-sm text-tinta-suave">Aún no hay suficientes partidas esta semana para saberlo.</p>
          ) : (
            <>
              <p className="mt-0.5 text-sm text-tinta-suave">Rondas logradas al primer intento</p>
              <div className="mt-3 grid gap-4">
                {semana.cuestan.map((g) => (
                  <div key={g.categoria}>
                    <h3 className="mb-1.5 text-[13px] font-medium text-tinta-suave">{g.titulo}</h3>
                    <ul className="grid gap-1.5">
                      {g.items.map((a) => (
                        <li key={a.item} title={`${a.primerIntento} de ${a.rondas} rondas al primer intento`} className="flex items-center gap-3">
                          <span
                            className={`w-16 shrink-0 font-escolar leading-tight font-bold break-words text-tinta ${a.item.length > 4 ? 'text-base' : 'text-xl'}`}
                          >
                            {a.item}
                          </span>
                          <Barra valor={a.tasa} relleno="bg-cuesta" pista="bg-atencion-fondo" />
                          <span className="w-10 shrink-0 text-right text-sm text-tinta tabular-nums">{Math.round(a.tasa * 100)}%</span>
                          <span className="sr-only">
                            , {a.primerIntento} de {a.rondas} rondas
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>

        <div className="grid gap-4">
          <Panel titulo="Cómo llegaron hoy">
            <ul className="mt-2 grid gap-2">
              {(Object.keys(EMOCIONES) as Emocion[]).map((emocion) => (
                <li key={emocion} className="flex items-center gap-3">
                  <span aria-hidden="true" className="w-6 shrink-0 text-center text-lg leading-none">
                    {EMOCIONES[emocion].cara}
                  </span>
                  <span className="w-24 shrink-0 text-sm text-tinta">{capitalizar(CON_EMOCION[emocion])}</span>
                  {/* Tristeza y enojo en el color de atención, como en el tablero. */}
                  <Barra valor={total ? hoy.llegaron[emocion] / total : 0} relleno={convieneMirar(emocion) ? 'bg-cuesta' : 'bg-niebla'} pista="bg-lienzo" />
                  <span className="w-8 shrink-0 text-right text-sm font-medium text-tinta tabular-nums">{hoy.llegaron[emocion]}</span>
                </li>
              ))}
            </ul>
            {hoy.sinResponder > 0 && (
              <p className="mt-3 text-sm text-tinta-suave">
                {hoy.sinResponder === total ? 'Nadie ha respondido todavía.' : `${hoy.sinResponder} aún sin responder.`}
              </p>
            )}
          </Panel>
          {semana && semana.jugaron > 0 && semana.sinJugar.length > 0 && (
            <Panel titulo={`Aún no juegan esta semana (${semana.sinJugar.length})`}>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {semana.sinJugar.slice(0, SIN_JUGAR_VISIBLES).map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => alAbrir(e.id)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-borde bg-white py-0.5 pr-3 pl-1 text-sm font-medium text-tinta hover:bg-lienzo"
                    >
                      <Avatar estudiante={e} className="size-7" />
                      {e.nombre}
                    </button>
                  </li>
                ))}
                {semana.sinJugar.length > SIN_JUGAR_VISIBLES && (
                  <li className="self-center px-1 text-sm text-tinta-suave">y {semana.sinJugar.length - SIN_JUGAR_VISIBLES} más</li>
                )}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

// Los que caben antes de resumir con «y N más».
const SIN_JUGAR_VISIBLES = 12

const partidas = (n: number) => `${n} ${n === 1 ? 'partida' : 'partidas'}`

// Una cifra del resumen: cuántos de los niños del curso, y una línea de contexto.
function Cifra({ etiqueta, valor, total, className = '', children }: { etiqueta: string; valor?: number; total: number; className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-xl px-5 py-4 ${className}`}>
      <p className="text-sm font-medium text-tinta">{etiqueta}</p>
      <p className="mt-1 text-tinta-suave">
        <span className="text-3xl font-semibold text-tinta">{valor ?? '…'}</span> de {total}
      </p>
      <p className="mt-0.5 text-sm text-tinta-suave">{children}</p>
    </div>
  )
}

function Panel({ titulo, accion, children }: { titulo: string; accion?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="rounded-xl border border-borde bg-white px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-lg font-semibold text-tinta">
          {titulo}
        </h2>
        {accion}
      </div>
      {children}
    </section>
  )
}

// Barra de una lista de medidores: la pista es un paso claro del mismo color;
// cuadrada en la base y redondeada en el extremo del dato. El valor siempre va
// escrito al lado: la barra no es la única forma de leerlo.
function Barra({ valor, relleno, pista }: { valor: number; relleno: string; pista: string }) {
  return (
    <span aria-hidden="true" className={`block h-2 min-w-0 flex-1 rounded-r ${pista}`}>
      {valor > 0 && <span className={`block h-full rounded-r ${relleno}`} style={{ width: `${Math.min(100, valor * 100)}%` }} />}
    </span>
  )
}
