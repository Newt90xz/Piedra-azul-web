import { useEffect, useState } from 'react'
import { SALUDO_ESPERA, SALUDO_RECREO_GLOBOS } from '../../contenido/frases.ts'
import { detenerMusica, iniciarMusica } from '../../lib/musica.ts'
import { BotonNino, useNino } from '../../ui/nino.tsx'
import { MiniJuego } from '../alumno/MiniJuego.tsx'
import { Tienda } from './Tienda.tsx'

// Globos, tienda y música suave. Sin sala, el niño espera aquí a que la docente
// lo asigne (la sala reemplaza esta vista sola y la música se apaga); con
// `recreo`, es la actividad «Globos» de una sala de recreo.
export default function Espera({ recreo = false }: { recreo?: boolean }) {
  const [vista, setVista] = useState<'globos' | 'tienda'>('globos')
  const { silenciado, fijarTitulo } = useNino()

  // «RECREO» va al centro de la barra superior mientras el niño está aquí.
  useEffect(() => {
    fijarTitulo(
      <>
        <span aria-hidden="true">🎠</span> RECREO
      </>,
    )
    return () => fijarTitulo(null)
  }, [fijarTitulo])
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
      <nav aria-label="Recreo" className="mx-auto flex max-w-5xl shrink-0 flex-wrap items-center justify-center gap-6 px-6 pt-4">
        <Pestana activa={vista === 'globos'} voz="Globos" icono="🎈" palabra="GLOBOS" alTocar={() => setVista('globos')} />
        <Pestana activa={vista === 'tienda'} voz="Tienda" icono="🛍️" palabra="TIENDA" alTocar={() => setVista('tienda')} />
        {!silenciado && (
          <BotonNino
            voz={musica ? 'Apagar la música' : 'Poner música'}
            aria-pressed={musica}
            onClick={alternarMusica}
            className={`grid h-20 w-28 place-content-center justify-items-center gap-1 text-[1.4em] leading-none ${musica ? 'bg-nino-lila' : 'opacity-70'}`}
          >
            <span aria-hidden="true" className="relative">
              🎵
              {!musica && <span className="absolute inset-x-0 top-1/2 h-1 -rotate-45 rounded-full bg-nino-tinta/70" />}
            </span>
            <Rotulo>MÚSICA</Rotulo>
          </BotonNino>
        )}
      </nav>
      <div key={vista} className="animate-pantalla min-h-0 flex-1">
        {vista === 'globos' ? <MiniJuego saludo={recreo ? SALUDO_RECREO_GLOBOS : SALUDO_ESPERA} /> : <Tienda />}
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

// La palabra bajo el pictograma, como en los saludos del parque. La voz ya la
// dice el botón, así que es solo visual.
function Rotulo({ children }: { children: string }) {
  return (
    <span aria-hidden="true" className="text-[0.4em] leading-none font-bold">
      {children}
    </span>
  )
}

function Pestana({ activa, voz, icono, palabra, alTocar }: { activa: boolean; voz: string; icono: string; palabra: string; alTocar: () => void }) {
  return (
    <BotonNino
      voz={voz}
      aria-pressed={activa}
      onClick={alTocar}
      className={`grid h-20 w-28 place-content-center justify-items-center gap-1 text-[1.6em] leading-none ${activa ? 'bg-nino-amarillo' : 'opacity-70'}`}
    >
      <span aria-hidden="true">{icono}</span>
      <Rotulo>{palabra}</Rotulo>
    </BotonNino>
  )
}
