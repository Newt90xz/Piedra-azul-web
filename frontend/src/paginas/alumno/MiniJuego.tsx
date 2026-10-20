import { useEffect, useRef, useState } from 'react'
import { efecto, hablar } from '../../lib/audio.ts'
import { PERSONAJES } from '../../ui/fondoNino.tsx'

// Minijuego de espera: globos con animalitos suben y el niño los revienta
// tocándolos. Sin lectura ni fallos posibles; solo suma estrellas. Con
// movimiento reducido los globos quedan quietos y reaparecen en otro lugar.

const COLORES = ['#ffe58a', '#bfe8d2', '#bcd8f5', '#f6c6d8', '#e4dcf7', '#fde2c8']
const MAX_GLOBOS = 6
const CADA_MS = 1300

interface Globo {
  id: number
  izq: number
  arriba: number
  personaje: string
  color: string
  duracion: number
  reventado: boolean
}

let siguienteId = 0
const azar = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

function nuevoGlobo(): Globo {
  return {
    id: siguienteId++,
    izq: 5 + Math.random() * 80,
    arriba: 10 + Math.random() * 65,
    personaje: azar(PERSONAJES.animales),
    color: azar(COLORES),
    duracion: 7 + Math.random() * 4,
    reventado: false,
  }
}

const sinMovimiento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export function MiniJuego() {
  const [quieto] = useState(sinMovimiento)
  const [globos, setGlobos] = useState<Globo[]>(() => (quieto ? Array.from({ length: 4 }, nuevoGlobo) : []))
  const [puntos, setPuntos] = useState(0)
  const anunciado = useRef(0)

  useEffect(() => hablar('Mientras esperas a tu profe, ¡revienta los globos!'), [])

  // Van saliendo globos de abajo, sin pasar de unos pocos a la vez.
  useEffect(() => {
    if (quieto) return
    const t = window.setInterval(() => setGlobos((g) => (g.length < MAX_GLOBOS ? [...g, nuevoGlobo()] : g)), CADA_MS)
    return () => window.clearInterval(t)
  }, [quieto])

  // Cada 10 globos, un refuerzo hablado.
  useEffect(() => {
    if (puntos > 0 && puntos % 10 === 0 && anunciado.current !== puntos) {
      anunciado.current = puntos
      hablar(`¡Muy bien! ¡${puntos} globos!`)
    }
  }, [puntos])

  const quitar = (id: number) => setGlobos((g) => g.filter((x) => x.id !== id))

  const reventar = (id: number) => {
    efecto('acierto', false)
    setPuntos((p) => p + 1)
    setGlobos((g) => g.map((x) => (x.id === id ? { ...x, reventado: true } : x)))
    window.setTimeout(() => {
      // Quieto: el globo reventado reaparece en otro lugar.
      setGlobos((g) => (quieto ? g.map((x) => (x.id === id ? nuevoGlobo() : x)) : g.filter((x) => x.id !== id)))
    }, 350)
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pt-6 pb-4">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-4 text-center">
        <p className="flex items-center gap-2 font-sans text-base font-semibold text-tinta-suave">
          <span aria-hidden="true" className="animate-bounce text-2xl">⏳</span>
          Esperando a tu profe…
        </p>
        <p
          aria-live="polite"
          aria-label={`${puntos} globos`}
          className="flex items-center gap-2 rounded-full border-3 border-[#e6c84d] bg-nino-amarillo px-5 py-1 text-[1em] font-bold"
        >
          <span aria-hidden="true">⭐</span> {puntos}
        </p>
      </div>
      <div className="minijuego relative h-[62dvh] overflow-hidden rounded-[2rem] border-3 border-nino-azul bg-white/50">
        {globos.map((g) => (
          <button
            key={g.id}
            aria-label="Globo"
            disabled={g.reventado}
            onPointerDown={() => !g.reventado && reventar(g.id)}
            onAnimationEnd={(e) => e.animationName === 'elevar' && quitar(g.id)}
            className={`globo absolute grid size-24 place-items-center rounded-full text-[2.2em] leading-none select-none ${quieto ? '' : 'elevando'}`}
            style={{
              left: `${g.izq}%`,
              top: quieto ? `${g.arriba}%` : '100%',
              background: g.color,
              animationDuration: quieto ? undefined : `${g.duracion}s`,
            }}
          >
            <span aria-hidden="true" className={g.reventado ? 'animate-pop' : ''}>
              {g.reventado ? '💥' : g.personaje}
            </span>
            {!g.reventado && <span aria-hidden="true" className="hilo" />}
          </button>
        ))}
      </div>
    </main>
  )
}
