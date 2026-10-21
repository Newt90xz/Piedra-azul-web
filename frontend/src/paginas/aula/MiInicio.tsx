import { useNino } from '../../ui/nino.tsx'
import Espera from './Espera.tsx'
import Playground from './Playground.tsx'
import Secuencia from './Secuencia.tsx'

// Inicio del niño: lo que ve depende solo de dónde lo puso la docente.
//   Sin sala   → sala de espera (globos y tienda).
//   Trabajo    → los contenidos del plan, en orden, y luego los juegos.
//   Playground → espacio común con mensajes de pictogramas.
export default function MiInicio() {
  const { estado } = useNino()
  const { sala } = estado

  if (!sala) return <Espera />
  if (sala.tipo === 'playground') return <Playground key={sala.id} />
  // Un plan nuevo (otra asignación) parte de cero.
  return <Secuencia key={`${sala.id}-${sala.asignacion}`} sala={sala} />
}
