import { PALABRAS, quitarTildes } from '../../contenido/banco.ts'
import { nombreActividad } from '../../contenido/contenidos.ts'
import type { Estudiante, ResultadoActividad } from '../../dominio/tipos.ts'
import { detalleItem, fechaCorta, respuestaLegible, type AvanceItem } from '../../lib/avance.ts'
import { Avatar } from '../../ui/Avatar.tsx'

// Lo que se ve al tocar una palabra, sílaba o sonido en el avance: sus sílabas
// (si es una palabra), con qué se confundió el niño y, en la vista del curso,
// cómo le va a cada niño con ese ítem.
export function DetalleItem({
  resultados,
  item,
  estudiantes,
}: {
  resultados: ResultadoActividad[]
  item: AvanceItem
  // Solo en la vista del curso: desglose por niño.
  estudiantes?: Estudiante[]
}) {
  const d = detalleItem(resultados, item.categoria, item.item)
  const palabra = PALABRAS.find((w) => quitarTildes(w.texto) === quitarTildes(item.item.toLowerCase()))
  const conteo = item.categoria === 'conteo'

  return (
    <div className="grid gap-4 rounded-2xl border border-borde bg-fondo p-4 text-sm">
      {palabra && palabra.silabas.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label={`Sílabas: ${palabra.silabas.join(', ')}`}>
          {palabra.silabas.map((s, i) => (
            <span key={i} className="rounded-lg bg-white px-2.5 py-1 font-escolar text-base font-bold uppercase">
              {s}
            </span>
          ))}
          <span className="ml-1 text-tinta-suave">
            {palabra.silabas.length} sílabas
          </span>
        </div>
      )}

      <div>
        <h4 className="mb-1.5 font-bold text-tinta">Con qué se confundió</h4>
        {d.errores.length === 0 ? (
          <p className="text-tinta-suave">Sin equivocaciones registradas.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {d.errores.map((e) => (
              <li key={e.respuesta} className="flex items-center gap-1.5 rounded-lg bg-[#fdf1e4] px-2.5 py-1 text-[#9a4d00]">
                <b className="font-escolar text-base">{respuestaLegible(e.respuesta, conteo)}</b>
                <span className="text-xs font-semibold">× {e.veces}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {estudiantes ? (
        <PorNino detalle={d} estudiantes={estudiantes} conteo={conteo} />
      ) : (
        <div>
          <h4 className="mb-1.5 font-bold text-tinta">Últimas rondas</h4>
          <ul className="grid gap-1">
            {d.historial.slice(0, 6).map((h, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 text-tinta-suave">
                <span className={`size-2 rounded-full ${h.intentos === 1 ? 'bg-menta' : 'bg-[#e8a35c]'}`} aria-hidden="true" />
                <span>{fechaCorta(h.fecha)}</span>·<span>{nombreActividad(h.actividadId)}</span>·
                <b className="text-tinta">{h.intentos === 1 ? 'al primer intento' : `${h.intentos} intentos`}</b>
                {h.error && <span>(dijo {respuestaLegible(h.error, conteo)})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function PorNino({ detalle, estudiantes, conteo }: { detalle: ReturnType<typeof detalleItem>; estudiantes: Estudiante[]; conteo: boolean }) {
  const filas = estudiantes
    .map((e) => {
      const propias = detalle.historial.filter((h) => h.estudianteId === e.id)
      return { e, rondas: propias.length, primer: propias.filter((h) => h.intentos === 1).length, ultimoError: propias.find((h) => h.error)?.error }
    })
    .filter((f) => f.rondas > 0)
    .sort((a, b) => a.primer / a.rondas - b.primer / b.rondas)

  return (
    <div>
      <h4 className="mb-1.5 font-bold text-tinta">Por niño</h4>
      <ul className="grid gap-1.5">
        {filas.map(({ e, rondas, primer, ultimoError }) => (
          <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-2.5 py-1.5">
            <Avatar estudiante={e} className="size-7 text-base" />
            <span className="min-w-24 flex-1 font-semibold text-tinta">{e.nombre}</span>
            <span className={primer / rondas < 0.6 ? 'font-bold text-[#9a4d00]' : 'text-tinta-suave'}>
              {Math.round((primer / rondas) * 100)}% de {rondas}
            </span>
            {ultimoError && <span className="text-tinta-suave">· dijo {respuestaLegible(ultimoError, conteo)}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
