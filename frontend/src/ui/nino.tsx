import { createContext, use, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, Navigate, Outlet, useParams } from 'react-router-dom'
import { useSesion } from '../app/Sesion.tsx'
import { repo } from '../datos/index.ts'
import type { Estudiante, Imagen } from '../dominio/tipos.ts'
import { hablar } from '../lib/audio.ts'
import { useConsulta } from '../lib/useConsulta.ts'
import { Avatar } from './Avatar.tsx'
import { Icono } from './Icono.tsx'

// Vista del niño: estilo Pictomania, cero dependencia de lectura.

interface ValorNino {
  estudiante: Estudiante
  silenciado: boolean
  recargar: () => void
}

const NinoContexto = createContext<ValorNino | null>(null)

export function useNino() {
  const v = use(NinoContexto)
  if (!v) throw new Error('useNino debe usarse dentro de <NinoShell>')
  return v
}

// Lee en voz alta el nombre de un botón al apuntarlo o enfocarlo (regla de oro 1).
export function useVozAlApuntar(texto: string) {
  const t = useRef<number | undefined>(undefined)
  const decir = () => {
    window.clearTimeout(t.current)
    t.current = window.setTimeout(() => hablar(texto), 350)
  }
  const cancelar = () => window.clearTimeout(t.current)
  return { onPointerEnter: decir, onFocus: decir, onPointerLeave: cancelar, onBlur: cancelar }
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

export function NinoShell() {
  const { id = '' } = useParams()
  const { docente } = useSesion()
  const { datos: estudiante, error, recargar } = useConsulta(() => repo.obtenerEstudiante(id), [id])
  const [silenciadoManual, setSilenciado] = useState<boolean | null>(null)

  if (!docente) return <Navigate to="/aula" replace />
  if (error && !estudiante)
    return (
      <div className="nino min-h-dvh">
        <ErrorNino alReintentar={recargar} />
      </div>
    )
  if (estudiante === undefined) return <div className="nino min-h-dvh" />
  if (estudiante === null) return <Navigate to="/aula" replace />

  const a = estudiante.ajustes
  const silenciado = silenciadoManual ?? a.silenciarEfectos

  return (
    <NinoContexto value={{ estudiante, silenciado, recargar }}>
      <div
        className="nino min-h-dvh"
        data-tamano={a.tamanoLetra}
        data-contraste={a.altoContraste ? 'alto' : undefined}
        data-reducir={a.reducirAnimaciones ? 'si' : undefined}
      >
        <header className="flex items-center gap-4 border-b-3 border-nino-azul bg-white px-5 py-3">
          <EnlaceNino to={`/aula/${estudiante.id}`} voz="Mi inicio" className="flex items-center gap-3 rounded-2xl border-0 px-2 py-1 hover:translate-y-0">
            <Avatar estudiante={estudiante} className="size-12 text-3xl" />
            <span className="text-[0.85em] font-bold">{estudiante.nombre}</span>
          </EnlaceNino>
          <span className="flex-1" />
          <span className="flex items-center gap-2 rounded-full bg-nino-amarillo px-4 py-1.5 text-[0.85em] font-bold" aria-label={`${estudiante.monedas} monedas`}>
            <span aria-hidden="true">🪙</span>
            {estudiante.monedas}
          </span>
          <BotonNino
            voz={silenciado ? 'Activar sonidos' : 'Silenciar sonidos'}
            aria-pressed={silenciado}
            onClick={() => setSilenciado(!silenciado)}
            className="grid size-16 place-items-center rounded-2xl border-nino-azul hover:translate-y-0"
          >
            <Icono nombre={silenciado ? 'silencio' : 'altavoz'} className="size-8" />
          </BotonNino>
        </header>
        <Outlet />
      </div>
    </NinoContexto>
  )
}
