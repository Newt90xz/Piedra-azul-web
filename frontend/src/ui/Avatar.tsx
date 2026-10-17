import type { Estudiante } from '../dominio/tipos.ts'

export function Avatar({ estudiante, className = '' }: { estudiante: Pick<Estudiante, 'avatar' | 'color' | 'fotoUrl' | 'nombre'>; className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-[30%] ${className}`}
      style={{ background: estudiante.color }}
      aria-hidden="true"
    >
      {estudiante.fotoUrl ? <img src={estudiante.fotoUrl} alt="" className="size-full object-cover" /> : estudiante.avatar}
    </span>
  )
}
