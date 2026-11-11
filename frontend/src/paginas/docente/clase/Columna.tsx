import { useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import type { Estudiante, Sala } from '../../../dominio/tipos.ts'
import { EMOCIONES } from '../../../lib/avance.ts'
import { convieneMirar, enLinea, estadoNino, llego, type ColorSala, type DatosClase, type EstadoNino } from '../../../lib/clase.ts'
import { Avatar } from '../../../ui/Avatar.tsx'
import { Etiqueta } from '../../../ui/aula.tsx'
import { PIDE_APOYO } from './apoyo.ts'

// Una columna del tablero: una sala (o «Sin sala») con sus niños en filas de una
// línea. Se le puede soltar un niño arrastrado con el mouse; en tablet se mueve
// desde el panel del niño.
export function Columna({
  titulo,
  detalle,
  sala,
  ninos,
  datos,
  pendiente,
  vacio,
  menu,
  color,
  alSoltar,
  alAbrir,
}: {
  titulo: string
  detalle?: ReactNode
  // Sin sala: la columna de quienes esperan.
  sala?: Sala
  // El color de la sala (el mismo que en Salas); «Sin sala» no tiene.
  color?: ColorSala
  ninos: Estudiante[]
  datos: DatosClase
  pendiente: (estudianteId: string) => string | undefined
  vacio: string
  menu?: ReactNode
  alSoltar: (estudianteId: string) => void
  alAbrir: (estudianteId: string) => void
}) {
  const [encima, setEncima] = useState(false)

  const soltar = (ev: DragEvent) => {
    ev.preventDefault()
    setEncima(false)
    const id = ev.dataTransfer.getData('text/plain')
    if (id) alSoltar(id)
  }

  return (
    <section
      aria-label={titulo}
      onDragOver={(ev) => {
        ev.preventDefault()
        ev.dataTransfer.dropEffect = 'move'
        setEncima(true)
      }}
      onDragLeave={(ev) => {
        if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) setEncima(false)
      }}
      onDrop={soltar}
      // relative: los textos para lector de pantalla (posición absoluta) quedan
      // dentro del tablero, que se desliza, y no ensanchan la página.
      className={`relative flex max-w-[22rem] flex-[1_0_16rem] snap-start flex-col rounded-xl border transition-shadow ${
        sala ? 'border-borde bg-white' : 'border-dashed border-borde bg-transparent'
      } ${encima ? 'ring-2 ring-menta-oscuro ring-offset-2 ring-offset-lienzo' : ''}`}
    >
      <header
        className="flex items-start gap-2 rounded-t-xl border-b border-borde py-2 pr-1.5 pl-3"
        style={color ? { background: color.fondo, boxShadow: `inset 0 4px 0 ${color.acento}` } : undefined}
      >
        <div className="min-w-0 flex-1 py-1">
          <h3 className="flex items-center gap-2 font-semibold text-tinta">
            <span className="truncate">{titulo}</span>
            <Etiqueta>
              {ninos.length}
              <span className="sr-only">{ninos.length === 1 ? ' niño' : ' niños'}</span>
            </Etiqueta>
          </h3>
          {detalle && <p className="mt-0.5 truncate text-[13px] text-tinta-suave">{detalle}</p>}
        </div>
        {menu}
      </header>
      {ninos.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-tinta-suave">{vacio}</p>
      ) : (
        <ul className="grid gap-0.5 p-1.5">
          {ninos.map((e) => (
            <FilaNino key={e.id} e={e} sala={sala} datos={datos} destinoPendiente={pendiente(e.id)} alAbrir={() => alAbrir(e.id)} />
          ))}
        </ul>
      )}
    </section>
  )
}

// Un niño en una línea: quién es, cómo va y si pide apoyo. Sin tablet abierta
// se dice con texto (y el nombre más tenue); de la emoción con que llegó, solo
// la tristeza o el enojo, que piden mirarlo. Lo demás está en su panel.
function FilaNino({ e, sala, datos, destinoPendiente, alAbrir }: { e: Estudiante; sala?: Sala; datos: DatosClase; destinoPendiente?: string; alAbrir: () => void }) {
  const online = enLinea(datos.conectados.get(e.id))
  const estado = estadoNino(sala, datos.progresoDe.get(e.id))
  const emocion = datos.emocionDe.get(e.id)
  const pideApoyo = estado.tipo === 'actividad' && estado.necesitaAyuda

  const teclear = (ev: KeyboardEvent) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return
    ev.preventDefault()
    alAbrir()
  }

  return (
    <li
      draggable
      data-nino={e.id}
      onDragStart={(ev) => {
        ev.dataTransfer.setData('text/plain', e.id)
        ev.dataTransfer.effectAllowed = 'move'
      }}
    >
      {/* div y no button: algunos navegadores no empiezan a arrastrar desde un botón. */}
      <div
        role="button"
        tabIndex={0}
        onClick={alAbrir}
        onKeyDown={teclear}
        className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-[15px] hover:bg-lienzo pointer-coarse:min-h-11"
      >
        <Avatar estudiante={e} className={`size-7 shrink-0 text-base ${online ? '' : 'opacity-60'} ${pideApoyo ? PIDE_APOYO : ''}`} />
        <span className={`min-w-0 flex-1 truncate font-medium ${online ? 'text-tinta' : 'text-tinta-suave'}`}>{e.nombre}</span>
        {destinoPendiente !== undefined ? (
          <span className="flex items-center gap-1.5 text-[13px] text-menta-oscuro">
            <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-menta border-t-transparent motion-reduce:animate-none" />
            Moviendo…
          </span>
        ) : online ? (
          <Estado estado={estado} />
        ) : (
          <span className="shrink-0 text-[13px] text-tinta-suave">
            <span className="sr-only">, </span>Sin tablet
          </span>
        )}
        {convieneMirar(emocion) && (
          <span title={llego(emocion)} className="shrink-0 text-base leading-none">
            <span aria-hidden="true">{EMOCIONES[emocion].cara}</span>
            <span className="sr-only">, {llego(emocion).toLowerCase()}</span>
          </span>
        )}
      </div>
    </li>
  )
}

function Estado({ estado }: { estado: EstadoNino }) {
  switch (estado.tipo) {
    case 'termino':
      return <Etiqueta tono="acento">Terminó</Etiqueta>
    case 'actividad':
      return (
        <span className="flex shrink-0 items-center gap-1.5">
          {estado.necesitaAyuda && (
            <Etiqueta tono="atencion">
              <span className="sr-only">, pide </span>Apoyo
            </Etiqueta>
          )}
          <span className="text-[13px] text-tinta-suave tabular-nums">
            <span aria-hidden="true">
              {estado.numero}/{estado.total}
            </span>
            <span className="sr-only">
              , actividad {estado.numero} de {estado.total}
            </span>
          </span>
        </span>
      )
    default:
      return null
  }
}
