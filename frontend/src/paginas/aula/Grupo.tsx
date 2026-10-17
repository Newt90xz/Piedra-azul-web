import { Navigate, useParams } from 'react-router-dom'
import { ACTIVIDADES, GRUPOS } from '../../contenido/actividades.ts'
import { EnlaceNino, useNino } from '../../ui/nino.tsx'

export default function Grupo() {
  const { grupo = '' } = useParams()
  const { estudiante } = useNino()
  const g = GRUPOS.find((x) => String(x.id) === grupo)
  if (!g || (typeof g.id === 'number' && g.id > estudiante.nivelHabilitado)) return <Navigate to={`/aula/${estudiante.id}`} replace />
  const lista = ACTIVIDADES.filter((a) => a.grupo === g.id)

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-8 flex items-center justify-center gap-3 text-[1.2em] font-bold">
        <span aria-hidden="true">{g.icono}</span> {g.titulo}
      </h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((a) => (
          <EnlaceNino key={a.id} to={`/aula/${estudiante.id}/jugar/${a.id}`} voz={a.titulo} className="p-6 text-center">
            <span aria-hidden="true" className="mb-3 grid aspect-[4/3] place-items-center rounded-2xl text-[2.6em]" style={{ background: g.color }}>
              {a.icono}
            </span>
            <span className="block text-[0.75em] leading-tight font-bold">{a.titulo}</span>
          </EnlaceNino>
        ))}
      </div>
    </main>
  )
}
