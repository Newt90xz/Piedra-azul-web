import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useSesion } from '../../app/Sesion.tsx'
import { Antetitulo, Boton, BotonEnlace, Campo, FondoAula, IconoCaja, Tarjeta, claseEntrada } from '../../ui/aula.tsx'

const esquema = z.object({
  email: z.email('Escribe un correo válido.'),
  clave: z.string().min(6, 'La contraseña tiene al menos 6 caracteres.'),
})

type Datos = z.infer<typeof esquema>

export default function Entrar() {
  const { docente, entrar } = useSesion()
  const navegar = useNavigate()
  const destino = (useLocation().state as { desde?: string } | null)?.desde ?? '/docente'
  const { register, handleSubmit, formState, setError } = useForm<Datos>({ resolver: zodResolver(esquema) })

  if (docente) return <Navigate to={destino} replace />

  const enviar = handleSubmit(async ({ email, clave }) => {
    try {
      await entrar(email, clave)
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'No se pudo iniciar sesión.' })
      return
    }
    navegar(destino, { replace: true })
  })

  return (
    <FondoAula>
      <main className="mx-auto max-w-md px-6 py-12">
        <Antetitulo>Leer para Todos / Docentes / Entrada</Antetitulo>
        <BotonEnlace to="/" variante="suave" className="mt-6 mb-6">← Volver al inicio</BotonEnlace>
        <Tarjeta className="p-8">
          <IconoCaja nombre="nota" />
          <Antetitulo className="mt-6">Recorrido docente</Antetitulo>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-tinta">Iniciar sesión</h1>
          <p className="mt-2 text-tinta-suave">
            Al comenzar la clase, inicia sesión para abrir la sala de tu curso.
          </p>
          <form onSubmit={enviar} noValidate className="mt-6 grid gap-4">
            <Campo etiqueta="Correo" error={formState.errors.email?.message}>
              <input type="email" autoComplete="username" className={claseEntrada} {...register('email')} />
            </Campo>
            <Campo etiqueta="Contraseña" error={formState.errors.clave?.message}>
              <input type="password" autoComplete="current-password" className={claseEntrada} {...register('clave')} />
            </Campo>
            {formState.errors.root && (
              <p role="alert" className="text-sm font-semibold text-[#b42318]">
                {formState.errors.root.message}
              </p>
            )}
            <Boton type="submit" disabled={formState.isSubmitting} className="mt-2 py-3.5 text-base">
              Entrar
            </Boton>
          </form>
        </Tarjeta>
      </main>
    </FondoAula>
  )
}
