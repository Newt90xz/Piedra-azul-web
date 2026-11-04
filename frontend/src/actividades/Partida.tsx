import { useEffect, useRef, useState, type ReactNode } from 'react'
import { actividad, instruccionesDe, type Ronda } from '../contenido/actividades.ts'
import { categoriaDe } from '../contenido/contenidos.ts'
import { nivelDe } from '../contenido/exigencia.ts'
import { guardarResultadoConRespaldo } from '../datos/pendientes.ts'
import type { ContextoPartida, IntentoRonda } from '../dominio/tipos.ts'
import { efecto, hablar, hablarPocket } from '../lib/audio.ts'
import { Moneda } from '../ui/Dibujos.tsx'
import { Icono } from '../ui/Icono.tsx'
import { BotonNino, useNino } from '../ui/nino.tsx'
import { RondaActual } from './rondas.tsx'

// Ciclo de una micro-partida (anatomía de las actividades, sección 2):
// 1.er intento = 3 estrellas y +10 monedas; tras una pista = 2 y +5;
// con la respuesta revelada = 1 y +2. Tres aciertos seguidos dan bono de racha.
const PUNTAJE = [
  { estrellas: 3, monedas: 10 },
  { estrellas: 2, monedas: 5 },
  { estrellas: 1, monedas: 2 },
]
const BONO_RACHA = 2
// Práctica (no se puede fallar): solo la recompensa base por completar, sin racha.
const PRACTICA = { estrellas: 3, monedas: 2 }

interface Registro {
  item: string
  intentos: number
  error?: string
  estrellas: number
  monedas: number
  tiempoMs: number
}

// Lo que deja una partida terminada. El detalle (intentos por ronda, tiempo)
// queda guardado para los reportes de la docente; el niño solo ve sus monedas.
export interface FinPartida {
  resultadoId: string
  rondas: IntentoRonda[]
  estrellas: number
  monedas: number
}

export function Partida({
  actividadId,
  rondas,
  alTerminar,
  alSalir,
  objetivo,
  instrucciones,
  icono,
  contexto,
}: {
  actividadId: string
  rondas: Ronda[]
  alTerminar: (fin: FinPartida) => void
  objetivo?: string
  // «¿Cómo se juega?»: si no viene, el de la actividad o el del tipo de ronda.
  instrucciones?: string
  // Ícono de la tarjeta de instrucciones (el del contenido); si no, el de la actividad.
  icono?: string
  // Solo en los juegos: en los contenidos el niño sigue el camino que armó la docente.
  alSalir?: () => void
  // Foto de la partida: sala, contenido, parámetros…
  contexto?: ContextoPartida
}) {
  const { estudiante, silenciado, recargar } = useNino()
  // `error`: la última respuesta equivocada de esta ronda (se reemplaza en cada fallo).
  const [estado, setEstado] = useState<{ indice: number; intentos: number; resuelta: boolean; error?: string }>({ indice: 0, intentos: 0, resuelta: false })
  const [registro, setRegistro] = useState<Registro[]>([])
  const [racha, setRacha] = useState(0)
  const [inicio] = useState(() => Date.now())
  const terminada = useRef(false)
  const inicioRonda = useRef(0)
  const datosActividad = actividad(actividadId)
  const practica = datosActividad?.practica ?? false
  const tituloObjetivo = objetivo ?? datosActividad?.objetivo
  const comoSeJuega = instruccionesDe(rondas, instrucciones ?? datosActividad?.instrucciones)
  // Desafíos por nivel de exigencia: tras cuántos errores se ilumina la respuesta.
  const { revelarTras } = nivelDe(estudiante.ajustes.exigencia)
  // Antes de la primera ronda se muestra cómo se juega; el botón «?» la vuelve a abrir.
  const [verInstrucciones, setVerInstrucciones] = useState(Boolean(comoSeJuega))

  const ronda = rondas[estado.indice]

  useEffect(() => {
    if (!ronda || verInstrucciones) return
    inicioRonda.current = Date.now()
    hablarPocket(ronda.instruccion)
  }, [ronda, verInstrucciones])

  // Fin: RF-12, se guarda fecha, intentos por ronda y tiempo empleado. El id se
  // genera una sola vez para que los reintentos no dupliquen el resultado.
  useEffect(() => {
    if (ronda || terminada.current) return
    terminada.current = true
    const promedio = registro.reduce((s, r) => s + r.estrellas, 0) / Math.max(1, registro.length)
    const fin: FinPartida = {
      resultadoId: crypto.randomUUID(),
      // Acertada = resuelta antes de que se iluminara la respuesta.
      rondas: registro.map((r) => ({
        item: r.item,
        intentos: r.intentos,
        acertada: r.intentos <= revelarTras,
        error: r.error,
        categoria: categoriaDe(actividadId),
        tiempoMs: r.tiempoMs,
        revelada: r.intentos > revelarTras,
      })),
      estrellas: promedio >= 2.5 ? 3 : promedio >= 1.75 ? 2 : 1,
      monedas: registro.reduce((s, r) => s + r.monedas, 0),
    }
    void guardarResultadoConRespaldo({
      id: fin.resultadoId,
      estudianteId: estudiante.id,
      actividadId,
      fecha: new Date().toISOString(),
      duracionMs: Date.now() - inicio,
      rondas: fin.rondas,
      estrellas: fin.estrellas,
      monedas: fin.monedas,
      contexto: { ...contexto, mecanica: rondas[0]?.tipo, practica, version: 1 },
    }).then(recargar)
    alTerminar(fin)
  }, [ronda, registro, actividadId, estudiante.id, inicio, recargar, alTerminar, revelarTras, contexto, rondas, practica])

  const avanzar = (desde: number) =>
    setEstado((e) => (e.indice === desde ? { indice: desde + 1, intentos: 0, resuelta: false } : e))

  const intentar = (correcto: boolean, respuesta?: string) => {
    if (estado.resuelta || !ronda) return
    const intentos = estado.intentos + 1
    if (!correcto) {
      setEstado({ ...estado, intentos, error: respuesta ?? estado.error })
      setRacha(0)
      efecto('intento', silenciado)
      if ('pista' in ronda) hablar(intentos < revelarTras ? ronda.pista : '¡Mira! Es esta. ¡Tócala!')
      return
    }
    const p = practica ? PRACTICA : PUNTAJE[Math.min(intentos, 3) - 1]
    const nuevaRacha = !practica && intentos === 1 ? racha + 1 : 0
    setRacha(nuevaRacha)
    const bono = nuevaRacha >= 3 ? BONO_RACHA : 0
    setRegistro((r) => [...r, { item: ronda.item, intentos, error: estado.error, estrellas: p.estrellas, monedas: p.monedas + bono, tiempoMs: Date.now() - inicioRonda.current }])
    setEstado({ ...estado, intentos, resuelta: true })
    efecto('acierto', silenciado)
    const desde = estado.indice
    if (ronda.refuerzo) {
      hablar(ronda.refuerzo, { alTerminar: () => window.setTimeout(() => avanzar(desde), 500) })
    } else {
      window.setTimeout(() => avanzar(desde), 500)
    }
    // Respaldo por si el audio no avisa que terminó.
    window.setTimeout(() => avanzar(desde), 6000)
  }

  if (!ronda) return null

  if (verInstrucciones)
    return (
      <Instrucciones
        icono={icono ?? datosActividad?.icono}
        titulo={tituloObjetivo}
        texto={comoSeJuega}
        alEmpezar={() => setVerInstrucciones(false)}
        alSalir={alSalir}
      />
    )

  return (
    <main className="animate-pantalla mx-auto flex h-full max-w-5xl flex-col px-6 py-4">
      {/* El objetivo va en la misma fila que los botones: así la ronda tiene todo el alto. */}
      <div className="mb-3 flex shrink-0 items-center gap-4">
        {alSalir && (
          <BotonNino voz="Volver a los juegos" onClick={alSalir} className="grid size-20 place-items-center bg-nino-lila">
            <Icono nombre="izquierda" className="size-9" />
          </BotonNino>
        )}
        <BotonNino voz="Escuchar otra vez" onClick={() => hablarPocket(ronda.instruccion)} className="grid size-20 place-items-center border-nino-ok bg-nino-menta">
          <Icono nombre="altavoz" className="size-10" />
        </BotonNino>
        {comoSeJuega && (
          <BotonNino voz="¿Cómo se juega?" onClick={() => setVerInstrucciones(true)} className="grid size-20 place-items-center bg-nino-amarillo text-[1.6em] font-bold">
            <span aria-hidden="true">?</span>
          </BotonNino>
        )}
        {tituloObjetivo ? (
          <h1 className="line-clamp-2 min-w-0 flex-1 text-center text-[1.15em] leading-tight font-bold text-tinta">{tituloObjetivo}</h1>
        ) : (
          <span className="flex-1" />
        )}
        {racha >= 2 && (
          <span className="animate-pop rounded-full bg-nino-amarillo px-4 py-1 text-[0.8em] font-bold" aria-label={`Racha de ${racha}`}>
            🔥 {racha}
          </span>
        )}
        <ol className="flex gap-2" aria-label={`Ronda ${estado.indice + 1} de ${rondas.length}`}>
          {rondas.map((_, i) => (
            <li
              key={i}
              className={`size-5 rounded-full border-3 ${i < estado.indice ? 'border-nino-ok bg-nino-ok' : i === estado.indice ? 'border-nino-borde bg-nino-amarillo' : 'border-nino-borde bg-white'}`}
            />
          ))}
        </ol>
      </div>
      {/* «safe»: si una ronda no cabe, se corre hacia abajo en vez de tapar el título. */}
      <div key={estado.indice} className="animate-pantalla grid min-h-0 flex-1 [align-content:safe_center]">
        <RondaActual
          ronda={ronda}
          resuelta={estado.resuelta}
          revelar={!estado.resuelta && estado.intentos >= revelarTras}
          errores={Math.max(0, estado.intentos - (estado.resuelta ? 1 : 0))}
          alIntentar={intentar}
        />
      </div>
    </main>
  )
}

// «¿Cómo se juega?»: antes de la primera ronda (y con el botón «?»). Una mano
// que toca muestra que se juega tocando; el texto va en mayúscula para que la
// docente lo lea o el niño lo reconozca, y la voz lo dice si está activada.
function Instrucciones({
  icono,
  titulo,
  texto,
  alEmpezar,
  alSalir,
}: {
  icono?: string
  titulo?: string
  texto: string
  alEmpezar: () => void
  alSalir?: () => void
}) {
  useEffect(() => hablar(texto), [texto])
  return (
    <main className="animate-pantalla mx-auto grid h-full max-w-3xl content-center justify-items-center gap-5 px-6 py-4 text-center">
      <div className="tarjeta-nino grid w-full justify-items-center gap-3 rounded-[2rem] border-3 border-nino-azul bg-white px-8 py-5">
        <span aria-hidden="true" className="relative text-[2.6em] leading-none">
          {icono ?? '🎯'}
          <span className="instrucciones-mano absolute -right-6 -bottom-4 text-[0.6em]">👆</span>
        </span>
        {titulo && <h1 className="text-[1.1em] leading-tight font-bold">{titulo.toUpperCase()}</h1>}
        <p className="max-w-xl text-[0.85em] leading-snug font-bold text-nino-tinta/80">{texto.toUpperCase()}</p>
        <div className="flex gap-4">
          <BotonNino voz="Escuchar otra vez" onClick={() => hablar(texto)} className="grid size-20 place-items-center border-nino-ok bg-nino-menta">
            <Icono nombre="altavoz" className="size-10" />
          </BotonNino>
          {alSalir && (
            <BotonNino voz="Volver a los juegos" onClick={alSalir} className="grid size-20 place-items-center bg-nino-lila">
              <Icono nombre="izquierda" className="size-9" />
            </BotonNino>
          )}
        </div>
      </div>
      <BotonNino voz="¡A jugar!" onClick={alEmpezar} className="grid size-24 place-items-center rounded-full border-nino-ok bg-nino-menta">
        <span aria-hidden="true" className="text-[2em]">▶</span>
      </BotonNino>
    </main>
  )
}

// Pantalla de premio para el niño: solo las monedas que ganó, sin texto (las
// estadísticas son para la docente). `logrado` celebra que pasa a la siguiente
// actividad y `repetir` anima a intentarlo de nuevo, sin mensajes punitivos (RF-11).
export function Premio({
  monedas,
  variante,
  children,
}: {
  monedas: number
  variante: 'logrado' | 'repetir' | 'juego'
  children: ReactNode
}) {
  const { silenciado } = useNino()

  useEffect(() => {
    efecto('premio', silenciado)
    hablar(
      variante === 'logrado'
        ? `¡Lo lograste! Ganaste ${monedas} monedas.`
        : variante === 'repetir'
          ? `¡Ganaste ${monedas} monedas! Vamos a intentarlo otra vez.`
          : `¡Muy bien! Ganaste ${monedas} monedas.`,
    )
    // Solo al aparecer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="animate-pantalla mx-auto grid h-full max-w-3xl content-center justify-items-center gap-8 px-6 py-6 text-center">
      <div className="relative grid place-items-center">
        <span aria-hidden="true" className="premio-brillo absolute size-[7em] rounded-full" />
        <span aria-hidden="true" className="premio-moneda relative text-[5em] leading-none">
          <Moneda />
        </span>
      </div>
      <p
        className="animate-pop inline-flex items-center gap-3 rounded-full border-3 border-[#e6c84d] bg-nino-amarillo px-10 py-3 text-[2em] font-bold"
        aria-label={`Ganaste ${monedas} monedas`}
      >
        +{monedas}
      </p>
      {variante !== 'juego' && (
        <span
          role="img"
          aria-label={variante === 'logrado' ? 'Lo lograste' : 'Otra vez'}
          className={`text-[3em] leading-none ${variante === 'logrado' ? 'animate-pop' : 'premio-girar'}`}
        >
          {variante === 'logrado' ? '🎉' : '🔁'}
        </span>
      )}
      <div className="flex flex-wrap justify-center gap-6">{children}</div>
    </main>
  )
}
