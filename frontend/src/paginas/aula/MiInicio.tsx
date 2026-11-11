import { Navigate } from 'react-router-dom'
import type { ActividadRecreo } from '../../dominio/tipos.ts'
import { useNino } from '../../ui/nino.tsx'
import Dibujo from './Dibujo.tsx'
import Espera from './Espera.tsx'
import Playground from './Playground.tsx'
import Secuencia, { Juegos } from './Secuencia.tsx'

// Inicio del niño: lo que ve depende solo de dónde lo puso la docente.
//   Sin sala → sala de espera (globos y tienda).
//   Trabajo  → los contenidos del plan, en orden; al terminar pasa a la sala conectada.
//   Recreo   → la actividad que eligió la docente (ver Recreo, abajo).
// Antes de todo, al abrir su perfil, dice cómo se siente (RF-14).
export default function MiInicio() {
  const { estado, emocion } = useNino()
  const { sala } = estado

  if (!emocion) return <Navigate to="emocion" replace />

  // La clave cambia con la sala: al pasar de una a otra la vista entra animada.
  return (
    <div key={sala ? `${sala.id}-${sala.asignacion}-${sala.tipo === 'recreo' ? sala.actividad : ''}` : 'espera'} className="animate-pantalla h-full">
      {!sala ? (
        <Espera />
      ) : sala.tipo === 'recreo' ? (
        <Recreo actividad={sala.actividad} juegos={sala.juegos} />
      ) : (
        // Un plan nuevo (otra asignación) parte de cero.
        <Secuencia sala={sala} />
      )}
    </div>
  )
}

function Recreo({ actividad, juegos }: { actividad: ActividadRecreo; juegos: string[] }) {
  if (actividad === 'dibujo') return <Dibujo />
  if (actividad === 'globos') return <Espera recreo />
  if (actividad === 'juegos') return <Juegos ids={juegos} />
  return <Playground />
}
