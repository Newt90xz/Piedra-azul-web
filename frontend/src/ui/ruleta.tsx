import { useEffect, useState } from 'react'
import type { Emocion } from '../dominio/tipos.ts'
import { EMOCIONES } from '../lib/avance.ts'
import { hablar } from '../lib/audio.ts'
import { useVozAlApuntar } from './voz.ts'

// Ruleta de emociones en la barra del niño: se puede cambiar cómo se siente
// en cualquier momento de la sesión (cada cambio queda registrado).

const ORDEN: Emocion[] = ['alegria', 'calma', 'tristeza', 'enojo']
// Cada gajo ocupa un cuarto de la rueda, con la esquina redondeada hacia afuera.
const GAJOS: Record<Emocion, string> = {
  alegria: 'rounded-tl-full',
  calma: 'rounded-tr-full',
  tristeza: 'rounded-bl-full',
  enojo: 'rounded-br-full',
}

export function RuletaEmociones({ actual, alElegir }: { actual: Emocion | null; alElegir: (e: Emocion) => void }) {
  const [abierta, setAbierta] = useState(false)
  const boton = useVozAlApuntar('¿Cómo te sientes?')

  useEffect(() => {
    if (!abierta) return
    hablar('¿Cómo te sientes?')
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setAbierta(false)
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierta])

  return (
    <div className="relative">
      <button
        {...boton}
        onClick={() => setAbierta(!abierta)}
        aria-expanded={abierta}
        aria-label="¿Cómo te sientes? Cambiar emoción"
        className="tarjeta-nino grid size-16 place-items-center rounded-2xl border-3 border-nino-azul text-[1.7em] leading-none transition-transform hover:-translate-y-1"
        style={{ background: actual ? EMOCIONES[actual].color : '#fff' }}
      >
        <span aria-hidden="true">{actual ? EMOCIONES[actual].cara : '🎡'}</span>
      </button>
      {abierta && (
        <>
          <button aria-label="Cerrar la ruleta" className="fixed inset-0 z-30 cursor-default" onClick={() => setAbierta(false)} />
          <div role="menu" className="ruleta absolute top-full right-0 z-40 mt-4 size-64 animate-pop overflow-hidden rounded-full bg-white">
            <div className="grid size-full grid-cols-2 grid-rows-2">
              {ORDEN.map((e) => (
                <Gajo
                  key={e}
                  emocion={e}
                  elegida={actual === e}
                  alElegir={() => {
                    alElegir(e)
                    setAbierta(false)
                  }}
                />
              ))}
            </div>
            <span aria-hidden="true" className="absolute top-1/2 left-1/2 grid size-14 -translate-1/2 place-items-center rounded-full border-4 border-white bg-nino-amarillo text-2xl">
              🎡
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function Gajo({ emocion, elegida, alElegir }: { emocion: Emocion; elegida: boolean; alElegir: () => void }) {
  const voz = useVozAlApuntar(EMOCIONES[emocion].texto)
  return (
    <button
      {...voz}
      role="menuitemradio"
      aria-checked={elegida}
      aria-label={EMOCIONES[emocion].texto}
      onClick={alElegir}
      className={`grid place-items-center border-2 border-white text-[2.4em] leading-none transition-transform hover:scale-105 ${GAJOS[emocion]} ${elegida ? 'ring-4 ring-nino-tinta ring-inset' : ''}`}
      style={{ background: EMOCIONES[emocion].color }}
    >
      <span aria-hidden="true">{EMOCIONES[emocion].cara}</span>
    </button>
  )
}
