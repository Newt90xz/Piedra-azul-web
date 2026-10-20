import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Emocion as TipoEmocion } from '../../dominio/tipos.ts'
import { EMOCIONES } from '../../lib/avance.ts'
import { hablar } from '../../lib/audio.ts'
import { BotonNino, useNino } from '../../ui/nino.tsx'

// RF-14: chequeo emocional con 1 clic al iniciar la sesión.
export default function Emocion() {
  const { estudiante, cambiarEmocion } = useNino()
  const navegar = useNavigate()

  useEffect(() => hablar(`Hola ${estudiante.nombre}. ¿Cómo te sientes hoy?`), [estudiante.nombre])

  const elegir = async (e: TipoEmocion) => {
    await cambiarEmocion(e)
    navegar(`/aula/${estudiante.id}`, { replace: true })
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-center">
      <h1 className="mb-10 text-[1.3em] font-bold">¿Cómo te sientes hoy?</h1>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {(Object.keys(EMOCIONES) as TipoEmocion[]).map((e) => (
          <BotonNino
            key={e}
            voz={EMOCIONES[e].texto}
            onClick={() => elegir(e)}
            className="flex flex-col items-center gap-3 border-transparent py-8"
            style={{ background: EMOCIONES[e].color }}
          >
            <span aria-hidden="true" className="text-[3.2em] leading-none">{EMOCIONES[e].cara}</span>
            <span className="text-[0.8em] font-bold">{EMOCIONES[e].texto}</span>
          </BotonNino>
        ))}
      </div>
    </main>
  )
}
