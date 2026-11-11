import { useState, type FormEvent } from 'react'
import { useSesion } from '../../app/Sesion.tsx'
import { confirmarSalida } from '../../lib/cambiosSinGuardar.ts'
import { repo } from '../../datos/index.ts'
import type { Curso } from '../../dominio/tipos.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import { Icono } from '../../ui/Icono.tsx'
import { Aviso, Boton, Campo, Dialogo, MenuAcciones, claseEntrada } from '../../ui/aula.tsx'

// Cursos habituales del liceo: se sugieren los que la docente aún no tiene.
const SUGERIDOS = ['Pre-Kínder A', 'Kínder A', 'Pre-Kínder B', 'Kínder B']
const comparable = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()
// «Pre-Kínder A» → «PA»: lo que cabe en la barra angosta.
const iniciales = (s: string) =>
  s
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

// El curso con el que se trabaja, arriba de la barra lateral: cambiar de curso,
// crear uno o eliminar el actual (lo raro, dentro del menú y no a la vista).
export function MenuCurso() {
  const { cursos, cursoId, elegirCurso } = useSesion()
  const [dialogo, setDialogo] = useState<'nuevo' | 'eliminar' | null>(null)
  if (!cursos?.length) return null
  const actual = cursos.find((c) => c.id === cursoId)

  return (
    <>
      <MenuAcciones
        etiqueta="Curso"
        alinear="izquierda"
        claseBoton="flex min-h-11 w-full items-center gap-2 rounded-lg border border-white/20 bg-white/8 px-2.5 text-left text-sm font-semibold text-white hover:bg-white/15"
        opciones={[
          ...cursos.map((c) => ({ texto: c.nombre, marcada: c.id === cursoId, alElegir: () => confirmarSalida() && elegirCurso(c.id) })),
          'separador' as const,
          { texto: 'Nuevo curso…', alElegir: () => setDialogo('nuevo') },
          ...(actual ? [{ texto: `Eliminar «${actual.nombre}»…`, peligro: true, alElegir: () => setDialogo('eliminar') }] : []),
        ]}
      >
        <span className="sr-only">Curso actual: </span>
        <span className="min-w-0 flex-1 truncate max-lg:hidden">{actual?.nombre ?? 'Elegir curso'}</span>
        <span aria-hidden="true" className="flex-1 text-center lg:hidden">
          {iniciales(actual?.nombre ?? '?')}
        </span>
        <Icono nombre="abajo" className="size-4 shrink-0 text-white/70 max-lg:hidden" />
      </MenuAcciones>
      {dialogo === 'nuevo' && <NuevoCurso cursos={cursos} alCerrar={() => setDialogo(null)} />}
      {dialogo === 'eliminar' && actual && <EliminarCurso curso={actual} alCerrar={() => setDialogo(null)} />}
    </>
  )
}

function NuevoCurso({ cursos, alCerrar }: { cursos: Curso[]; alCerrar: () => void }) {
  const { crearCurso } = useSesion()
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const existe = (n: string) => cursos.some((c) => comparable(c.nombre) === comparable(n))
  const sugeridos = SUGERIDOS.filter((n) => !existe(n)).slice(0, 3)

  const crear = async (n: string) => {
    const limpio = n.trim()
    if (!limpio) return
    if (existe(limpio)) return setError('Ya tienes un curso con ese nombre.')
    setEnviando(true)
    setError(null)
    try {
      await crearCurso(limpio)
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el curso.')
      setEnviando(false)
    }
  }

  return (
    <Dialogo titulo="Nuevo curso" alCerrar={() => !enviando && alCerrar()}>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          void crear(nombre)
        }}
        noValidate
        className="grid gap-4"
      >
        <Campo etiqueta="Nombre del curso">
          <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder="Por ejemplo: Kínder B" className={claseEntrada} />
        </Campo>
        {sugeridos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-tinta-suave">O elige uno:</span>
            {sugeridos.map((n) => (
              <Boton key={n} variante="secundario" disabled={enviando} onClick={() => void crear(n)}>
                {n}
              </Boton>
            ))}
          </div>
        )}
        {error && <Aviso tono="peligro">{error}</Aviso>}
        <div className="flex justify-end gap-2">
          <Boton variante="suave" disabled={enviando} onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={!nombre.trim() || enviando}>
            {enviando ? 'Creando…' : 'Crear curso'}
          </Boton>
        </div>
      </form>
    </Dialogo>
  )
}

// Borrar un curso. Si tiene estudiantes, también se borran ellos y su
// historial: hay que escribir el nombre del curso para confirmarlo.
function EliminarCurso({ curso, alCerrar }: { curso: Curso; alCerrar: () => void }) {
  const { eliminarCurso } = useSesion()
  const { datos: estudiantes, error: errorCarga } = useConsulta(() => repo.listarEstudiantes(curso.id), [curso.id])
  const [escrito, setEscrito] = useState('')
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const n = estudiantes?.length ?? 0
  const confirmado = n === 0 || escrito.trim().toLowerCase() === curso.nombre.trim().toLowerCase()

  const borrar = async () => {
    setBorrando(true)
    setError(null)
    try {
      await eliminarCurso(curso.id)
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el curso.')
      setBorrando(false)
    }
  }

  return (
    <Dialogo titulo={`¿Eliminar «${curso.nombre}»?`} rol="alertdialog" alCerrar={() => !borrando && alCerrar()}>
      {estudiantes === undefined && !errorCarga ? (
        <p className="text-tinta-suave">Revisando el curso…</p>
      ) : errorCarga ? (
        <Aviso tono="peligro">No se pudo revisar el curso. Cierra e intenta otra vez.</Aviso>
      ) : n === 0 ? (
        <p className="text-tinta-suave">El curso no tiene estudiantes. Se borran también sus salas.</p>
      ) : (
        <>
          <p className="rounded-lg bg-peligro-fondo px-4 py-3 text-sm text-tinta">
            Se borrarán sus <b>{n === 1 ? '1 estudiante' : `${n} estudiantes`}</b> con todo su historial (partidas, emociones y observaciones) y sus salas.{' '}
            <b>No se puede deshacer.</b>
          </p>
          <Campo etiqueta={`Escribe «${curso.nombre}» para confirmar`}>
            <input value={escrito} onChange={(e) => setEscrito(e.target.value)} autoFocus className={claseEntrada} />
          </Campo>
        </>
      )}
      {error && <Aviso tono="peligro">{error}</Aviso>}
      <div className="flex justify-end gap-2">
        <Boton variante="suave" disabled={borrando} onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton variante="peligro" disabled={estudiantes === undefined || !confirmado || borrando} onClick={() => void borrar()}>
          <Icono nombre="basura" className="size-4" /> {borrando ? 'Eliminando…' : 'Eliminar curso'}
        </Boton>
      </div>
    </Dialogo>
  )
}
