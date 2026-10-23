import { useEffect, useRef } from 'react'
import { PICTOS_MENSAJE, pictoMensaje, type PictoMensaje } from '../../contenido/mensajes.ts'
import { repo } from '../../datos/index.ts'
import type { MensajeSala } from '../../dominio/tipos.ts'
import { efecto, hablar } from '../../lib/audio.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { BotonNino, useNino, useVozAlApuntar } from '../../ui/nino.tsx'

// Playground: espacio común para quienes ya terminaron, mientras la docente los
// asigna a otra sala. Se conversa solo con pictogramas predefinidos que suenan
// al tocarlos: nada que leer ni escribir, y nada que moderar.

const REFRESCO_MS = 2000

export default function Playground() {
  const { estudiante, silenciado } = useNino()
  const { datos: mensajes, recargar } = useConsulta(() => repo.mensajesPlayground(), [])
  const final = useRef<HTMLLIElement>(null)
  const ultimoId = mensajes?.[0]?.id

  useEffect(() => hablar('¡Llegaste al patio! Toca un dibujo para saludar a tus amigos.'), [])
  useEffect(() => {
    const t = window.setInterval(recargar, REFRESCO_MS)
    return () => window.clearInterval(t)
  })
  // Al llegar un mensaje nuevo, se ve el último. (scrollIntoView puede devolver
  // una promesa: no se retorna, React la tomaría por la función de limpieza.)
  useEffect(() => {
    final.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [ultimoId])

  const enviar = async (p: PictoMensaje) => {
    hablar(p.voz)
    efecto('toque', silenciado)
    await repo.enviarMensaje(p.id).catch(() => {})
    recargar()
  }

  // La base los entrega del más nuevo al más viejo; en pantalla, como un chat.
  const enOrden = [...(mensajes ?? [])].reverse()

  return (
    <main className="mx-auto flex h-full max-w-4xl flex-col gap-5 px-6 py-5">
      {/* El chat se desplaza dentro de su caja; la página queda fija. */}
      <ol aria-label="Mensajes" aria-live="polite" className="grid min-h-40 flex-1 content-start gap-3 overflow-y-auto rounded-[2rem] border-3 border-nino-azul bg-white/60 p-5">
        {enOrden.length === 0 && (
          <li className="grid h-full place-items-center text-[3em] opacity-40" aria-label="Aún no hay mensajes">
            <span aria-hidden="true">💬</span>
          </li>
        )}
        {enOrden.map((m) => (
          <Burbuja key={m.id} mensaje={m} mio={m.estudianteId === estudiante.id} />
        ))}
        <li ref={final} aria-hidden="true" />
      </ol>
      <div className="grid shrink-0 grid-cols-4 gap-4 sm:grid-cols-8" role="group" aria-label="Enviar un mensaje">
        {PICTOS_MENSAJE.map((p) => (
          <BotonNino key={p.id} voz={p.voz} onClick={() => void enviar(p)} className="grid aspect-square place-items-center text-[1.8em]">
            <span aria-hidden="true">{p.emoji}</span>
          </BotonNino>
        ))}
      </div>
    </main>
  )
}

function Burbuja({ mensaje, mio }: { mensaje: MensajeSala; mio: boolean }) {
  const picto = pictoMensaje(mensaje.picto)
  const dicho = `${mensaje.nombre} dice: ${picto?.voz ?? ''}`
  const voz = useVozAlApuntar(dicho)
  return (
    <li className={`animate-aparecer flex items-end gap-3 ${mio ? 'flex-row-reverse' : ''}`}>
      <Avatar estudiante={mensaje} className="size-14 text-4xl" />
      <button
        {...voz}
        onClick={() => hablar(dicho, { respaldo: picto?.voz })}
        aria-label={dicho}
        className={`rounded-3xl border-3 px-5 py-2 text-[1.8em] leading-none ${mio ? 'rounded-br-md border-nino-ok bg-nino-menta' : 'rounded-bl-md border-nino-azul bg-white'}`}
      >
        <span aria-hidden="true">{picto?.emoji ?? '❔'}</span>
      </button>
    </li>
  )
}
