import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { repo } from '../../datos/index.ts'
import type { Estudiante, ResultadoActividad } from '../../dominio/tipos.ts'
import { EMOCIONES, UMBRAL_LE_CUESTA, avancePorItem, fechaCorta, inicioDia, inicioSemana, minutos, porCategoria } from '../../lib/avance.ts'
import { CON_EMOCION } from '../../lib/clase.ts'
import { capitalizar } from '../../lib/texto.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { Icono } from '../../ui/Icono.tsx'
import { Aviso, AvisoError, Boton, Encabezado, Tarjeta } from '../../ui/aula.tsx'
import { BotonInforme } from './BotonInforme.tsx'
import { DetalleItem } from './DetalleItem.tsx'

// RF-17: la semana del curso. Primero lo que más les cuesta (lo que sirve para
// decidir el plan), después la participación de cada niño.
export default function AvanceCurso() {
  const { cursoId, cursos } = useSesion()
  const [generando, setGenerando] = useState(false)
  const [falloPdf, setFalloPdf] = useState(false)
  const { datos, error, recargar } = useConsulta(async () => {
    const [estudiantes, semana, emociones] = await Promise.all([
      repo.listarEstudiantes(cursoId),
      repo.listarResultados({ cursoId, desde: inicioSemana() }),
      repo.ultimasEmociones(cursoId),
    ])
    const activos = estudiantes.filter((e) => e.activo).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    const ids = new Set(activos.map((e) => e.id))
    return {
      estudiantes: activos,
      semana: semana.filter((r) => ids.has(r.estudianteId)),
      emocionDe: new Map(emociones.map((e) => [e.estudianteId, e.emocion])),
      fechaEmocion: new Map(emociones.map((e) => [e.estudianteId, e.fecha])),
    }
  }, [cursoId])

  const descargar = async () => {
    if (!datos) return
    setGenerando(true)
    setFalloPdf(false)
    try {
      const { descargarAvancePdf } = await import('../../lib/pdfAvance.ts')
      await descargarAvancePdf({ curso: cursos?.find((c) => c.id === cursoId)?.nombre ?? 'Curso', estudiantes: datos.estudiantes, semana: datos.semana, emocionDe: datos.emocionDe })
    } catch (e) {
      console.warn('[pdf] No se pudo generar.', e)
      setFalloPdf(true)
    }
    setGenerando(false)
  }

  if (error && !datos) return <AvisoError alReintentar={recargar} />
  const hoy = inicioDia()

  return (
    <>
      <Encabezado
        titulo="Avance"
        descripcion="La semana del curso, desde el lunes. El informe de cada niño incluye todo su historial."
        accion={
          <Boton variante="secundario" disabled={!datos || generando} onClick={() => void descargar()}>
            <Icono nombre="descargar" className="size-4" /> {generando ? 'Generando…' : 'PDF del curso'}
          </Boton>
        }
      />
      {falloPdf && (
        <Aviso tono="peligro" className="mb-4">
          No se pudo generar el PDF. Intenta otra vez.
        </Aviso>
      )}
      {!datos ? (
        <p className="text-tinta-suave">Cargando el avance…</p>
      ) : (
        <div className="grid gap-5">
          <LeCuesta semana={datos.semana} estudiantes={datos.estudiantes} />

          <section aria-labelledby="titulo-semana">
            <h2 id="titulo-semana" className="mb-3 text-lg font-semibold text-tinta">
              Cada niño esta semana
            </h2>
            <div className="overflow-x-auto rounded-xl border border-borde bg-white">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="border-b border-borde text-tinta-suave">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Estudiante
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      Partidas
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      Minutos
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      Estrellas promedio
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Cómo llegó la última vez
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      <span className="sr-only">Informe</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {datos.estudiantes.map((e) => {
                    const propias = datos.semana.filter((r) => r.estudianteId === e.id)
                    const prom = propias.length ? propias.reduce((s, r) => s + r.estrellas, 0) / propias.length : 0
                    const emocion = datos.emocionDe.get(e.id)
                    const fecha = datos.fechaEmocion.get(e.id)
                    return (
                      <tr key={e.id} className="hover:bg-lienzo/60">
                        <th scope="row" className="px-4 py-2 font-normal">
                          <Link to={`/docente/estudiantes/${e.id}`} className="flex items-center gap-3 font-semibold text-tinta underline-offset-2 hover:underline">
                            <Avatar estudiante={e} className="size-8" />
                            {e.nombre}
                          </Link>
                        </th>
                        <td className={`px-4 py-2 text-right tabular-nums ${propias.length ? 'text-tinta' : 'text-atencion'}`}>{propias.length}</td>
                        <td className="px-4 py-2 text-right text-tinta tabular-nums">{propias.length ? minutos(propias.reduce((s, r) => s + r.duracionMs, 0)) : 0}</td>
                        <td className="px-4 py-2 text-right text-tinta tabular-nums">{propias.length ? prom.toFixed(1) : <span aria-label="Sin partidas">—</span>}</td>
                        <td className="px-4 py-2">
                          {emocion ? (
                            <span className="flex items-center gap-2">
                              <span aria-hidden="true">{EMOCIONES[emocion].cara}</span>
                              <span className="text-tinta">{capitalizar(CON_EMOCION[emocion])}</span>
                              {fecha && <span className="text-tinta-suave">{new Date(fecha) >= hoy ? 'hoy' : fechaCorta(fecha)}</span>}
                            </span>
                          ) : (
                            <span className="text-tinta-suave">Sin registro</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <BotonInforme estudiante={e} compacto />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

// Lo que más le cuesta al curso esta semana: menos del 60 % al primer intento,
// por categoría. Al tocar uno se ve con qué se confunden y a qué niños les cuesta.
function LeCuesta({ semana, estudiantes }: { semana: ResultadoActividad[]; estudiantes: Estudiante[] }) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const grupos = porCategoria(avancePorItem(semana).filter((a) => a.tasa < UMBRAL_LE_CUESTA))

  return (
    <Tarjeta>
      <h2 className="text-lg font-semibold text-tinta">Lo que más les cuesta esta semana</h2>
      <p className="mb-4 text-sm text-tinta-suave">Menos del 60 % de rondas logradas al primer intento. Toca uno para ver con qué se confunden y a quiénes les cuesta.</p>
      {grupos.length === 0 && <p className="text-sm text-tinta-suave">Nada por ahora: o les va bien, o aún no hay suficientes partidas esta semana.</p>}
      <div className="grid grid-cols-[minmax(4.5rem,max-content)_minmax(4rem,1fr)_auto] gap-x-3 gap-y-5">
        {grupos.map((g) => (
          <section key={g.categoria} aria-labelledby={`cuesta-${g.categoria}`} className="col-span-3 grid grid-cols-subgrid gap-y-2">
            <h3 id={`cuesta-${g.categoria}`} className="col-span-3 text-[13px] font-medium text-tinta-suave">
              {g.titulo}
            </h3>
            <ul className="col-span-3 grid grid-cols-subgrid items-center gap-y-2">
              {g.items.map((a) => {
                const clave = `${a.categoria}|${a.item}`
                const activo = abierto === clave
                return (
                  <li key={clave} className="col-span-3 grid grid-cols-subgrid items-center gap-y-2">
                    <button
                      type="button"
                      aria-expanded={activo}
                      onClick={() => setAbierto(activo ? null : clave)}
                      className={`max-w-40 rounded text-left font-escolar font-bold break-words text-tinta underline decoration-borde decoration-2 underline-offset-4 hover:decoration-menta-oscuro ${a.item.length > 3 ? 'text-base leading-tight' : 'text-xl'}`}
                    >
                      {capitalizar(a.item)}
                    </button>
                    <span aria-hidden="true" className="block h-2 rounded-r bg-atencion-fondo">
                      {a.tasa > 0 && <span className="block h-full rounded-r bg-cuesta" style={{ width: `${a.tasa * 100}%` }} />}
                    </span>
                    <span className="flex items-center gap-2 text-sm whitespace-nowrap">
                      <span className="text-tinta tabular-nums">{Math.round(a.tasa * 100)}%</span>
                      <span className="text-tinta-suave">de {a.rondas} rondas</span>
                    </span>
                    {activo && (
                      <div className="col-span-3">
                        <DetalleItem resultados={semana} item={a} estudiantes={estudiantes} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </Tarjeta>
  )
}
