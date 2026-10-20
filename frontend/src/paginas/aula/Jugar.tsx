import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { LectorCancion, LectorCuento } from '../../actividades/Lectura.tsx'
import { Partida } from '../../actividades/Partida.tsx'
import { CANCION_RATON, CUENTO_TITO, actividad } from '../../contenido/actividades.ts'
import { useNino } from '../../ui/nino.tsx'

export default function Jugar() {
  const { actividadId = '' } = useParams()
  return <JugarActividad key={actividadId} actividadId={actividadId} />
}

function JugarActividad({ actividadId }: { actividadId: string }) {
  const { estudiante } = useNino()
  const a = actividad(actividadId)
  const [partida, setPartida] = useState(() => ({ numero: 0, rondas: a?.generar() ?? [] }))
  const [leyendo, setLeyendo] = useState(actividadId === CUENTO_TITO.id)

  if (!a || (typeof a.grupo === 'number' && a.grupo > estudiante.nivelHabilitado)) return <Navigate to={`/aula/${estudiante.id}`} replace />
  if (a.id === CANCION_RATON.id) return <LectorCancion versos={CANCION_RATON.versos} />
  if (leyendo) return <LectorCuento cuento={CUENTO_TITO} alTerminar={() => setLeyendo(false)} />

  return (
    <Partida
      key={partida.numero}
      actividadId={a.id}
      rondas={partida.rondas}
      alReiniciar={() => setPartida({ numero: partida.numero + 1, rondas: a.generar() })}
    />
  )
}
