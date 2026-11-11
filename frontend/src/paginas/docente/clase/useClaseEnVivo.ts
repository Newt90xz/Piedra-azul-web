import { useCallback, useEffect, useState } from 'react'
import { useSesion } from '../../../app/Sesion.tsx'
import { repo } from '../../../datos/index.ts'
import { inicioDia, inicioSemana } from '../../../lib/avance.ts'
import { SIN_SALA, cambiosEntre, resumenSemana, salaSegunServidor, type DatosClase } from '../../../lib/clase.ts'
import { useConsulta } from '../../../lib/useConsulta.ts'

// Si el servidor nunca confirma un movimiento, el aviso «Moviendo…» se quita igual.
const OLVIDAR_PENDIENTE_MS = 20_000

// Lo que pasa en la clase: solo lo de hoy y la última emoción de cada niño
// (no el historial completo), porque se consulta cada pocos segundos.
export async function cargarClase(cursoId: string): Promise<DatosClase> {
  const hoy = inicioDia()
  const [salas, miembros, estudiantes, resultadosHoy, emociones, conectados, progreso] = await Promise.all([
    repo.listarSalas(cursoId),
    repo.listarMiembros(cursoId),
    repo.listarEstudiantes(cursoId),
    repo.listarResultados({ cursoId, desde: hoy }),
    repo.ultimasEmociones(cursoId),
    repo.listarConectados(cursoId),
    repo.listarProgreso(cursoId),
  ])
  return {
    salas,
    miembros,
    estudiantes: estudiantes.filter((e) => e.activo),
    resultadosHoy,
    // Solo la emoción con que llegó hoy: la de otro día ya no dice nada de la clase.
    emocionDe: new Map(emociones.filter((e) => new Date(e.fecha) >= hoy).map((e) => [e.estudianteId, e.emocion])),
    conectados: new Map(conectados.map((c) => [c.estudianteId, c])),
    progresoDe: new Map(progreso.map((p) => [p.estudianteId, p])),
  }
}

// La clase en vivo, consultada cada `cadaMs` mientras la pestaña está a la
// vista, y los movimientos de niños entre salas: el niño aparece al instante en
// su destino («Moviendo…») hasta que el servidor lo confirma; si falla, vuelve.
export function useClaseEnVivo(cadaMs = 5000) {
  const { cursoId } = useSesion()
  const { datos, error, recargar } = useConsulta(() => cargarClase(cursoId), [cursoId])
  const [accionError, setAccionError] = useState<string | null>(null)
  // Movimientos pedidos: estudianteId → sala de destino.
  const [pedidos, setPedidos] = useState<Record<string, string>>({})

  useEffect(() => {
    const siVisible = () => document.visibilityState === 'visible' && recargar()
    const t = window.setInterval(siVisible, cadaMs)
    document.addEventListener('visibilitychange', siVisible)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', siVisible)
    }
  }, [recargar, cadaMs])

  const ejecutar = useCallback(
    async (accion: () => Promise<unknown>) => {
      setAccionError(null)
      try {
        await accion()
      } catch (e) {
        setAccionError(e instanceof Error ? e.message : 'No se pudo completar la acción.')
      }
      recargar()
    },
    [recargar],
  )

  const enServidor = (id: string) => (datos ? salaSegunServidor(datos, id) : SIN_SALA)
  // Un pedido deja de estar pendiente en cuanto los datos del servidor lo muestran hecho.
  const pendiente = (id: string) => (id in pedidos && enServidor(id) !== pedidos[id] ? pedidos[id] : undefined)
  const salaDe = (id: string) => pendiente(id) ?? enServidor(id)

  const quitarPedido = (id: string, destino: string) =>
    setPedidos((p) => {
      if (p[id] !== destino) return p
      const resto = { ...p }
      delete resto[id]
      return resto
    })

  const mover = (estudianteId: string, destino: string) => {
    if (salaDe(estudianteId) === destino) return
    setAccionError(null)
    setPedidos((p) => ({ ...p, [estudianteId]: destino }))
    const accion = destino === SIN_SALA ? repo.desconectarEstudiante(estudianteId) : repo.conectarEstudiante(destino, estudianteId)
    accion.then(
      () => {
        recargar()
        window.setTimeout(() => quitarPedido(estudianteId, destino), OLVIDAR_PENDIENTE_MS)
      },
      (e: unknown) => {
        quitarPedido(estudianteId, destino)
        setAccionError(e instanceof Error ? e.message : 'No se pudo mover al niño.')
        recargar()
      },
    )
  }

  return { datos, error, recargar, accionError, ejecutar, pendiente, salaDe, mover }
}

// El resumen de la semana. Lo de antes de hoy se carga una vez; lo de hoy llega
// con la clase en vivo, así el resumen se mueve mientras juegan sin volver a
// pedir la semana entera cada 5 segundos.
export function useSemana(datos: DatosClase | undefined) {
  const { cursoId } = useSesion()
  const { datos: semana, error } = useConsulta(() => repo.listarResultados({ cursoId, desde: inicioSemana() }), [cursoId])
  if (!datos || !semana) return { resumen: undefined, error }
  const hoy = inicioDia()
  return { resumen: resumenSemana(datos.estudiantes, [...semana.filter((r) => new Date(r.fecha) < hoy), ...datos.resultadosHoy]), error }
}

// Lo que cambió con el último refresco, en una frase para el lector de
// pantalla. Compara los datos del servidor (no los movimientos optimistas).
export function useAnuncioCambios(datos: DatosClase | undefined) {
  const [anuncio, setAnuncio] = useState('')
  // Los datos ya comparados: al llegar otros se compara durante el render, sin efecto.
  const [vistos, setVistos] = useState(datos)
  if (datos !== vistos) {
    setVistos(datos)
    const frase = datos && vistos ? cambiosEntre(vistos, datos) : ''
    if (frase) setAnuncio(frase)
  }
  return anuncio
}
