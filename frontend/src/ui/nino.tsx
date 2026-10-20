import { createContext, use, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, Navigate, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useSesion } from '../app/Sesion.tsx'
import { repo } from '../datos/index.ts'
import { reenviarPendientes } from '../datos/pendientes.ts'
import type { Emocion, Estudiante, Imagen } from '../dominio/tipos.ts'
import { fijarMudo } from '../lib/audio.ts'
import { useConsulta } from '../lib/useConsulta.ts'
import { Avatar } from './Avatar.tsx'
import { FondoNino, ProtectorPantalla } from './fondoNino.tsx'
import { Icono } from './Icono.tsx'
import { RuletaEmociones } from './ruleta.tsx'
import { useVozAlApuntar } from './voz.ts'

export { useVozAlApuntar }

// Vista del niño: estilo Pictomania, cero dependencia de lectura.

interface ValorNino {
  estudiante: Estudiante
  silenciado: boolean
  recargar: () => void
  // Cómo dice sentirse ahora; la ruleta de la barra y la pantalla de inicio lo cambian.
  emocion: Emocion | null
  cambiarEmocion: (e: Emocion) => Promise<void>
}

const NinoContexto = createContext<ValorNino | null>(null)

export function useNino() {
  const v = use(NinoContexto)
  if (!v) throw new Error('useNino debe usarse dentro de <NinoShell>')
  return v
}

// Colores por defecto solo si quien llama no trae los suyos (evita choques de clases).
function conBase(className: string) {
  const fondo = /(^|\s)bg-/.test(className) ? '' : 'bg-white'
  const borde = /(^|\s)border-(nino|transparent|\[)/.test(className) ? '' : 'border-nino-azul'
  return `tarjeta-nino rounded-[1.75rem] border-3 transition-transform hover:-translate-y-1 ${fondo} ${borde} ${className}`
}

export function BotonNino({ voz, className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { voz: string }) {
  return (
    <button aria-label={voz} {...useVozAlApuntar(voz)} className={`${conBase(className)} disabled:hover:translate-y-0`} {...props}>
      {children}
    </button>
  )
}

export function EnlaceNino({ to, voz, className = '', children }: { to: string; voz: string; className?: string; children: ReactNode }) {
  return (
    <Link to={to} aria-label={voz} {...useVozAlApuntar(voz)} className={`block ${conBase(className)}`}>
      {children}
    </Link>
  )
}

// RF-08: muestra foto real, pictograma o el marcador provisional según el perfil.
export function ImagenNino({ imagen, className = '' }: { imagen: Imagen; className?: string }) {
  const { estudiante } = useNino()
  const modo = estudiante.ajustes.modoImagen
  const src = modo === 'picto' ? imagen.pictoUrl ?? imagen.fotoUrl : imagen.fotoUrl ?? imagen.pictoUrl
  if (src) return <img src={src} alt={imagen.alt} className={`object-contain ${className}`} />
  return (
    <span role="img" aria-label={imagen.alt} className={`inline-block leading-none ${className}`}>
      {imagen.emoji}
    </span>
  )
}

// Error para el niño: sin texto, solo una imagen y un botón grande que habla.
export function ErrorNino({ alReintentar }: { alReintentar: () => void }) {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-6 py-10">
      <div className="grid justify-items-center gap-8">
        <span role="img" aria-label="Algo no funcionó" className="text-[6em] leading-none">
          🔌
        </span>
        <BotonNino voz="Intentar otra vez" onClick={alReintentar} className="grid size-32 place-items-center bg-nino-amarillo">
          <Icono nombre="reintentar" className="size-14" />
        </BotonNino>
      </div>
    </main>
  )
}

const claveEmocion = (id: string) => `leer-para-todos/emocion/${id}`

function emocionGuardada(id: string): Emocion | null {
  try {
    return sessionStorage.getItem(claveEmocion(id)) as Emocion | null
  } catch {
    return null
  }
}

export function NinoShell() {
  const { id = '' } = useParams()
  const { docente } = useSesion()
  const navegar = useNavigate()
  const { datos: estudiante, error, recargar } = useConsulta(() => repo.obtenerEstudiante(id), [id])
  const [mudo, setMudo] = useState(false)
  const [emocion, setEmocion] = useState<Emocion | null>(() => emocionGuardada(id))
  // Es un alumno conectado a una sala si entró por /alumno, aunque comparta navegador con la docente.
  const modoAlumno = repo.alumnoDelDispositivo() === id

  // El silencio que pulsa el niño apaga voz y efectos; al salir de la vista se restablece.
  useEffect(() => {
    fijarMudo(mudo)
    return () => fijarMudo(false)
  }, [mudo])

  // Si la docente lo desconecta (o cierra la sala), el niño vuelve a la espera.
  useEffect(() => {
    if (!modoAlumno) return
    const volverALaEspera = () => {
      repo.olvidarAlumno()
      navegar('/alumno', { replace: true })
    }
    const revisar = () => {
      void reenviarPendientes()
      repo.salaDelAlumno().then((sala) => sala || volverALaEspera(), () => {})
    }
    revisar()
    const t = window.setInterval(revisar, 4000)
    return () => window.clearInterval(t)
  }, [modoAlumno, id, navegar])

  const salirDeLaSala = async () => {
    await repo.salirDeSala().catch(() => {})
    navegar('/alumno', { replace: true })
  }

  const cambiarEmocion = async (e: Emocion) => {
    setEmocion(e)
    try {
      sessionStorage.setItem(claveEmocion(id), e)
    } catch {
      // Sin almacenamiento solo se pierde el recuerdo de la ruleta.
    }
    // Si falla, el niño sigue jugando igual; solo se pierde este registro.
    await repo.registrarEmocion(id, e).catch((err: unknown) => console.warn('[emocion] No se pudo registrar.', err))
  }

  if (!modoAlumno && docente === undefined) return <div className="nino min-h-dvh" />
  if (!modoAlumno && !docente) return <Navigate to="/alumno" replace />
  if (error && !estudiante)
    return (
      <div className="nino min-h-dvh">
        <ErrorNino alReintentar={recargar} />
      </div>
    )
  if (estudiante === undefined) return <div className="nino min-h-dvh" />
  if (estudiante === null) {
    if (modoAlumno) repo.olvidarAlumno()
    return <Navigate to={modoAlumno ? '/alumno' : '/aula'} replace />
  }

  const a = estudiante.ajustes
  // Efectos: los calla el ajuste de la docente o el silencio del niño (que además calla la voz).
  const silenciado = mudo || a.silenciarEfectos

  return (
    <NinoContexto value={{ estudiante, silenciado, recargar, emocion, cambiarEmocion }}>
      <div
        className="nino relative min-h-dvh"
        data-tamano={a.tamanoLetra}
        data-contraste={a.altoContraste ? 'alto' : undefined}
        data-reducir={a.reducirAnimaciones ? 'si' : undefined}
      >
        {!a.reducirAnimaciones && (
          <>
            <FondoNino tematica={a.tematica} silenciado={silenciado} />
            <ProtectorPantalla tematica={a.tematica} />
          </>
        )}
        <div className="relative z-10">
          <header className="encabezado-nino relative z-20 flex items-center gap-4 px-5 py-3">
            <EnlaceNino to={`/aula/${estudiante.id}`} voz="Mi inicio" className="flex items-center gap-3 rounded-2xl border-0 bg-white px-3 py-1">
              <Avatar estudiante={estudiante} className="size-12 text-3xl" />
              <span className="text-[0.85em] font-bold">{estudiante.nombre}</span>
            </EnlaceNino>
            <span className="flex-1" />
            <span className="flex items-center gap-2 rounded-full border-3 border-[#e6c84d] bg-nino-amarillo px-4 py-1.5 text-[0.85em] font-bold" aria-label={`${estudiante.monedas} monedas`}>
              <span aria-hidden="true">🪙</span>
              {estudiante.monedas}
            </span>
            <RuletaEmociones actual={emocion} alElegir={(e) => void cambiarEmocion(e)} />
            <BotonNino
              voz={mudo ? 'Activar sonidos' : 'Silenciar sonidos'}
              aria-pressed={mudo}
              onClick={() => setMudo(!mudo)}
              className="grid size-16 place-items-center rounded-2xl border-nino-azul"
            >
              <Icono nombre={mudo ? 'silencio' : 'altavoz'} className="size-8" />
            </BotonNino>
            {modoAlumno && (
              <BotonNino voz="Salir de la sala" onClick={() => void salirDeLaSala()} className="grid size-16 place-items-center rounded-2xl border-nino-azul bg-[#f6d1d1]">
                <Icono nombre="salir" className="size-8" />
              </BotonNino>
            )}
          </header>
          <Outlet />
        </div>
      </div>
    </NinoContexto>
  )
}
