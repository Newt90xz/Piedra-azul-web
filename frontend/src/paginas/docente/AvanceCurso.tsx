import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { repo } from '../../datos/index.ts'
import type { Estudiante, ResultadoActividad } from '../../dominio/tipos.ts'
import { EMOCIONES, UMBRAL_LE_CUESTA, avancePorItem, inicioSemana, minutos, porCategoria } from '../../lib/avance.ts'
import { capitalizar } from '../../lib/texto.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { Icono } from '../../ui/Icono.tsx'
import { AvisoError, Boton, Encabezado, Tarjeta } from '../../ui/aula.tsx'
import { BotonInforme } from './BotonInforme.tsx'
import { DetalleItem } from './DetalleItem.tsx'

// RF-17: participación semanal del curso en una sola vista.
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
    return { estudiantes, semana, emocionDe: new Map(emociones.map((e) => [e.estudianteId, e.emocion])) }
  }, [cursoId])

  const semana = datos?.semana ?? []

  const descargar = async () => {
    if (!datos) return
    setGenerando(true)
    setFalloPdf(false)
    try {
      const { descargarAvancePdf } = await import('../../lib/pdfAvance.ts')
      await descargarAvancePdf({ curso: cursos?.find((c) => c.id === cursoId)?.nombre ?? 'Curso', ...datos })
    } catch (e) {
      console.warn('[pdf] No se pudo generar.', e)
      setFalloPdf(true)
    }
    setGenerando(false)
  }

  return (
    <>
      <Encabezado
        antetitulo="Seguimiento"
        titulo="Avance del curso"
        descripcion="Participación de esta semana (desde el lunes) y última emoción registrada. El informe de cada estudiante incluye todo su historial."
        accion={
          <Boton variante="secundario" disabled={!datos || generando} onClick={() => void descargar()}>
            <Icono nombre="descargar" /> {generando ? 'Generando…' : 'PDF del curso'}
          </Boton>
        }
      />
      {falloPdf && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          No se pudo generar el PDF. Intenta otra vez.
        </p>
      )}
      {error && <AvisoError alReintentar={recargar} />}
      <Tarjeta className={`overflow-x-auto p-0 ${error ? 'hidden' : ''}`}>
        <table className="w-full min-w-[640px] text-left">
          <thead className="border-b border-borde text-sm text-tinta-suave">
            <tr>
              <th scope="col" className="px-6 py-4 font-semibold">Estudiante</th>
              <th scope="col" className="px-4 py-4 font-semibold">Partidas</th>
              <th scope="col" className="px-4 py-4 font-semibold">Minutos</th>
              <th scope="col" className="px-4 py-4 font-semibold">Estrellas promedio</th>
              <th scope="col" className="px-4 py-4 font-semibold">Última emoción</th>
              <th scope="col" className="px-4 py-4 font-semibold">Informe</th>
            </tr>
          </thead>
          <tbody>
            {datos?.estudiantes.map((e) => {
              const propias = semana.filter((r) => r.estudianteId === e.id)
              const prom = propias.length ? propias.reduce((s, r) => s + r.estrellas, 0) / propias.length : 0
              const emocion = datos.emocionDe.get(e.id)
              return (
                <tr key={e.id} className="border-b border-borde last:border-0">
                  <th scope="row" className="px-6 py-3">
                    <Link to={`/docente/estudiantes/${e.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                      <Avatar estudiante={e} className="size-10 text-2xl" />
                      {e.nombre}
                    </Link>
                  </th>
                  <td className="px-4 py-3">{propias.length}</td>
                  <td className="px-4 py-3">{propias.length ? minutos(propias.reduce((s, r) => s + r.duracionMs, 0)) : 0}</td>
                  <td className="px-4 py-3">{propias.length ? `${prom.toFixed(1)} ★` : '—'}</td>
                  <td className="px-4 py-3">
                    {emocion ? (
                      <span className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-sm" style={{ background: EMOCIONES[emocion].color }}>
                        <span aria-hidden="true">{EMOCIONES[emocion].cara}</span>
                        {EMOCIONES[emocion].texto}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <BotonInforme estudiante={e} compacto />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Tarjeta>
      {datos && <LeCuesta semana={semana} estudiantes={datos.estudiantes} />}
    </>
  )
}

// Lo que más le cuesta al curso esta semana. Al tocar una palabra, sílaba o
// sonido se ve con qué se confunden y a qué niños les cuesta.
function LeCuesta({ semana, estudiantes }: { semana: ResultadoActividad[]; estudiantes: Estudiante[] }) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const grupos = porCategoria(avancePorItem(semana).filter((a) => a.tasa < UMBRAL_LE_CUESTA))

  return (
    <Tarjeta className="mt-6">
      <h2 className="text-lg font-bold">Lo que más le cuesta al curso</h2>
      <p className="mb-4 text-sm text-tinta-suave">Menos del 60 % al primer intento esta semana. Toca uno para ver el detalle por niño.</p>
      {grupos.length === 0 && <p className="text-tinta-suave">Nada por ahora.</p>}
      <div className="grid gap-5">
        {grupos.map((g) => (
          <section key={g.categoria} aria-label={g.titulo}>
            <h3 className="mb-2 text-sm font-bold text-tinta-suave">{g.titulo}</h3>
            <ul className="flex flex-wrap gap-2">
              {g.items.map((a) => {
                const clave = `${a.categoria}|${a.item}`
                const activo = abierto === clave
                return (
                  <li key={clave}>
                    <button
                      type="button"
                      aria-expanded={activo}
                      onClick={() => setAbierto(activo ? null : clave)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${activo ? 'border-menta bg-menta-fondo' : 'border-borde bg-white hover:border-menta'}`}
                    >
                      <b className="font-escolar text-lg">{capitalizar(a.item)}</b>
                      <span className="text-sm font-semibold text-[#9a4d00]">{Math.round(a.tasa * 100)}%</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {g.items.map(
              (a) =>
                abierto === `${a.categoria}|${a.item}` && (
                  <div key={a.item} className="mt-3">
                    <DetalleItem resultados={semana} item={a} estudiantes={estudiantes} />
                  </div>
                ),
            )}
          </section>
        ))}
      </div>
    </Tarjeta>
  )
}
