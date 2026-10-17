import { Link } from 'react-router-dom'
import { useSesion } from '../../app/Sesion.tsx'
import { repo } from '../../datos/index.ts'
import { EMOCIONES, deEstaSemana, minutos } from '../../lib/avance.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Avatar } from '../../ui/Avatar.tsx'
import { AvisoError, Encabezado, Tarjeta } from '../../ui/aula.tsx'

// RF-17: participación semanal del curso en una sola vista.
export default function AvanceCurso() {
  const { cursoId } = useSesion()
  const { datos, error, recargar } = useConsulta(async () => {
    const estudiantes = await repo.listarEstudiantes(cursoId)
    const resultados = await repo.listarResultados({ cursoId })
    const emociones = await Promise.all(estudiantes.map((e) => repo.listarEmociones(e.id)))
    return { estudiantes, resultados, emociones }
  }, [cursoId])

  const semana = deEstaSemana(datos?.resultados ?? [])

  return (
    <>
      <Encabezado antetitulo="Seguimiento" titulo="Avance del curso" descripcion="Participación de esta semana (desde el lunes) y última emoción registrada." />
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
            </tr>
          </thead>
          <tbody>
            {datos?.estudiantes.map((e, i) => {
              const propias = semana.filter((r) => r.estudianteId === e.id)
              const prom = propias.length ? propias.reduce((s, r) => s + r.estrellas, 0) / propias.length : 0
              const emocion = datos.emociones[i][0]
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
                      <span className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-sm" style={{ background: EMOCIONES[emocion.emocion].color }}>
                        <span aria-hidden="true">{EMOCIONES[emocion.emocion].cara}</span>
                        {EMOCIONES[emocion.emocion].texto}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Tarjeta>
    </>
  )
}
