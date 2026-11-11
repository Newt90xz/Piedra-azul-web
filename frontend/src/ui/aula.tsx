import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { confirmarSalida } from '../lib/cambiosSinGuardar.ts'
import { useDialogo, useEscape } from './dialogo.ts'
import { Link } from 'react-router-dom'
import { Icono } from './Icono.tsx'

// Piezas del panel docente (y de su entrada). Sobrio y de sistema: superficies
// blancas con borde de 1 px, radios chicos, sin sombras salvo en lo que flota
// (panel lateral, menús, diálogos). Los estados siempre van con texto.

type Variante = 'primario' | 'secundario' | 'suave' | 'peligro' | 'peligro-suave'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-menta-oscuro text-white hover:bg-menta-hondo',
  secundario: 'border border-borde bg-white text-tinta hover:bg-lienzo',
  suave: 'text-tinta hover:bg-lienzo',
  peligro: 'bg-peligro text-white hover:bg-peligro-hondo',
  // Una acción que borra o cierra algo, pero que no es la principal de la vista.
  'peligro-suave': 'text-peligro hover:bg-peligro-fondo',
}

const base =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50'

export function Boton({ variante = 'primario', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return <button type={type} className={`${base} ${VARIANTES[variante]} ${className}`} {...props} />
}

export function BotonEnlace({ to, variante = 'primario', children, className = '' }: { to: string; variante?: Variante; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={`${base} ${VARIANTES[variante]} ${className}`}>
      {children}
    </Link>
  )
}

// Superficie blanca con borde de 1 px: un panel de la página.
export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-borde bg-white p-5 ${className}`}>{children}</div>
}

// Título de página. `migas`: el camino hasta aquí (Salas › Grupo Letras).
export function Encabezado({
  titulo,
  descripcion,
  accion,
  migas,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  accion?: ReactNode
  migas?: { to: string; texto: string }[]
}) {
  return (
    <header className="mb-6 grid gap-1">
      {migas && (
        <nav aria-label="Estás en" className="text-sm text-tinta-suave">
          {migas.map((m) => (
            <span key={m.to}>
              <Link to={m.to} onClick={(e) => !confirmarSalida() && e.preventDefault()} className="font-medium hover:text-tinta hover:underline">
                {m.texto}
              </Link>
              <span aria-hidden="true" className="mx-1.5">
                ›
              </span>
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-tinta">{titulo}</h1>
        {accion}
      </div>
      {descripcion && <p className="max-w-3xl text-[15px] text-tinta-suave">{descripcion}</p>}
    </header>
  )
}

export function Campo({ etiqueta, error, ayuda, children }: { etiqueta: string; error?: string; ayuda?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-tinta">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-sm text-tinta-suave">{ayuda}</span>}
      {error && <span className="mt-1 block text-sm font-medium text-peligro">{error}</span>}
    </label>
  )
}

export const claseEntrada =
  'w-full min-h-10 rounded-lg border border-borde bg-white px-3 py-2 text-tinta placeholder:text-tinta-suave focus:border-menta-oscuro focus:outline-none focus:ring-2 focus:ring-menta/25'

type Tono = 'neutro' | 'acento' | 'atencion' | 'peligro'

const TONOS: Record<Tono, string> = {
  neutro: 'bg-lienzo text-tinta-suave',
  acento: 'bg-menta-fondo text-menta-oscuro',
  atencion: 'bg-atencion-fondo text-atencion',
  peligro: 'bg-peligro-fondo text-peligro',
}

// Un estado en pocas palabras («Pide apoyo», «Sin tablet»): el color acompaña, el texto informa.
export function Etiqueta({ tono = 'neutro', children, className = '' }: { tono?: Tono; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONOS[tono]} ${className}`}>{children}</span>
}

// Un aviso en línea: error de una acción, datos sin actualizar, confirmación.
export function Aviso({ tono = 'atencion', children, className = '' }: { tono?: 'atencion' | 'peligro' | 'acento'; children: ReactNode; className?: string }) {
  return (
    <p role={tono === 'peligro' ? 'alert' : 'status'} className={`rounded-lg px-4 py-3 text-sm font-medium ${TONOS[tono]} ${className}`}>
      {children}
    </p>
  )
}

// Aviso de consulta fallida en el panel docente, con opción de reintentar.
export function AvisoError({ alReintentar }: { alReintentar: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-4 rounded-xl border border-atencion-borde bg-atencion-fondo p-4">
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-atencion">No se pudieron cargar los datos</h2>
        <p className="text-sm text-tinta">Revisa la conexión a internet. Si la sesión venció, vuelve a iniciarla.</p>
      </div>
      <Boton onClick={alReintentar} variante="secundario">
        <Icono nombre="reintentar" /> Reintentar
      </Boton>
    </div>
  )
}

// Pantalla vacía: dice qué falta y cómo seguir.
export function EstadoVacio({ titulo, children, accion }: { titulo: string; children?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-xl border border-dashed border-borde px-6 py-10 text-center">
      <h2 className="font-semibold text-tinta">{titulo}</h2>
      {children && <p className="max-w-md text-sm text-tinta-suave">{children}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  )
}

// Diálogo chico centrado: confirmaciones y formularios cortos.
export function Dialogo({ titulo, children, alCerrar, rol = 'dialog' }: { titulo: string; children: ReactNode; alCerrar: () => void; rol?: 'dialog' | 'alertdialog' }) {
  const ref = useDialogo<HTMLDivElement>()
  const id = useId()
  useEscape(alCerrar)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-tinta/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div ref={ref} tabIndex={-1} role={rol} aria-modal="true" aria-labelledby={id} className="grid w-full max-w-md gap-4 rounded-xl bg-white p-6 text-tinta shadow-xl outline-none">
        <h2 id={id} className="text-lg font-semibold text-tinta">
          {titulo}
        </h2>
        {children}
      </div>
    </div>
  )
}

// Panel que se abre al costado (en pantallas angostas, desde abajo) con el
// detalle de algo y sus acciones, sin salir de la página.
export function PanelLateral({ titulo, alCerrar, children }: { titulo: ReactNode; alCerrar: () => void; children: ReactNode }) {
  const ref = useDialogo<HTMLDivElement>()
  const id = useId()
  useEscape(alCerrar)
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-tinta/20 md:items-stretch md:justify-end" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="flex max-h-[88dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl outline-none md:max-h-none md:w-[26rem] md:rounded-none md:border-l md:border-borde"
      >
        <div className="flex items-center gap-3 border-b border-borde px-5 py-3">
          <h2 id={id} className="min-w-0 flex-1 text-lg font-semibold text-tinta">
            {titulo}
          </h2>
          <button type="button" aria-label="Cerrar" onClick={alCerrar} className="grid size-10 place-items-center rounded-lg text-tinta-suave hover:bg-lienzo hover:text-tinta">
            <Icono nombre="cerrar" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export type OpcionMenu = { texto: string; alElegir: () => void; peligro?: boolean; marcada?: boolean } | 'separador'

// Menú de acciones (⋯ o un botón propio): flechas para recorrer, Escape cierra
// y devuelve el foco al botón, un toque fuera también lo cierra.
export function MenuAcciones({
  etiqueta,
  opciones,
  children,
  claseBoton = 'grid size-10 place-items-center rounded-lg text-tinta-suave hover:bg-lienzo hover:text-tinta',
  alinear = 'derecha',
}: {
  etiqueta: string
  opciones: OpcionMenu[]
  children?: ReactNode
  claseBoton?: string
  alinear?: 'derecha' | 'izquierda'
}) {
  const [abierto, setAbierto] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const lista = useRef<HTMLDivElement>(null)
  const items = () => [...(lista.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])]

  useEffect(() => {
    if (!abierto) return
    items()[0]?.focus()
    const fuera = (e: PointerEvent) => {
      if (!lista.current?.contains(e.target as Node) && !boton.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [abierto])

  const cerrar = () => {
    setAbierto(false)
    boton.current?.focus()
  }

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    const todos = items()
    const i = todos.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      e.stopPropagation()
      cerrar()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      todos[(i + 1) % todos.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      todos[(i - 1 + todos.length) % todos.length]?.focus()
    } else if (e.key === 'Tab') setAbierto(false)
  }

  return (
    <div className="relative">
      <button ref={boton} type="button" aria-haspopup="menu" aria-expanded={abierto} aria-label={children ? undefined : etiqueta} onClick={() => setAbierto(!abierto)} className={claseBoton}>
        {children ?? <Icono nombre="opciones" className="size-5 [stroke-width:3]" />}
      </button>
      {abierto && (
        <div
          ref={lista}
          role="menu"
          aria-label={etiqueta}
          onKeyDown={alTeclear}
          className={`absolute top-full z-30 mt-1 grid min-w-56 rounded-lg border border-borde bg-white py-1 text-tinta shadow-lg ${alinear === 'derecha' ? 'right-0' : 'left-0'}`}
        >
          {opciones.map((o, i) =>
            o === 'separador' ? (
              <hr key={i} className="my-1 border-borde" />
            ) : (
              <button
                key={i}
                type="button"
                role={o.marcada === undefined ? 'menuitem' : 'menuitemradio'}
                aria-checked={o.marcada}
                tabIndex={-1}
                onClick={() => {
                  setAbierto(false)
                  o.alElegir()
                }}
                className={`flex min-h-10 items-center gap-2 px-3 text-left text-sm focus:bg-lienzo focus:outline-none ${o.peligro ? 'text-peligro' : 'text-tinta'} hover:bg-lienzo`}
              >
                {o.marcada !== undefined && <span className="w-4 shrink-0">{o.marcada && <Icono nombre="check" className="size-4" />}</span>}
                {o.texto}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

// Pestañas: flechas izquierda y derecha (e Inicio y Fin) recorren y eligen; solo
// la pestaña elegida entra en el orden de Tab. El panel va con `PanelPestana`.
export function Pestanas<T extends string>({ etiqueta, pestanas, actual, alCambiar }: { etiqueta: string; pestanas: { id: T; texto: string }[]; actual: T; alCambiar: (id: T) => void }) {
  const teclear = (ev: KeyboardEvent<HTMLDivElement>) => {
    const i = pestanas.findIndex((p) => p.id === actual)
    const destino =
      ev.key === 'ArrowRight' ? (i + 1) % pestanas.length : ev.key === 'ArrowLeft' ? (i - 1 + pestanas.length) % pestanas.length : ev.key === 'Home' ? 0 : ev.key === 'End' ? pestanas.length - 1 : -1
    if (destino < 0) return
    ev.preventDefault()
    alCambiar(pestanas[destino].id)
    document.getElementById(`pestana-${pestanas[destino].id}`)?.focus()
  }
  return (
    <div role="tablist" aria-label={etiqueta} onKeyDown={teclear} className="mb-6 flex gap-1 overflow-x-auto border-b border-borde">
      {pestanas.map((p) => (
        <button
          key={p.id}
          id={`pestana-${p.id}`}
          type="button"
          role="tab"
          aria-selected={actual === p.id}
          aria-controls={`panel-${p.id}`}
          tabIndex={actual === p.id ? 0 : -1}
          onClick={() => alCambiar(p.id)}
          className={`-mb-px min-h-11 border-b-2 px-3 text-sm font-semibold whitespace-nowrap ${actual === p.id ? 'border-menta-oscuro text-tinta' : 'border-transparent text-tinta-suave hover:text-tinta'}`}
        >
          {p.texto}
        </button>
      ))}
    </div>
  )
}

export function PanelPestana({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`pestana-${id}`} tabIndex={0} className="outline-none focus-visible:ring-2 focus-visible:ring-menta-oscuro">
      {children}
    </div>
  )
}
