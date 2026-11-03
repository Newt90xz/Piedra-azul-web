import { useState } from 'react'
import { ALFABETO } from '../../contenido/banco.ts'
import { PLANTILLAS_SISTEMA, TODAS_LAS_LETRAS, VOCALES_ALFABETO, juegoConfigurable, letrasDe } from '../../contenido/plantillas.ts'
import { repo } from '../../datos/index.ts'
import type { PasoSala, PlantillaActividad } from '../../dominio/tipos.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Icono } from '../../ui/Icono.tsx'
import { Boton, claseEntrada } from '../../ui/aula.tsx'

// Configura una actividad antes de ponerla en el plan: qué letras entran. Lo
// elegido se puede guardar como plantilla para reutilizarlo en otras salas. El
// plan guarda una copia: editar la plantilla no le cambia la actividad a nadie.
export function ConfigurarActividad({ juegoId, inicial, alListo, alCancelar }: { juegoId: string; inicial?: PasoSala; alListo: (p: PasoSala) => void; alCancelar: () => void }) {
  const juego = juegoConfigurable(juegoId)!
  const [letras, setLetras] = useState(() => letrasDe(inicial?.parametros ?? juego.porDefecto))
  const [nombre, setNombre] = useState(inicial?.titulo ?? '')
  const [aviso, setAviso] = useState<{ error: boolean; texto: string } | null>(null)
  const { datos: propias, recargar } = useConsulta(() => repo.listarPlantillas(), [])

  const plantillas = [...PLANTILLAS_SISTEMA, ...(propias ?? [])].filter((p) => p.juegoId === juegoId)
  const parametros = { letras }
  const problema = juego.validar(parametros)

  const usar = (p: PlantillaActividad) => {
    setLetras(letrasDe(p.parametros))
    setNombre(p.nombre)
    setAviso(null)
  }

  const guardar = async () => {
    try {
      await repo.guardarPlantilla({ nombre: nombre.trim(), juegoId, parametros })
      setAviso({ error: false, texto: `Plantilla «${nombre.trim()}» guardada.` })
      recargar()
    } catch (e) {
      const texto = e instanceof Error ? e.message : ''
      setAviso({ error: true, texto: texto.includes('duplicate') ? 'Ya tienes una plantilla con ese nombre.' : texto || 'No se pudo guardar la plantilla.' })
    }
  }

  const borrar = async (p: PlantillaActividad) => {
    try {
      await repo.eliminarPlantilla(p.id)
      recargar()
    } catch {
      setAviso({ error: true, texto: 'No se pudo borrar la plantilla.' })
    }
  }

  const alternar = (id: string) => setLetras((x) => (x.includes(id) ? x.filter((l) => l !== id) : [...x, id]))

  return (
    <section aria-label={`Configurar ${juego.titulo}`} className="grid gap-4 rounded-2xl border-2 border-menta bg-menta-fondo/40 p-4">
      <div>
        <h3 className="flex items-center gap-2 font-bold text-tinta">
          <span aria-hidden="true">{juego.icono}</span> {juego.titulo}
        </h3>
        <p className="text-sm text-tinta-suave">{juego.descripcion}</p>
      </div>

      <div>
        <h4 className="mb-1.5 text-xs font-bold text-tinta-suave">Plantillas</h4>
        <ul className="flex flex-wrap gap-1.5">
          {plantillas.map((p) => (
            <li key={p.id} className="flex items-center rounded-full border border-borde bg-white text-sm font-semibold text-tinta">
              <button type="button" onClick={() => usar(p)} className="rounded-full px-3 py-1 hover:bg-menta-fondo">
                {p.nombre}
              </button>
              {!p.sistema && (
                <button type="button" aria-label={`Borrar la plantilla ${p.nombre}`} onClick={() => void borrar(p)} className="pr-2 pl-0.5 text-tinta-suave hover:text-[#b42318]">
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs font-bold text-tinta-suave">
          Letras que aparecen ({letras.length} de {ALFABETO.length})
        </legend>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Boton variante="suave" onClick={() => setLetras(TODAS_LAS_LETRAS)}>Todas</Boton>
          <Boton variante="suave" onClick={() => setLetras(VOCALES_ALFABETO)}>Vocales</Boton>
          <Boton variante="suave" onClick={() => setLetras(TODAS_LAS_LETRAS.filter((l) => !VOCALES_ALFABETO.includes(l)))}>Consonantes</Boton>
          <Boton variante="suave" onClick={() => setLetras([])}>Ninguna</Boton>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
          {ALFABETO.map((l) => {
            const activa = letras.includes(l.id)
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={activa}
                aria-label={`Letra ${l.grafema}`}
                title={`Suena: ${l.fonema}`}
                onClick={() => alternar(l.id)}
                className={`grid h-11 place-items-center rounded-xl border-2 text-lg font-bold ${activa ? 'border-menta bg-menta text-white' : 'border-borde bg-white text-tinta-suave'}`}
              >
                {l.grafema}
              </button>
            )
          })}
        </div>
      </fieldset>

      {problema && (
        <p role="alert" className="rounded-xl bg-[#fdf1e4] px-3 py-2 text-sm font-semibold text-[#9a4d00]">
          {problema}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-48 flex-1 text-sm font-semibold text-tinta">
          <span className="sr-only">Nombre de esta configuración</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Nombre, ej.: Letras de la semana" className={claseEntrada} />
        </label>
        <Boton variante="secundario" disabled={!nombre.trim() || !!problema} onClick={() => void guardar()}>
          Guardar como plantilla
        </Boton>
      </div>
      {aviso && (
        <p role="status" className={`text-sm font-semibold ${aviso.error ? 'text-[#b42318]' : 'text-menta-oscuro'}`}>
          {aviso.texto}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Boton disabled={!!problema} onClick={() => alListo({ juego: juegoId, parametros, titulo: nombre.trim() || undefined })}>
          <Icono nombre="check" /> {inicial ? 'Actualizar en el plan' : 'Agregar al plan'}
        </Boton>
        <Boton variante="suave" onClick={alCancelar}>
          Cancelar
        </Boton>
      </div>
    </section>
  )
}
