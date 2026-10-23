import { useEffect, useState } from 'react'
import { AVATARES_TIENDA, faltanMonedas, type AvatarTienda } from '../../contenido/tienda.ts'
import { repo } from '../../datos/index.ts'
import { efecto, hablar } from '../../lib/audio.ts'
import { detenerMusica, iniciarMusica } from '../../lib/musica.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { Icono } from '../../ui/Icono.tsx'
import { BotonNino, useNino } from '../../ui/nino.tsx'
import { MiniJuego } from '../alumno/MiniJuego.tsx'

// Sala de espera: el niño todavía no tiene sala. Juega con los globos o gasta
// sus monedas en la tienda mientras suena una música suave; la sala reemplaza
// esta vista sola en cuanto la docente lo asigna (y la música se apaga).
export default function Espera() {
  const [vista, setVista] = useState<'globos' | 'tienda'>('globos')
  const { silenciado } = useNino()
  const [musica, setMusica] = useState(musicaGuardada)

  // Si la docente silenció los efectos del niño, tampoco hay música.
  const suena = musica && !silenciado
  useEffect(() => {
    if (!suena) return
    iniciarMusica()
    return detenerMusica
  }, [suena])

  const alternarMusica = () => {
    setMusica(!musica)
    try {
      sessionStorage.setItem(CLAVE_MUSICA, musica ? 'no' : 'si')
    } catch {
      // Sin almacenamiento, al volver a la espera la música parte encendida.
    }
  }

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Sala de espera" className="mx-auto flex max-w-5xl shrink-0 justify-center gap-6 px-6 pt-4">
        <Pestana activa={vista === 'globos'} voz="Globos" icono="🎈" alTocar={() => setVista('globos')} />
        <Pestana activa={vista === 'tienda'} voz="Tienda de avatares" icono="🛍️" alTocar={() => setVista('tienda')} />
        {!silenciado && (
          <BotonNino
            voz={musica ? 'Apagar la música' : 'Poner música'}
            aria-pressed={musica}
            onClick={alternarMusica}
            className={`centro-emoji relative size-16 text-[1.4em] ${musica ? 'bg-nino-lila' : 'opacity-70'}`}
          >
            <span aria-hidden="true">🎵</span>
            {!musica && (
              <span aria-hidden="true" className="absolute inset-x-2 top-1/2 h-1 -rotate-45 rounded-full bg-nino-tinta/70" />
            )}
          </BotonNino>
        )}
      </nav>
      <div key={vista} className="animate-pantalla min-h-0 flex-1">
        {vista === 'globos' ? <MiniJuego /> : <Tienda />}
      </div>
    </div>
  )
}

const CLAVE_MUSICA = 'leer-para-todos/musica-espera'

function musicaGuardada() {
  try {
    return sessionStorage.getItem(CLAVE_MUSICA) !== 'no'
  } catch {
    return true
  }
}

function Pestana({ activa, voz, icono, alTocar }: { activa: boolean; voz: string; icono: string; alTocar: () => void }) {
  return (
    <BotonNino
      voz={voz}
      aria-pressed={activa}
      onClick={alTocar}
      className={`centro-emoji h-16 w-28 text-[1.6em] ${activa ? 'bg-nino-amarillo' : 'opacity-70'}`}
    >
      <span aria-hidden="true">{icono}</span>
    </BotonNino>
  )
}

// RF-24: avatares que se compran con las monedas ganadas. El precio se ve como
// un número junto a la moneda; si no alcanza, el avatar aparece con candado.
function Tienda() {
  const { estudiante, estado, silenciado, recargar } = useNino()
  const [eligiendo, setEligiendo] = useState<AvatarTienda | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const comprados = estado.avataresComprados

  useEffect(() => hablar('¡La tienda! Toca un avatar para ponértelo.'), [])

  const usar = async (avatarId: string | null) => {
    setOcupado(true)
    try {
      await repo.usarAvatar(avatarId)
      efecto('toque', silenciado)
      hablar('¡Listo!')
    } catch {
      hablar('No se pudo cambiar. Intenta otra vez.')
    }
    setOcupado(false)
    recargar()
  }

  const tocar = (a: AvatarTienda) => {
    if (comprados.includes(a.id)) return void usar(a.id)
    if (estudiante.monedas < a.precio) {
      hablar(faltanMonedas(a.precio - estudiante.monedas))
      return
    }
    setEligiendo(a)
    hablar(`¿Quieres el ${a.nombre}? Cuesta ${a.precio} monedas.`)
  }

  const comprar = async (a: AvatarTienda) => {
    setOcupado(true)
    try {
      await repo.comprarAvatar(a.id)
      efecto('premio', silenciado)
      hablar(`¡Ahora eres un ${a.nombre}!`)
    } catch (e) {
      hablar((e as Error).message === 'monedas_insuficientes' ? '¡Te faltan monedas!' : 'No se pudo comprar. Intenta otra vez.')
    }
    setEligiendo(null)
    setOcupado(false)
    recargar()
  }

  return (
    <main className="mx-auto grid h-full max-w-6xl content-center px-6 py-4">
      <ul className="grid grid-cols-3 gap-x-5 gap-y-3 sm:grid-cols-4 lg:grid-cols-5">
        <li className="caja-entra">
          {/* El avatar que eligió la docente: siempre gratis. */}
          <BotonNino
            voz="Mi avatar de siempre"
            disabled={ocupado}
            onClick={() => void usar(null)}
            className={`grid w-full justify-items-center gap-2 p-3 ${!estudiante.avatarTienda ? 'bg-nino-menta ring-4 ring-nino-ok ring-offset-4' : ''}`}
          >
            <Avatar estudiante={{ ...estudiante, avatarTienda: undefined }} className="size-20 text-5xl" />
            <span aria-hidden="true" className="text-[1.2em]">{!estudiante.avatarTienda ? '✅' : '🏠'}</span>
          </BotonNino>
        </li>
        {AVATARES_TIENDA.map((a, i) => {
          const tiene = comprados.includes(a.id)
          const puesto = estudiante.avatarTienda === a.id
          const alcanza = estudiante.monedas >= a.precio
          return (
            <li key={a.id} className="caja-entra" style={{ animationDelay: `${(i + 1) * 60}ms` }}>
              <BotonNino
                voz={tiene ? a.nombre : `${a.nombre}, ${a.precio} monedas`}
                disabled={ocupado}
                onClick={() => tocar(a)}
                className={`relative grid w-full justify-items-center gap-2 p-3 ${puesto ? 'bg-nino-menta ring-4 ring-nino-ok ring-offset-4' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className={`grid size-20 place-items-center rounded-[30%] text-5xl ${!tiene && !alcanza ? 'opacity-40 grayscale' : ''}`}
                  style={{ background: estudiante.color }}
                >
                  {a.emoji}
                </span>
                {tiene ? (
                  <span aria-hidden="true" className="text-[1.2em]">{puesto ? '✅' : '👆'}</span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full border-3 border-[#e6c84d] bg-nino-amarillo px-3 py-0.5 text-[0.9em] font-bold">
                    <span aria-hidden="true">🪙</span> {a.precio}
                  </span>
                )}
                {!tiene && !alcanza && (
                  <span aria-hidden="true" className="absolute top-3 right-3 text-[1.1em]">🔒</span>
                )}
              </BotonNino>
            </li>
          )
        })}
      </ul>

      {eligiendo && (
        <div role="dialog" aria-modal="true" aria-label={`Comprar ${eligiendo.nombre}`} className="fixed inset-0 z-40 grid place-items-center bg-nino-tinta/40 px-6">
          <div className="tarjeta-nino animate-pop grid justify-items-center gap-6 rounded-[2rem] border-3 border-nino-azul bg-white px-10 py-8">
            <span aria-hidden="true" className="grid size-36 place-items-center rounded-[30%] text-8xl" style={{ background: estudiante.color }}>
              {eligiendo.emoji}
            </span>
            <span className="flex items-center gap-2 rounded-full border-3 border-[#e6c84d] bg-nino-amarillo px-5 py-1 text-[1.1em] font-bold">
              <span aria-hidden="true">🪙</span> {eligiendo.precio}
            </span>
            <div className="flex gap-6">
              <BotonNino voz="No, gracias" disabled={ocupado} onClick={() => setEligiendo(null)} className="grid size-24 place-items-center bg-[#f6d1d1]">
                <span aria-hidden="true" className="text-[1.6em]">✖️</span>
              </BotonNino>
              <BotonNino voz="¡Sí, comprar!" disabled={ocupado} onClick={() => void comprar(eligiendo)} className="grid size-24 place-items-center border-nino-ok bg-nino-menta">
                <Icono nombre="check" className="size-12" />
              </BotonNino>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
