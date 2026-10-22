import { useCallback, useEffect, useState } from 'react'
import { Partida, Premio, type FinPartida } from '../../actividades/Partida.tsx'
import { JUEGOS, type Actividad, type Ronda } from '../../contenido/actividades.ts'
import { aprobo, planDe, type PasoPlan } from '../../contenido/contenidos.ts'
import { repo } from '../../datos/index.ts'
import type { EstadoAlumno } from '../../dominio/tipos.ts'
import { hablar } from '../../lib/audio.ts'
import { Icono } from '../../ui/Icono.tsx'
import { BotonNino, useNino } from '../../ui/nino.tsx'
import { MiniJuego } from '../alumno/MiniJuego.tsx'

type SalaTrabajo = NonNullable<EstadoAlumno['sala']>

// Sala de trabajo: el niño recorre en orden las actividades de los contenidos
// que asignó la docente. Con 60 % o más pasa a la siguiente; si no, la repite
// con otras rondas del mismo pool. Al terminar todas ve un resumen y llega a
// los juegos de la sala. El niño nunca elige qué contenido trabajar.
export default function Secuencia({ sala }: { sala: SalaTrabajo }) {
  const { estado, recargar } = useNino()
  const plan = planDe(sala.contenidos)
  // El servidor manda; lo local evita esperar al próximo refresco tras terminar.
  const [pasoLocal, setPasoLocal] = useState(0)
  const paso = Math.max(pasoLocal, estado.progreso.paso)
  const [fase, setFase] = useState<'camino' | 'jugando' | 'premio'>('camino')
  const [intento, setIntento] = useState(0)
  const [rondas, setRondas] = useState<Ronda[]>([])
  const [ultimo, setUltimo] = useState<{ monedas: number; logrado: boolean } | null>(null)
  // Estrellas de cada actividad lograda en esta sesión, para el resumen final.
  const [estrellas, setEstrellas] = useState<Record<string, number>>({})
  const [verResumen, setVerResumen] = useState(false)

  const actual: PasoPlan | undefined = plan[paso]

  const empezar = () => {
    if (!actual) return
    setRondas(actual.generar())
    setIntento((n) => n + 1)
    setFase('jugando')
  }

  const terminar = useCallback(
    (fin: FinPartida) => {
      if (!actual) return
      const logrado = aprobo(fin.rondas)
      setUltimo({ monedas: fin.monedas, logrado })
      setFase('premio')
      if (logrado) {
        setEstrellas((e) => ({ ...e, [actual.actividadId]: fin.estrellas }))
        setPasoLocal(paso + 1)
        if (paso + 1 === plan.length) setVerResumen(true)
      }
      void registrar(sala.asignacion, paso, logrado, fin.resultadoId).then(recargar)
    },
    [actual, paso, plan.length, sala.asignacion, recargar],
  )

  if (plan.length === 0) return <SinPlan />

  if (fase === 'jugando' && actual) {
    return <Partida key={intento} actividadId={actual.actividadId} rondas={rondas} alTerminar={terminar} />
  }

  if (fase === 'premio' && ultimo) {
    return (
      <Premio monedas={ultimo.monedas} variante={ultimo.logrado ? 'logrado' : 'repetir'}>
        <BotonNino
          voz={ultimo.logrado ? 'Seguir' : 'Intentar otra vez'}
          onClick={() => setFase('camino')}
          className="grid size-28 place-items-center border-[#e6c84d] bg-nino-amarillo"
        >
          {ultimo.logrado ? <Icono nombre="derecha" className="size-14" /> : <span aria-hidden="true" className="text-[1.6em]">🔁</span>}
        </BotonNino>
      </Premio>
    )
  }

  if (!actual) {
    if (verResumen) return <Resumen plan={plan} estrellas={estrellas} alSeguir={() => setVerResumen(false)} />
    return <Juegos sala={sala} />
  }

  return <Camino plan={plan} paso={paso} repeticion={estado.progreso.paso === paso ? estado.progreso.repeticiones : 0} alEmpezar={empezar} />
}

// Reintenta unas veces: si no llega, el avance queda en el dispositivo hasta el
// próximo refresco y el niño repetiría la actividad (nunca salta una).
async function registrar(asignacion: string, paso: number, logrado: boolean, resultadoId: string) {
  for (let i = 0; i < 3; i++) {
    try {
      await repo.registrarProgreso(asignacion, paso, logrado, resultadoId)
      return
    } catch (e) {
      if ((e as Error).message === 'plan_cambiado') return
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  console.warn('[progreso] No se pudo registrar el avance.')
}

// El camino: un globo por actividad, agrupados por contenido. Lo hecho queda
// con ✓, la actual late. Un solo botón grande para empezar. Al llegar a la sala
// las cajas de los contenidos entran una tras otra y al final el botón.
const RETRASO_CAJA_MS = 140
function Camino({ plan, paso, repeticion, alEmpezar }: { plan: PasoPlan[]; paso: number; repeticion: number; alEmpezar: () => void }) {
  const actual = plan[paso]
  const contenidos = plan.filter((p) => p.numero === 1).map((p) => p.contenido)

  useEffect(() => {
    hablar(repeticion > 0 ? `¡Vamos otra vez! ${actual.contenido.pasos[actual.numero - 1].titulo}.` : `¡Vamos! ${actual.contenido.pasos[actual.numero - 1].titulo}.`)
  }, [actual, repeticion])

  return (
    <main className="mx-auto grid h-full max-w-5xl content-center justify-items-center gap-10 px-6 py-6">
      <ol className="flex flex-wrap justify-center gap-5" aria-label={`Actividad ${paso + 1} de ${plan.length}`}>
        {contenidos.map((c, ci) => (
          <li
            key={`${c.id}-${ci}`}
            className="caja-entra flex items-center gap-2 rounded-full border-3 border-nino-borde bg-white/80 py-2 pr-4 pl-2"
            style={{ animationDelay: `${ci * RETRASO_CAJA_MS}ms` }}
          >
            <span aria-hidden="true" className="grid size-14 place-items-center rounded-full text-[1.4em]" style={{ background: c.color }}>
              {c.icono}
            </span>
            {[0, 1, 2].map((k) => {
              const i = ci * 3 + k
              const hecho = i < paso
              const aqui = i === paso
              return (
                <span
                  key={k}
                  aria-hidden="true"
                  className={`grid size-10 place-items-center rounded-full border-3 text-[0.6em] font-bold ${
                    hecho ? 'border-nino-ok bg-nino-ok' : aqui ? 'camino-aqui border-nino-borde bg-nino-amarillo' : 'border-nino-borde bg-white'
                  }`}
                >
                  {hecho ? '✓' : ''}
                </span>
              )
            })}
          </li>
        ))}
      </ol>

      <BotonNino
        voz="¡Empezar!"
        onClick={alEmpezar}
        className="caja-entra grid size-48 place-items-center rounded-full border-nino-ok"
        style={{ background: actual.contenido.color, animationDelay: `${contenidos.length * RETRASO_CAJA_MS + 100}ms` }}
      >
        <span aria-hidden="true" className="grid justify-items-center gap-1 leading-none">
          <span className="text-[2.6em]">{actual.contenido.icono}</span>
          <span className="text-[1.4em]">▶</span>
        </span>
      </BotonNino>
    </main>
  )
}

// Retroalimentación breve al terminar el plan: cada contenido con sus estrellas.
// Sin números ni texto; el detalle (tiempos, intentos) queda para la docente.
function Resumen({ plan, estrellas, alSeguir }: { plan: PasoPlan[]; estrellas: Record<string, number>; alSeguir: () => void }) {
  const contenidos = plan.filter((p) => p.numero === 1).map((p) => p.contenido)

  useEffect(() => hablar('¡Terminaste todo! Mira tus estrellas.'), [])

  return (
    <main className="mx-auto grid h-full max-w-4xl content-center justify-items-center gap-10 px-6 py-6">
      <span role="img" aria-label="¡Terminaste!" className="animate-pop text-[4em] leading-none">🏆</span>
      <ul className="grid w-full gap-4 sm:grid-cols-2">
        {contenidos.map((c, ci) => {
          const propias = plan.filter((p) => p.contenido.id === c.id).map((p) => estrellas[p.actividadId]).filter((e) => e !== undefined)
          // Si recargó a mitad de camino no hay estrellas guardadas aquí: se muestran las 3 por haberlo logrado.
          const n = propias.length ? Math.round(propias.reduce((s, e) => s + e, 0) / propias.length) : 3
          return (
            <li
              key={`${c.id}-${ci}`}
              className="tarjeta-nino animate-aparecer flex items-center gap-4 rounded-[1.75rem] border-3 border-nino-azul bg-white px-5 py-3"
              style={{ animationDelay: `${ci * 150}ms`, animationFillMode: 'backwards' }}
              aria-label={`${n} de 3 estrellas`}
            >
              <span aria-hidden="true" className="grid size-16 place-items-center rounded-full text-[1.6em]" style={{ background: c.color }}>
                {c.icono}
              </span>
              <span aria-hidden="true" className="text-[1.3em] tracking-wider">
                {'⭐'.repeat(n)}
                <span className="opacity-25 grayscale">{'⭐'.repeat(3 - n)}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <BotonNino voz="¡A jugar!" onClick={alSeguir} className="grid size-28 place-items-center border-[#e6c84d] bg-nino-amarillo">
        <Icono nombre="derecha" className="size-14" />
      </BotonNino>
    </main>
  )
}

// Juegos de la sala: el punto de llegada tras los contenidos. Se juegan las
// veces que quiera, siempre con rondas nuevas del pool, hasta que la docente
// lo mueva de sala.
function Juegos({ sala }: { sala: SalaTrabajo }) {
  const juegos = JUEGOS.filter((j) => sala.juegos.includes(j.id))
  const [jugando, setJugando] = useState<{ juego: Actividad; rondas: Ronda[]; n: number } | null>(null)
  const [premio, setPremio] = useState<number | null>(null)
  const solo = juegos.length === 1 ? juegos[0] : null

  const jugar = (juego: Actividad) => {
    setPremio(null)
    setJugando((j) => ({ juego, rondas: juego.generar(), n: (j?.n ?? 0) + 1 }))
  }

  useEffect(() => {
    if (!jugando && juegos.length > 1) hablar('¡Elige un juego!')
  }, [jugando, juegos.length])

  const terminar = useCallback((fin: FinPartida) => setPremio(fin.monedas), [])

  // Sin juegos asignados: terminó y espera a la docente.
  if (juegos.length === 0) return <MiniJuego />

  if (jugando && premio !== null) {
    return (
      <Premio monedas={premio} variante="juego">
        {!solo && (
          <BotonNino voz="Volver a los juegos" onClick={() => setJugando(null)} className="grid size-28 place-items-center bg-nino-lila">
            <Icono nombre="izquierda" className="size-12" />
          </BotonNino>
        )}
        <BotonNino voz="¡Jugar otra vez!" onClick={() => jugar(jugando.juego)} className="grid size-28 place-items-center border-[#e6c84d] bg-nino-amarillo">
          <span aria-hidden="true" className="text-[1.6em]">🔁</span>
        </BotonNino>
      </Premio>
    )
  }

  if (jugando) {
    return (
      <Partida
        key={jugando.n}
        actividadId={jugando.juego.id}
        rondas={jugando.rondas}
        alTerminar={terminar}
        alSalir={solo ? undefined : () => setJugando(null)}
      />
    )
  }

  return (
    <main className="mx-auto grid h-full max-w-4xl content-center justify-items-center gap-8 px-6 py-6">
      <div className={`grid w-full gap-6 ${solo ? 'max-w-sm' : 'sm:grid-cols-2'}`}>
        {juegos.map((j, i) => (
          <span key={j.id} className="caja-entra" style={{ animationDelay: `${i * RETRASO_CAJA_MS}ms` }}>
            <TarjetaJuego juego={j} alTocar={() => jugar(j)} />
          </span>
        ))}
      </div>
    </main>
  )
}

function TarjetaJuego({ juego, alTocar }: { juego: Actividad; alTocar: () => void }) {
  return (
    <BotonNino voz={juego.titulo} onClick={alTocar} className="grid min-h-[6em] w-full min-w-[8em] place-items-center gap-2 bg-nino-menta p-6">
      <span aria-hidden="true" className="text-[3em] leading-none">{juego.icono}</span>
      <span aria-hidden="true" className="text-[1.2em]">▶</span>
    </BotonNino>
  )
}

// La docente creó la sala pero aún no le asigna contenidos.
function SinPlan() {
  return <MiniJuego />
}
