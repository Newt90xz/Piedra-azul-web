import { useEffect, useRef, useState } from 'react'
import { ESTACIONES, estacionDe } from '../contenido/estaciones.ts'
import type { Tematica } from '../dominio/tipos.ts'
import { efecto } from '../lib/audio.ts'

// Fondos vivos para la vista del niño. Pocos personajes y lentos (RNF-08, bajo
// estímulo), siempre a los costados para no competir con la actividad. Tocar uno
// lo hace rebotar. Con «reducir animaciones» no se dibujan.

export const PERSONAJES: Record<Exclude<Tematica, 'estaciones'>, string[]> = {
  animales: ['🦊', '🐰', '🐻', '🐼', '🦉', '🐸'],
  dinosaurios: ['🦖', '🦕', '🥚', '🌿', '🦴', '🌋'],
  futbol: ['⚽', '🥅', '🏆', '👟', '🎽', '🏟️'],
  oceano: ['🐠', '🐙', '🐳', '🐚', '⭐', '🦀'],
  vehiculos: ['🚒', '🚓', '🚌', '🚜', '✈️', '🚀'],
  piratas: ['🦜', '⚓', '💎', '🗺️', '🧭', '🏴‍☠️'],
}

// Con «Estaciones del año», los de la estación de hoy.
const personajesDe = (tematica: Tematica) => (tematica === 'estaciones' ? ESTACIONES[estacionDe()].personajes : PERSONAJES[tematica])

// Posición, tamaño y ritmo fijos: el fondo no cambia entre recargas.
const SITIOS = [
  { izq: '3%', tam: 3.2, dur: 38, ret: 0 },
  { izq: '90%', tam: 3.6, dur: 44, ret: 6 },
  { izq: '8%', tam: 2.6, dur: 52, ret: 18 },
  { izq: '84%', tam: 2.8, dur: 41, ret: 24 },
  { izq: '1%', tam: 3.4, dur: 47, ret: 31 },
  { izq: '93%', tam: 2.6, dur: 56, ret: 12 },
]

export function FondoNino({ tematica, silenciado = false }: { tematica: Tematica; silenciado?: boolean }) {
  const personajes = personajesDe(tematica)
  const estacion = tematica === 'estaciones' ? ESTACIONES[estacionDe()] : null
  const [saltando, setSaltando] = useState<number | null>(null)

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {estacion && (
        // Cielo y pasto teñidos de la estación, sobre el fondo de siempre.
        <span
          className="absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(130% 22% at 50% 100%, ${estacion.suelo} 0 60%, transparent 61%), linear-gradient(180deg, ${estacion.cielo} 0%, transparent 70%)`,
          }}
        />
      )}
      <span className="nube" style={{ top: '14%', left: '-10rem', animationDuration: '90s' }} />
      <span className="nube" style={{ top: '38%', left: '-10rem', animationDuration: '130s', animationDelay: '-50s', scale: '0.7' }} />
      {SITIOS.map((s, i) => (
        <button
          key={i}
          tabIndex={-1}
          // Hojas y nieve caen desde arriba; lo demás sube desde abajo.
          className={`${estacion?.caen ? 'cae -top-16' : 'flota top-full'} pointer-events-auto absolute leading-none select-none`}
          style={{ left: s.izq, fontSize: `${s.tam}rem`, animationDuration: `${s.dur}s`, animationDelay: `-${s.ret}s` }}
          onPointerDown={() => {
            setSaltando(i)
            efecto('toque', silenciado)
          }}
        >
          <span key={saltando === i ? 'rebota' : 'quieto'} className={`block ${saltando === i ? 'animate-pop' : 'balanceo'}`}>
            {personajes[i % personajes.length]}
          </span>
        </button>
      ))}
    </div>
  )
}

// Protector de pantalla: tras un rato sin tocar, los personajes bailan en toda
// la pantalla. Cualquier toque lo cierra sin activar lo que hay debajo.
export function ProtectorPantalla({ tematica, esperaMs = 90_000 }: { tematica: Tematica; esperaMs?: number }) {
  const [activo, setActivo] = useState(false)
  const temporizador = useRef<number | undefined>(undefined)

  useEffect(() => {
    const reiniciar = () => {
      window.clearTimeout(temporizador.current)
      temporizador.current = window.setTimeout(() => setActivo(true), esperaMs)
    }
    reiniciar()
    const eventos = ['pointerdown', 'pointermove', 'keydown'] as const
    // Mientras está activo, el toque lo cierra el propio velo; aquí solo se reinicia la espera.
    const alMover = () => !activo && reiniciar()
    eventos.forEach((e) => window.addEventListener(e, alMover))
    return () => {
      window.clearTimeout(temporizador.current)
      eventos.forEach((e) => window.removeEventListener(e, alMover))
    }
  }, [esperaMs, activo])

  if (!activo) return null
  const personajes = personajesDe(tematica)
  return (
    <button
      aria-label="Toca para seguir jugando"
      onClick={() => setActivo(false)}
      className="protector fixed inset-0 z-50 cursor-pointer overflow-hidden"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className="rebote absolute leading-none"
          style={{
            left: `${6 + ((i * 37) % 80)}%`,
            top: `${8 + ((i * 53) % 70)}%`,
            fontSize: `${4 + (i % 3) * 1.6}rem`,
            animationDuration: `${5 + (i % 4)}s`,
            animationDelay: `-${i}s`,
          }}
        >
          {personajes[i % personajes.length]}
        </span>
      ))}
      <span className="absolute inset-x-0 bottom-[12%] text-center text-[1.2em] font-bold text-white drop-shadow-lg">👆 Toca para jugar</span>
    </button>
  )
}
