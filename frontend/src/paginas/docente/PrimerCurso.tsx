import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useSesion } from '../../app/Sesion.tsx'
import { Boton, Campo, IconoCaja, Tarjeta, claseEntrada } from '../../ui/aula.tsx'

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
    <Tarjeta className="mx-auto max-w-lg p-8">
      <IconoCaja nombre="aula" />
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-tinta">Crea tu primer curso</h1>
      <p className="mt-2 text-tinta-suave">Después podrás añadir a tus estudiantes y abrir la sala.</p>
      <form onSubmit={enviar} noValidate className="mt-6 grid gap-4">
        <Campo etiqueta="Nombre del curso" error={formState.errors.nombre?.message}>
          <input placeholder="Ej.: Kínder A" className={claseEntrada} {...register('nombre')} />
        </Campo>
        {formState.errors.root && (
          <p role="alert" className="text-sm font-semibold text-[#b42318]">
            {formState.errors.root.message}
          </p>
        )}
        <Boton type="submit" disabled={formState.isSubmitting} className="py-3">
          Crear curso
        </Boton>
      </form>
    </Tarjeta>
  )
}
