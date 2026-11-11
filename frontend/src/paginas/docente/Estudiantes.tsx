import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { quitarTildes } from '../../contenido/banco.ts'
import { repo } from '../../datos/index.ts'
import { EMOCIONES, fechaCorta, inicioDia, inicioSemana } from '../../lib/avance.ts'
import { CON_EMOCION } from '../../lib/clase.ts'
import { capitalizar } from '../../lib/texto.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { Icono } from '../../ui/Icono.tsx'
import { AvisoError, BotonEnlace, Encabezado, EstadoVacio, claseEntrada } from '../../ui/aula.tsx'

type Filtro = 'activos' | 'desactivados'

// Estudiantes: una tabla con lo esencial de cada niño (dónde está, cómo llegó la
// última vez y cuánto jugó esta semana). Los desactivados van aparte, a un toque.
export default function Estudiantes() {
  const { cursoId } = useSesion()
  const [buscar, setBuscar] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('activos')
  const { datos, error, recargar } = useConsulta(async () => {
    const [estudiantes, miembros, salas, emociones, semana] = await Promise.all([
      repo.listarEstudiantes(cursoId),
      repo.listarMiembros(cursoId),
      repo.listarSalas(cursoId),
      repo.ultimasEmociones(cursoId),
      repo.listarResultados({ cursoId, desde: inicioSemana() }),
    ])
    return { estudiantes, miembros, salas, emociones, semana }
  }, [cursoId])

  if (error && !datos) return <AvisoError alReintentar={recargar} />

  const anadir = (
    <BotonEnlace to="/docente/estudiantes/nuevo">
      <Icono nombre="mas" /> Añadir estudiante
    </BotonEnlace>
  )
  const todos = (datos?.estudiantes ?? []).toSorted((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  const activos = todos.filter((e) => e.activo)
  const desactivados = todos.filter((e) => !e.activo)
  const q = quitarTildes(buscar.trim().toLocaleLowerCase('es-CL'))
  const lista = (filtro === 'activos' ? activos : desactivados).filter((e) => !q || quitarTildes(e.nombre.toLocaleLowerCase('es-CL')).includes(q))
  const hoy = inicioDia()

  return (
    <>
      <Encabezado titulo="Estudiantes" descripcion="Abre la ficha de un niño para ver su avance, escribir observaciones o ajustar sus apoyos." accion={anadir} />

      {datos && todos.length === 0 ? (
        <EstadoVacio titulo="Este curso aún no tiene estudiantes" accion={anadir}>
          Agrega a cada niño con su nombre de pila y el personaje que tocará para entrar.
        </EstadoVacio>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div role="group" aria-label="Mostrar" className="inline-flex rounded-lg border border-borde bg-white p-0.5">
              {(['activos', 'desactivados'] as Filtro[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filtro === f}
                  onClick={() => setFiltro(f)}
                  className={`min-h-9 rounded-md px-3 text-sm font-medium ${filtro === f ? 'bg-menta-fondo text-menta-oscuro' : 'text-tinta-suave hover:text-tinta'}`}
                >
                  {f === 'activos' ? 'Activos' : 'Desactivados'} ({f === 'activos' ? activos.length : desactivados.length})
                </button>
              ))}
            </div>
            <label className="relative w-full max-w-xs">
              <span className="sr-only">Buscar estudiante</span>
              <Icono nombre="buscar" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tinta-suave" />
              <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre" className={`${claseEntrada} pl-9`} />
            </label>
          </div>

          {!datos ? (
            <p className="text-tinta-suave">Cargando estudiantes…</p>
          ) : lista.length === 0 ? (
            <p className="rounded-xl border border-borde bg-white px-4 py-8 text-center text-tinta-suave">
              {q ? `Ningún estudiante coincide con «${buscar.trim()}».` : filtro === 'desactivados' ? 'No hay perfiles desactivados.' : 'No hay estudiantes activos.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-borde bg-white">
              <table className="w-full min-w-[38rem] text-left text-sm">
                <thead className="border-b border-borde text-tinta-suave">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Estudiante
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Sala ahora
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Cómo llegó la última vez
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      Partidas esta semana
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {lista.map((e) => {
                    const salaId = datos.miembros.find((m) => m.estudianteId === e.id)?.salaId
                    const sala = datos.salas.find((s) => s.id === salaId)
                    const emocion = datos.emociones.find((x) => x.estudianteId === e.id)
                    const partidas = datos.semana.filter((r) => r.estudianteId === e.id).length
                    return (
                      <tr key={e.id} className="hover:bg-lienzo/60">
                        <td className="px-4 py-2.5">
                          <Link to={`/docente/estudiantes/${e.id}`} className="flex items-center gap-3 font-semibold text-tinta underline-offset-2 hover:underline">
                            <Avatar estudiante={e} className={`size-8 ${e.activo ? '' : 'opacity-60'}`} />
                            {e.nombre}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-tinta-suave">{sala?.nombre ?? 'Sin sala'}</td>
                        <td className="px-4 py-2.5">
                          {emocion ? (
                            <span className="flex items-center gap-2">
                              <span aria-hidden="true">{EMOCIONES[emocion.emocion].cara}</span>
                              <span className="text-tinta">{capitalizar(CON_EMOCION[emocion.emocion])}</span>
                              <span className="text-tinta-suave">{new Date(emocion.fecha) >= hoy ? 'hoy' : fechaCorta(emocion.fecha)}</span>
                            </span>
                          ) : (
                            <span className="text-tinta-suave">Sin registro</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-tinta tabular-nums">{partidas}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}
