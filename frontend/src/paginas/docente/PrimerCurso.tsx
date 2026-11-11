import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useSesion } from '../../app/Sesion.tsx'
import { Aviso, Boton, Campo, claseEntrada } from '../../ui/aula.tsx'

const esquema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre del curso.').max(60, 'Máximo 60 caracteres.'),
})

type Datos = z.infer<typeof esquema>

// Estado vacío del panel: la docente todavía no tiene cursos.
export default function PrimerCurso() {
  const { crearCurso } = useSesion()
  const { register, handleSubmit, formState, setError } = useForm<Datos>({ resolver: zodResolver(esquema) })

  const enviar = handleSubmit(async ({ nombre }) => {
    try {
      await crearCurso(nombre)
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'No se pudo crear el curso.' })
    }
  })

  return (
    <div className="mx-auto mt-10 max-w-md rounded-xl border border-borde bg-white p-6">
      <h1 className="text-2xl font-semibold text-tinta">Crea tu primer curso</h1>
      <p className="mt-1 text-sm text-tinta-suave">Después podrás añadir a tus estudiantes y preparar sus salas.</p>
      <form onSubmit={enviar} noValidate className="mt-5 grid gap-4">
        <Campo etiqueta="Nombre del curso" error={formState.errors.nombre?.message}>
          <input placeholder="Por ejemplo: Kínder A" className={claseEntrada} {...register('nombre')} />
        </Campo>
        {formState.errors.root && <Aviso tono="peligro">{formState.errors.root.message}</Aviso>}
        <Boton type="submit" disabled={formState.isSubmitting}>
          Crear curso
        </Boton>
      </form>
    </div>
  )
}
