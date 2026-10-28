import { useState } from 'react'
import { useSesion } from '../../app/Sesion.tsx'
import { repo } from '../../datos/index.ts'
import type { Estudiante } from '../../dominio/tipos.ts'
import { Icono } from '../../ui/Icono.tsx'

// Descarga el informe de avance de un estudiante en PDF (todo su historial:
// emociones, avance por letra/sílaba/palabra, últimas partidas y observaciones).
export function BotonInforme({ estudiante, compacto = false }: { estudiante: Estudiante; compacto?: boolean }) {
  const { cursos } = useSesion()
  const [estado, setEstado] = useState<'listo' | 'generando' | 'fallo'>('listo')

  const descargar = async () => {
    setEstado('generando')
    try {
      const [resultados, emociones, observaciones, { descargarEstudiantePdf }] = await Promise.all([
        repo.listarResultados({ estudianteId: estudiante.id }),
        repo.listarEmociones(estudiante.id),
        repo.listarObservaciones(estudiante.id),
        import('../../lib/pdfAvance.ts'),
      ])
      const curso = cursos?.find((c) => c.id === estudiante.cursoId)?.nombre ?? 'Curso'
      await descargarEstudiantePdf({ curso, estudiante, resultados, emociones, observaciones })
      setEstado('listo')
    } catch (e) {
      console.warn('[pdf] No se pudo generar el informe.', e)
      setEstado('fallo')
    }
  }

  const texto = estado === 'generando' ? 'Generando…' : estado === 'fallo' ? 'Reintentar' : compacto ? 'PDF' : 'Informe PDF'
  return (
    <button
      type="button"
      onClick={() => void descargar()}
      disabled={estado === 'generando'}
      aria-label={`Descargar el informe de ${estudiante.nombre} en PDF`}
      title={estado === 'fallo' ? 'No se pudo generar el informe. Toca para reintentar.' : `Informe de avance de ${estudiante.nombre}`}
      className={`inline-flex items-center gap-1.5 rounded-xl font-semibold transition-colors disabled:opacity-60 ${
        compacto ? 'px-2.5 py-1.5 text-sm' : 'px-4 py-2.5 text-sm'
      } ${estado === 'fallo' ? 'bg-red-50 text-red-800' : 'bg-celeste-fondo text-marino hover:bg-[#d5e7f7]'}`}
    >
      <Icono nombre="descargar" className="size-4" />
      {texto}
    </button>
  )
}
