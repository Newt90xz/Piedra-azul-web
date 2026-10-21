import { useEffect, useRef, useState, type ReactNode } from 'react'
import { actividad, type Ronda } from '../contenido/actividades.ts'
import { guardarResultadoConRespaldo } from '../datos/pendientes.ts'
import type { IntentoRonda } from '../dominio/tipos.ts'
import { efecto, hablar } from '../lib/audio.ts'
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
  estrellas: number
  monedas: number
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
}: {
  actividadId: string
  rondas: Ronda[]
  alTerminar: (fin: FinPartida) => void
  // Solo en los juegos: en los contenidos el niño sigue el camino que armó la docente.
  alSalir?: () => void
}) {
  const { estudiante, silenciado, recargar } = useNino()
  const [estado, setEstado] = useState({ indice: 0, intentos: 0, resuelta: false })
  const [registro, setRegistro] = useState<Registro[]>([])
  const [racha, setRacha] = useState(0)
  const [inicio] = useState(() => Date.now())
  const terminada = useRef(false)
  const practica = actividad(actividadId)?.practica ?? false

  const ronda = rondas[estado.indice]

  useEffect(() => {
    if (ronda) hablar(ronda.instruccion)
  }, [ronda])

  // Fin: RF-12, se guarda fecha, intentos por ronda y tiempo empleado. El id se
  // genera una sola vez para que los reintentos no dupliquen el resultado.
  useEffect(() => {
    if (ronda || terminada.current) return
    terminada.current = true
    const promedio = registro.reduce((s, r) => s + r.estrellas, 0) / Math.max(1, registro.length)
    const fin: FinPartida = {
      resultadoId: crypto.randomUUID(),
      rondas: registro.map((r) => ({ item: r.item, intentos: r.intentos, acertada: r.intentos < 3 })),
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
    }).then(recargar)
    alTerminar(fin)
  }, [ronda, registro, actividadId, estudiante.id, inicio, recargar, alTerminar])

  const avanzar = (desde: number) =>
    setEstado((e) => (e.indice === desde ? { indice: desde + 1, intentos: 0, resuelta: false } : e))

  const intentar = (correcto: boolean) => {
    if (estado.resuelta || !ronda) return
    const intentos = estado.intentos + 1
    if (!correcto) {
      setEstado({ ...estado, intentos })
      setRacha(0)
      efecto('intento', silenciado)
      if ('pista' in ronda) hablar(intentos === 1 ? ronda.pista : '¡Mira! Es esta. ¡Tócala!')
      return
    }
    const p = practica ? PRACTICA : PUNTAJE[Math.min(intentos, 3) - 1]
    const nuevaRacha = !practica && intentos === 1 ? racha + 1 : 0
    setRacha(nuevaRacha)
    const bono = nuevaRacha >= 3 ? BONO_RACHA : 0
    setRegistro((r) => [...r, { item: ronda.item, intentos, estrellas: p.estrellas, monedas: p.monedas + bono }])
    setEstado({ ...estado, intentos, resuelta: true })
    efecto('acierto', silenciado)
    const desde = estado.indice
    hablar(ronda.refuerzo, { alTerminar: () => window.setTimeout(() => avanzar(desde), 500) })
    // Respaldo por si el audio no avisa que terminó.
    window.setTimeout(() => avanzar(desde), 6000)
  }

  if (!ronda) return null

  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-6 flex items-center gap-4">
        {alSalir && (
          <BotonNino voz="Volver a los juegos" onClick={alSalir} className="grid size-20 place-items-center bg-nino-lila">
            <Icono nombre="izquierda" className="size-9" />
          </BotonNino>
        )}
        <BotonNino voz="Escuchar otra vez" onClick={() => hablar(ronda.instruccion)} className="grid size-20 place-items-center border-nino-ok bg-nino-menta">
          <Icono nombre="altavoz" className="size-10" />
        </BotonNino>
        <span className="flex-1" />
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
      <RondaActual
        key={estado.indice}
        ronda={ronda}
        resuelta={estado.resuelta}
        revelar={!estado.resuelta && estado.intentos >= 2}
        alIntentar={intentar}
      />
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
    <main className="mx-auto grid min-h-[70dvh] max-w-3xl content-center justify-items-center gap-10 px-6 py-8 text-center">
      <div className="relative grid place-items-center">
        <span aria-hidden="true" className="premio-brillo absolute size-[7em] rounded-full" />
        <span aria-hidden="true" className="premio-moneda relative text-[5em] leading-none">🪙</span>
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
