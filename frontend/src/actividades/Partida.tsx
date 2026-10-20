import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Ronda } from '../contenido/actividades.ts'
import { guardarResultadoConRespaldo } from '../datos/pendientes.ts'
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

interface Registro {
  item: string
  intentos: number
  estrellas: number
  monedas: number
  // Parte de `monedas` que viene del bono de racha.
  bono: number
}

export function Partida({ actividadId, rondas, alReiniciar }: { actividadId: string; rondas: Ronda[]; alReiniciar: () => void }) {
  const { silenciado } = useNino()
  const [estado, setEstado] = useState({ indice: 0, intentos: 0, resuelta: false })
  const [registro, setRegistro] = useState<Registro[]>([])
  const [racha, setRacha] = useState(0)
  const [inicio] = useState(() => Date.now())

  const ronda = rondas[estado.indice]

  useEffect(() => {
    if (ronda) hablar(ronda.instruccion)
  }, [ronda])

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
    const p = PUNTAJE[Math.min(intentos, 3) - 1]
    const nuevaRacha = intentos === 1 ? racha + 1 : 0
    setRacha(nuevaRacha)
    const bono = nuevaRacha >= 3 ? BONO_RACHA : 0
    setRegistro((r) => [...r, { item: ronda.item, intentos, estrellas: p.estrellas, monedas: p.monedas + bono, bono }])
    setEstado({ ...estado, intentos, resuelta: true })
    efecto('acierto', silenciado)
    const desde = estado.indice
    hablar(ronda.refuerzo, { alTerminar: () => window.setTimeout(() => avanzar(desde), 500) })
    // Respaldo por si el audio no avisa que terminó.
    window.setTimeout(() => avanzar(desde), 6000)
  }

  if (!ronda) {
    return <Podio actividadId={actividadId} registro={registro} inicio={inicio} alReiniciar={alReiniciar} />
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-6 flex items-center gap-4">
        <VolverPartida />
        <SalirPartida />
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

// Retroceder a la pantalla anterior (la lista de actividades del grupo).
function VolverPartida() {
  const navegar = useNavigate()
  return (
    <BotonNino voz="Volver atrás" onClick={() => navegar(-1)} className="grid size-20 place-items-center bg-nino-lila">
      <Icono nombre="izquierda" className="size-9" />
    </BotonNino>
  )
}

function SalirPartida() {
  const { estudiante } = useNino()
  const navegar = useNavigate()
  return (
    <BotonNino voz="Salir" onClick={() => navegar(`/aula/${estudiante.id}`)} className="grid size-20 place-items-center">
      <Icono nombre="casa" className="size-9" />
    </BotonNino>
  )
}

const AYUDA = [
  { icono: '🌟', texto: 'Sin ayuda' },
  { icono: '💡', texto: 'Con pista' },
  { icono: '👀', texto: 'Con ayuda' },
]

const minutosYSegundos = (ms: number) => {
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function Podio({ actividadId, registro, inicio, alReiniciar }: { actividadId: string; registro: Registro[]; inicio: number; alReiniciar: () => void }) {
  const { estudiante, silenciado, recargar } = useNino()
  const navegar = useNavigate()
  const guardado = useRef(false)
  const [duracionMs] = useState(() => Date.now() - inicio)
  const promedio = registro.reduce((s, r) => s + r.estrellas, 0) / Math.max(1, registro.length)
  const estrellas = promedio >= 2.5 ? 3 : promedio >= 1.75 ? 2 : 1
  const monedas = registro.reduce((s, r) => s + r.monedas, 0)
  const bono = registro.reduce((s, r) => s + r.bono, 0)
  const alPrimero = registro.filter((r) => r.intentos === 1).length
  const mejorRacha = registro.reduce(
    (m, r) => {
      const actual = r.intentos === 1 ? m.actual + 1 : 0
      return { actual, mejor: Math.max(m.mejor, actual) }
    },
    { actual: 0, mejor: 0 },
  ).mejor

  useEffect(() => {
    if (guardado.current) return
    guardado.current = true
    efecto('premio', silenciado)
    hablar(
      estrellas === 3
        ? `¡Increíble! Ganaste tres estrellas y ${monedas} monedas.`
        : `¡Muy bien! Acertaste ${alPrimero} sin ayuda y ganaste ${monedas} monedas. ¿Juegas otra vez para ganar más?`,
    )
    // RF-12: se guarda fecha, intentos por ronda y tiempo empleado. El id se
    // genera una sola vez para que los reintentos no dupliquen el resultado.
    void guardarResultadoConRespaldo({
      id: crypto.randomUUID(),
      estudianteId: estudiante.id,
      actividadId,
      fecha: new Date().toISOString(),
      duracionMs,
      rondas: registro.map((r) => ({ item: r.item, intentos: r.intentos, acertada: r.intentos < 3 })),
      estrellas,
      monedas,
    }).then(recargar)
  }, [actividadId, duracionMs, estrellas, estudiante.id, monedas, alPrimero, recargar, registro, silenciado])

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 text-center">
      <p className="mb-4 flex justify-center gap-3 text-[3em] leading-none" aria-label={`${estrellas} de 3 estrellas`}>
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= estrellas ? 'animate-pop' : 'opacity-25 grayscale'} style={{ animationDelay: `${n * 120}ms` }} aria-hidden="true">⭐</span>
        ))}
      </p>
      <p className="mx-auto mb-6 inline-flex items-center gap-3 rounded-full border-3 border-[#e6c84d] bg-nino-amarillo px-8 py-3 text-[1.3em] font-bold" aria-label={`Ganaste ${monedas} monedas`}>
        <span aria-hidden="true">🪙</span> +{monedas}
      </p>

      <ul className="mb-6 grid grid-cols-3 gap-4 font-sans text-base" aria-label="Resumen">
        <Dato icono="🌟" valor={`${alPrimero}/${registro.length}`} texto="sin ayuda" />
        <Dato icono="🔥" valor={String(mejorRacha)} texto="mejor racha" />
        <Dato icono="⏱️" valor={minutosYSegundos(duracionMs)} texto="tiempo" />
      </ul>

      <ol className="mb-8 grid gap-3" aria-label="Cómo te fue en cada ronda">
        {registro.map((r, i) => {
          const ayuda = AYUDA[Math.min(r.intentos, 3) - 1]
          return (
            <li key={i} className="flex items-center gap-4 rounded-2xl border-3 border-nino-azul bg-white px-5 py-2 text-left">
              <span className="min-w-[2.5em] text-[1.3em] font-bold">{r.item}</span>
              <span className="flex-1 font-sans text-base text-tinta-suave">
                <span aria-hidden="true">{ayuda.icono}</span> {ayuda.texto}
              </span>
              <span aria-label={`${r.estrellas} de 3 estrellas`} className="text-[0.8em]">
                {'⭐'.repeat(r.estrellas)}
                <span className="opacity-25 grayscale">{'⭐'.repeat(3 - r.estrellas)}</span>
              </span>
              <span className="min-w-[3.2em] rounded-full bg-nino-amarillo px-3 py-0.5 text-center font-sans text-base font-bold">+{r.monedas}</span>
            </li>
          )
        })}
      </ol>
      {bono > 0 && (
        <p className="-mt-4 mb-8 font-sans text-base text-tinta-suave">
          Incluye <b>+{bono}</b> de bono por racha 🔥
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-6">
        <BotonNino voz="Volver" onClick={() => navegar(-1)} className="grid size-28 place-items-center">
          <Icono nombre="izquierda" className="size-12" />
        </BotonNino>
        <BotonNino voz="Ir a mi inicio" onClick={() => navegar(`/aula/${estudiante.id}`)} className="grid size-28 place-items-center bg-nino-menta">
          <Icono nombre="casa" className="size-12" />
        </BotonNino>
        <BotonNino
          voz="¡Jugar otra vez para ganar más!"
          onClick={alReiniciar}
          className={`grid h-28 place-items-center px-10 ${estrellas < 3 ? 'animate-pop border-[#e6c84d] bg-nino-amarillo' : ''}`}
        >
          <span aria-hidden="true" className="text-[1.6em]">🔁</span>
        </BotonNino>
      </div>
    </main>
  )
}

function Dato({ icono, valor, texto }: { icono: string; valor: string; texto: string }) {
  return (
    <li className="rounded-2xl border-3 border-nino-azul bg-white px-3 py-3">
      <span aria-hidden="true" className="block text-[1.6em] leading-none">{icono}</span>
      <b className="block text-[1.3em]">{valor}</b>
      <span className="text-tinta-suave">{texto}</span>
    </li>
  )
}
