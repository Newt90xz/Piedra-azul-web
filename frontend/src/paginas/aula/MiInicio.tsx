import { Navigate } from 'react-router-dom'
import { useNino } from '../../ui/nino.tsx'
import Dibujo from './Dibujo.tsx'
import Espera from './Espera.tsx'
import Playground from './Playground.tsx'
import Secuencia from './Secuencia.tsx'

// Inicio del niño: lo que ve depende solo de dónde lo puso la docente.
//   Sin sala   → sala de espera (globos y tienda).
//   Trabajo    → los contenidos del plan, en orden, y luego los juegos.
//   Playground → espacio común con mensajes de pictogramas.
//   Dibujo     → hoja para dibujar libre o repasar letras.
// Antes de todo, al abrir su perfil, dice cómo se siente (RF-14).
export default function MiInicio() {
  const { estado, emocion } = useNino()
  const { sala } = estado

  if (!emocion) return <Navigate to="emocion" replace />

  // La clave cambia con la sala: al pasar de una a otra la vista entra animada.
  return (
    <div key={sala ? `${sala.id}-${sala.asignacion}` : 'espera'} className="animate-pantalla h-full">
      {!sala ? (
        <Espera />
      ) : sala.tipo === 'playground' ? (
        <Playground />
      ) : sala.tipo === 'dibujo' ? (
        <Dibujo />
      ) : (
        // Un plan nuevo (otra asignación) parte de cero.
        <Secuencia sala={sala} />
      )}
    </div>
  )
}
