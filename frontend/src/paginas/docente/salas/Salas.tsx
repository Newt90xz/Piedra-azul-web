import { useEffect, useRef, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useSesion } from '../../../app/Sesion.tsx'
import { repo } from '../../../datos/index.ts'
import type { Sala } from '../../../dominio/tipos.ts'
import { avanceEn, coloresDeSalas, salasEnOrden, type ColorSala } from '../../../lib/clase.ts'
import { confirmarSalida } from '../../../lib/cambiosSinGuardar.ts'
import { useConsulta } from '../../../lib/useConsulta.ts'
import { Icono } from '../../../ui/Icono.tsx'
import { Aviso, AvisoError, Boton, Encabezado, EstadoVacio, MenuAcciones } from '../../../ui/aula.tsx'
import { AjustesRecreo } from './AjustesRecreo.tsx'
import { AlTerminar, Eliminar, NuevaSala, Renombrar } from './AccionesSala.tsx'
import { EditorPlan } from './EditorPlan.tsx'
import { TIPOS, queHacen } from './sala.ts'

type Datos = { salas: Sala[]; miembros: { estudianteId: string; salaId: string }[]; progreso: Awaited<ReturnType<typeof repo.listarProgreso>> }

// Las direcciones antiguas (/docente/salas/:id) abren esa sala en la lista.
export function RedirigirSala() {
  const { id = '' } = useParams()
  return <Navigate to={`/docente/salas?sala=${encodeURIComponent(id)}`} replace />
}

// Salas: todas en una sola página, cada una con su color. Se abre una a la vez
// y ahí mismo se edita: su plan (o su recreo) y a dónde pasan al terminar. La
// sala abierta queda en la dirección (?sala=…), así «Editar sala» llega directo.
export default function Salas() {
  const { cursoId } = useSesion()
  const [params, setParams] = useSearchParams()
  const abierta = params.get('sala')
  const { datos, error, recargar } = useConsulta(async (): Promise<Datos> => {
    const [salas, miembros, estudiantes, progreso] = await Promise.all([
      repo.listarSalas(cursoId),
      repo.listarMiembros(cursoId),
      repo.listarEstudiantes(cursoId),
      repo.listarProgreso(cursoId),
    ])
    const activos = new Set(estudiantes.filter((e) => e.activo).map((e) => e.id))
    return { salas, miembros: miembros.filter((m) => activos.has(m.estudianteId)), progreso }
  }, [cursoId])
  const [creando, setCreando] = useState(false)
  const [dialogo, setDialogo] = useState<{ tipo: 'renombrar' | 'eliminar'; sala: Sala } | null>(null)
  // La sala cuyo plan se acaba de guardar, para confirmarlo.
  const [guardada, setGuardada] = useState<string | null>(null)

  // Cambiar de sala con un plan a medio editar pregunta antes (el borrador queda igual).
  const abrir = (id: string | null) => {
    if (id !== abierta && !confirmarSalida()) return
    setGuardada(null)
    setParams(id ? { sala: id } : {}, { replace: true })
  }

  if (error && !datos) return <AvisoError alReintentar={recargar} />
  if (!datos) return <p className="text-tinta-suave">Cargando las salas…</p>

  const nueva = (
    <Boton onClick={() => setCreando(true)}>
      <Icono nombre="mas" /> Nueva sala
    </Boton>
  )
  const salas = salasEnOrden(datos.salas)
  const colores = coloresDeSalas(datos.salas)

  return (
    <>
      <Encabezado titulo="Salas" descripcion="Abre una sala para preparar su plan o su recreo, y a dónde pasan los niños al terminar." accion={salas.length > 0 && nueva} />

      {salas.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay salas" accion={nueva}>
          Crea una sala de actividades para un grupo de niños y, si quieres, un recreo al que pasen al terminar.
        </EstadoVacio>
      ) : (
        <div className="grid gap-3">
          {salas.map((s) => (
            <FilaSala
              key={s.id}
              sala={s}
              datos={datos}
              color={colores.get(s.id)!}
              abierta={abierta === s.id}
              guardada={guardada === s.id}
              alAlternar={() => abrir(abierta === s.id ? null : s.id)}
              alCambiar={recargar}
              alGuardarPlan={() => {
                setGuardada(s.id)
                recargar()
              }}
              alRenombrar={() => setDialogo({ tipo: 'renombrar', sala: s })}
              alEliminar={() => setDialogo({ tipo: 'eliminar', sala: s })}
            />
          ))}
        </div>
      )}

      {creando && (
        <NuevaSala
          cursoId={cursoId}
          alCerrar={() => setCreando(false)}
          alCrear={(sala) => {
            setCreando(false)
            recargar()
            abrir(sala.id)
          }}
        />
      )}
      {dialogo?.tipo === 'renombrar' && <Renombrar sala={dialogo.sala} alCerrar={() => setDialogo(null)} alListo={recargar} />}
      {dialogo?.tipo === 'eliminar' && (
        <Eliminar
          sala={dialogo.sala}
          salas={datos.salas}
          ninos={datos.miembros.filter((m) => m.salaId === dialogo.sala.id).length}
          alCerrar={() => setDialogo(null)}
          alEliminar={() => {
            setDialogo(null)
            if (abierta === dialogo.sala.id) setParams({}, { replace: true })
            recargar()
          }}
        />
      )}
    </>
  )
}

function FilaSala({
  sala,
  datos,
  color,
  abierta,
  guardada,
  alAlternar,
  alCambiar,
  alGuardarPlan,
  alRenombrar,
  alEliminar,
}: {
  sala: Sala
  datos: Datos
  color: ColorSala
  abierta: boolean
  guardada: boolean
  alAlternar: () => void
  alCambiar: () => void
  alGuardarPlan: () => void
  alRenombrar: () => void
  alEliminar: () => void
}) {
  const ref = useRef<HTMLElement>(null)
  const ninos = datos.miembros.filter((m) => m.salaId === sala.id)
  const conAvance = ninos.filter((m) => (avanceEn(sala, datos.progreso.find((p) => p.estudianteId === m.estudianteId))?.paso ?? 0) > 0).length
  const siguiente = datos.salas.find((s) => s.id === sala.siguienteSala)
  const que = queHacen(sala)
  const resumen = [TIPOS[sala.tipo].nombre, que ?? 'Sin plan todavía', sala.tipo === 'trabajo' && siguiente ? `Al terminar pasan a ${siguiente.nombre}` : null].filter(Boolean).join('. ')

  // Al abrirla, queda arriba en la pantalla.
  useEffect(() => {
    if (!abierta) return
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ref.current?.scrollIntoView({ block: 'start', behavior: quieto ? 'auto' : 'smooth' })
  }, [abierta])

  return (
    <section ref={ref} aria-labelledby={`nombre-${sala.id}`} className="scroll-mt-4 rounded-xl border border-borde bg-white" style={{ boxShadow: `inset 5px 0 0 ${color.acento}` }}>
      <div className={`flex items-center gap-1 pr-2 pl-[5px] ${abierta ? 'rounded-t-xl' : 'rounded-xl'}`} style={{ background: color.fondo }}>
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={`contenido-${sala.id}`}
          onClick={alAlternar}
          className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left"
        >
          <Icono nombre="abajo" className={`size-5 shrink-0 text-tinta transition-transform motion-reduce:transition-none ${abierta ? '' : '-rotate-90'}`} />
          <span className="min-w-0 flex-1">
            <span id={`nombre-${sala.id}`} className="block font-semibold text-tinta">
              {sala.nombre}
            </span>
            <span className="block truncate text-sm text-tinta/75">{resumen}</span>
          </span>
          <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-0.5 text-sm font-medium text-tinta tabular-nums">
            {ninos.length} {ninos.length === 1 ? 'niño' : 'niños'}
          </span>
        </button>
        <MenuAcciones
          etiqueta={`Opciones de ${sala.nombre}`}
          claseBoton="grid size-10 place-items-center rounded-lg text-tinta hover:bg-white/60"
          opciones={[{ texto: 'Cambiar nombre…', alElegir: alRenombrar }, 'separador', { texto: 'Eliminar sala…', peligro: true, alElegir: alEliminar }]}
        />
      </div>

      {abierta && (
        <div id={`contenido-${sala.id}`} className="rounded-b-xl border-t border-borde bg-fondo/70 p-3 md:p-5">
          {sala.tipo === 'trabajo' ? (
            <>
              <AlTerminar sala={sala} salas={datos.salas} alCambiar={alCambiar} />
              {guardada && (
                <Aviso tono="acento" className="mb-4">
                  Plan guardado. Los niños de esta sala lo empiezan desde la primera actividad.
                </Aviso>
              )}
              <EditorPlan key={sala.asignacion} sala={sala} conAvance={conAvance} alGuardado={alGuardarPlan} />
            </>
          ) : (
            <AjustesRecreo key={sala.id} sala={sala} salas={datos.salas} />
          )}
        </div>
      )}
    </section>
  )
}
