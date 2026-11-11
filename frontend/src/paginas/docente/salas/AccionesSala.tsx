import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { repo } from '../../../datos/index.ts'
import type { Sala, TipoSala } from '../../../dominio/tipos.ts'
import { hariaCirculo } from '../../../lib/clase.ts'
import { capitalizar } from '../../../lib/texto.ts'
import { Aviso, Boton, Campo, Dialogo, claseEntrada } from '../../../ui/aula.tsx'
import { TIPOS } from './sala.ts'

const NUEVO_RECREO = '__nuevo-recreo'

// A dónde pasan los niños al terminar el plan. Se guarda al elegir. Lo más
// común, un recreo nuevo, se crea y conecta de una vez.
export function AlTerminar({ sala, salas, alCambiar }: { sala: Sala; salas: Sala[]; alCambiar: () => void }) {
  const [estado, setEstado] = useState<'listo' | 'guardando' | 'error'>('listo')
  const opciones = salas.filter((s) => !hariaCirculo(salas, sala.id, s.id))
  const siguiente = salas.find((s) => s.id === sala.siguienteSala)
  const id = `al-terminar-${sala.id}`

  const cambiar = async (valor: string) => {
    setEstado('guardando')
    try {
      let destino: string | null = valor || null
      if (valor === NUEVO_RECREO) {
        const nombres = new Set(salas.map((s) => s.nombre))
        let nombre = 'Parque'
        for (let n = 2; nombres.has(nombre); n++) nombre = `Parque ${n}`
        destino = (await repo.crearSala(sala.cursoId, nombre, 'recreo')).id
      }
      await repo.conectarSalas(sala.id, destino)
      setEstado('listo')
      alCambiar()
    } catch {
      setEstado('error')
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-borde bg-white px-4 py-3">
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        Al terminar el plan pasan a
      </label>
      <div className="w-full sm:w-72">
        <select id={id} value={sala.siguienteSala ?? ''} disabled={estado === 'guardando'} onChange={(e) => void cambiar(e.target.value)} className={claseEntrada}>
          <option value="">Ninguna: te esperan a ti</option>
          {opciones.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre} ({TIPOS[s.tipo].nombre.toLowerCase()})
            </option>
          ))}
          <option value={NUEVO_RECREO}>Un recreo nuevo (Parque)</option>
        </select>
      </div>
      <span role="status" className="text-sm">
        {estado === 'guardando' ? (
          <span className="text-tinta-suave">Guardando…</span>
        ) : estado === 'error' ? (
          <span className="text-peligro">No se pudo cambiar. Intenta de nuevo.</span>
        ) : (
          siguiente && (
            <Link to={`/docente/salas?sala=${siguiente.id}`} className="font-medium text-menta-oscuro underline underline-offset-2">
              Ir a {siguiente.nombre}
            </Link>
          )
        )}
      </span>
    </div>
  )
}

export function NuevaSala({ cursoId, alCerrar, alCrear }: { cursoId: string; alCerrar: () => void; alCrear: (sala: Sala) => void }) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoSala>('trabajo')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const crear = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!nombre.trim()) return
    setEnviando(true)
    try {
      alCrear(await repo.crearSala(cursoId, capitalizar(nombre.trim()), tipo))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la sala.')
      setEnviando(false)
    }
  }

  return (
    <Dialogo titulo="Nueva sala" alCerrar={alCerrar}>
      <form onSubmit={(ev) => void crear(ev)} className="grid gap-5">
        <Campo etiqueta="Nombre">
          <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Por ejemplo: Grupo Sílabas" className={claseEntrada} />
        </Campo>
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-medium text-tinta">Tipo</legend>
          {(Object.keys(TIPOS) as TipoSala[]).map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 ${tipo === t ? 'border-menta-oscuro bg-menta-fondo/50' : 'border-borde hover:bg-lienzo'}`}
            >
              <input type="radio" name="tipo-sala" checked={tipo === t} onChange={() => setTipo(t)} className="mt-1 accent-menta-oscuro" />
              <span>
                <span className="block font-medium text-tinta">{TIPOS[t].nombre}</span>
                <span className="block text-sm text-tinta-suave">{TIPOS[t].ayuda}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {error && <Aviso tono="peligro">{error}</Aviso>}
        <div className="flex justify-end gap-2">
          <Boton variante="suave" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={!nombre.trim() || enviando}>
            {enviando ? 'Creando…' : 'Crear sala'}
          </Boton>
        </div>
      </form>
    </Dialogo>
  )
}

export function Renombrar({ sala, alCerrar, alListo }: { sala: Sala; alCerrar: () => void; alListo: () => void }) {
  const [nombre, setNombre] = useState(sala.nombre)
  const [error, setError] = useState<string | null>(null)

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault()
    try {
      await repo.renombrarSala(sala.id, capitalizar(nombre.trim()))
      alListo()
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el nombre.')
    }
  }

  return (
    <Dialogo titulo="Cambiar nombre" alCerrar={alCerrar}>
      <form onSubmit={(ev) => void guardar(ev)} className="grid gap-5">
        <Campo etiqueta="Nombre de la sala">
          <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} className={claseEntrada} />
        </Campo>
        {error && <Aviso tono="peligro">{error}</Aviso>}
        <div className="flex justify-end gap-2">
          <Boton variante="suave" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={!nombre.trim() || nombre.trim() === sala.nombre}>
            Guardar nombre
          </Boton>
        </div>
      </form>
    </Dialogo>
  )
}

export function Eliminar({ sala, salas, ninos, alCerrar, alEliminar }: { sala: Sala; salas: Sala[]; ninos: number; alCerrar: () => void; alEliminar: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const origenes = salas.filter((s) => s.siguienteSala === sala.id)

  const eliminar = async () => {
    try {
      await repo.eliminarSala(sala.id)
      alEliminar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la sala.')
    }
  }

  return (
    <Dialogo rol="alertdialog" titulo={`¿Eliminar «${sala.nombre}»?`} alCerrar={alCerrar}>
      <ul className="grid list-disc gap-1 pl-5 text-tinta-suave">
        {ninos > 0 && <li>{ninos === 1 ? 'El niño que está aquí queda' : `Los ${ninos} niños que están aquí quedan`} sin sala, esperando con los globos.</li>}
        {sala.tipo === 'trabajo' && <li>Se pierde su plan y el avance de los niños en él.</li>}
        {origenes.length > 0 && (
          <li>
            {origenes.map((s) => `«${s.nombre}»`).join(', ')} {origenes.length === 1 ? 'deja' : 'dejan'} de pasar a otra sala al terminar.
          </li>
        )}
        <li>No se puede deshacer.</li>
      </ul>
      {error && <Aviso tono="peligro">{error}</Aviso>}
      <div className="flex justify-end gap-2">
        <Boton variante="suave" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton variante="peligro" onClick={() => void eliminar()}>
          Eliminar sala
        </Boton>
      </div>
    </Dialogo>
  )
}
