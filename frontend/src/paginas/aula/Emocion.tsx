import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Emocion as TipoEmocion } from '../../dominio/tipos.ts'
import { EMOCIONES } from '../../lib/avance.ts'
import { hablar } from '../../lib/audio.ts'
import { BotonNino, useNino } from '../../ui/nino.tsx'

// RF-14: chequeo emocional con 1 clic al abrir el perfil. Es la primera pantalla
// después del saludo; hasta elegir, el inicio vuelve aquí.
export default function Emocion() {
  const { estudiante, cambiarEmocion } = useNino()
  const navegar = useNavigate()

  useEffect(() => hablar('¿Cómo te sientes hoy?'), [])

  const elegir = async (e: TipoEmocion) => {
    await cambiarEmocion(e)
    navegar(`/aula/${estudiante.id}`, { replace: true })
  }

  return (
    <main className="animate-pantalla mx-auto grid h-full max-w-4xl content-center px-6 py-6 text-center">
      <h1 className="mb-8 text-[1.3em] font-bold">¿Cómo te sientes hoy?</h1>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {(Object.keys(EMOCIONES) as TipoEmocion[]).map((e, i) => (
          <BotonNino
            key={e}
            voz={EMOCIONES[e].texto}
            onClick={() => elegir(e)}
            className="caja-entra flex flex-col items-center gap-3 border-transparent py-8"
            style={{ background: EMOCIONES[e].color, animationDelay: `${150 + i * 110}ms` }}
          >
            <span aria-hidden="true" className="text-[3.2em] leading-none">{EMOCIONES[e].cara}</span>
            <span className="text-[0.8em] font-bold">{EMOCIONES[e].texto}</span>
          </BotonNino>
        ))}
      </div>
    </main>
  )
}
