import { personajePorDefecto } from '../contenido/personaje.ts'
import type { Estudiante } from '../dominio/tipos.ts'
import { DibujoPersonaje } from './Personaje.tsx'

type ConAvatar = Pick<Estudiante, 'color' | 'nombre'> & Partial<Pick<Estudiante, 'fotoUrl' | 'personaje'>>

export function Avatar({ estudiante, className = '' }: { estudiante: ConAvatar; className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-[30%] ${className}`}
      style={{ background: estudiante.color }}
      aria-hidden="true"
    >
      {estudiante.fotoUrl ? (
        <img src={estudiante.fotoUrl} alt="" className="size-full object-cover" />
      ) : (
        <DibujoPersonaje personaje={estudiante.personaje ?? personajePorDefecto(estudiante.nombre)} color={estudiante.color} vista="busto" className="size-full" />
      )}
    </span>
  )
}
