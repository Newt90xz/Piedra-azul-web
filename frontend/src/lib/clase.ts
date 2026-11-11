import type { Conectado, ProgresoSala, Sala } from '../dominio/tipos.ts'

// Lo que pasa en la clase ahora, para el panel docente (Inicio y Salas).

// Igual que la base: un dispositivo sin señales por 10 minutos se da por apagado.
export const VIGENTE_MS = 10 * 60_000
export const enLinea = (c: Conectado | undefined) => !!c && Date.now() - new Date(c.vistoEn).getTime() < VIGENTE_MS

// Avance que vale para la sala y el plan actuales; otro plan o sala parte en cero.
export function avanceEn(sala: Pick<Sala, 'id' | 'asignacion'>, p: ProgresoSala | undefined) {
  return p && p.salaId === sala.id && p.asignacion === sala.asignacion ? p : undefined
}
