import { avatarTienda } from '../contenido/tienda.ts'
import type { Estudiante } from '../dominio/tipos.ts'

type ConAvatar = Pick<Estudiante, 'avatar' | 'color' | 'nombre'> & Partial<Pick<Estudiante, 'fotoUrl' | 'avatarTienda'>>

// El avatar comprado en la tienda reemplaza al que eligió la docente.
const emojiAvatar = (e: Pick<ConAvatar, 'avatar' | 'avatarTienda'>) => avatarTienda(e.avatarTienda)?.emoji ?? e.avatar

export function Avatar({ estudiante, className = '' }: { estudiante: ConAvatar; className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-[30%] ${className}`}
      style={{ background: estudiante.color }}
      aria-hidden="true"
    >
      {estudiante.fotoUrl ? <img src={estudiante.fotoUrl} alt="" className="size-full object-cover" /> : emojiAvatar(estudiante)}
    </span>
  )
}
