import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icono, type NombreIcono } from './Icono.tsx'

// Piezas de interfaz con el estilo del prototipo «Aula» (Canva).

type Variante = 'primario' | 'secundario' | 'suave'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-menta-oscuro text-white shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)] hover:bg-menta',
  secundario: 'bg-marino text-white hover:bg-marino-claro',
  suave: 'bg-celeste-fondo text-tinta hover:bg-[#d5e7f7]',
}

const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50'

export function Boton({ variante = 'primario', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return <button className={`${base} ${VARIANTES[variante]} ${className}`} {...props} />
}

export function BotonEnlace({ to, variante = 'primario', children, className = '' }: { to: string; variante?: Variante; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={`${base} ${VARIANTES[variante]} ${className}`}>
      {children}
    </Link>
  )
}

export function Antetitulo({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs font-bold uppercase tracking-[0.14em] text-menta-oscuro ${className}`}>{children}</p>
}

export const claseTarjeta = 'rounded-3xl border border-borde bg-white shadow-[0_8px_24px_-12px_rgb(23_58_94/0.18)]'

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${claseTarjeta} p-6 ${className}`}>{children}</div>
}

export function IconoCaja({ nombre, className = '' }: { nombre: NombreIcono; className?: string }) {
  return (
    <span className={`grid size-12 place-items-center rounded-2xl bg-celeste-fondo text-marino ${className}`}>
      <Icono nombre={nombre} className="size-6" />
    </span>
  )
}

export function Encabezado({ antetitulo, titulo, descripcion, accion }: { antetitulo: string; titulo: string; descripcion?: string; accion?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-4">
      <div className="flex-1">
        <Antetitulo>{antetitulo}</Antetitulo>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-tinta">{titulo}</h1>
        {descripcion && <p className="mt-1 text-tinta-suave">{descripcion}</p>}
      </div>
      {accion}
    </div>
  )
}

export function Campo({ etiqueta, error, children }: { etiqueta: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-tinta">{etiqueta}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-[#b42318]">{error}</span>}
    </label>
  )
}

export const claseEntrada = 'w-full rounded-xl border border-borde bg-white px-3.5 py-2.5 text-tinta placeholder:text-tinta-suave/70 focus:border-menta focus:outline-none focus:ring-2 focus:ring-menta/30'

// Aviso de consulta fallida en el panel docente, con opción de reintentar.
export function AvisoError({ alReintentar }: { alReintentar: () => void }) {
  return (
    <Tarjeta className="flex flex-wrap items-center gap-4">
      <IconoCaja nombre="reintentar" className="bg-[#fdf1e4] text-[#9a4d00]" />
      <div className="min-w-0 flex-1">
        <h2 className="font-bold text-tinta">No se pudieron cargar los datos</h2>
        <p className="text-sm text-tinta-suave">Revisa la conexión a internet. Si la sesión venció, vuelve a iniciarla.</p>
      </div>
      <Boton onClick={alReintentar} variante="secundario">
        <Icono nombre="reintentar" /> Reintentar
      </Boton>
    </Tarjeta>
  )
}

export function FondoAula({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_12%_85%,#dcebfb_0,transparent_45%),radial-gradient(circle_at_85%_10%,#dff5ea_0,transparent_40%)] bg-fondo">
      {children}
    </div>
  )
}
