import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useSesion } from '../../app/Sesion.tsx'
import { Icono } from '../../ui/Icono.tsx'
import { Aviso, Boton, Campo, claseEntrada } from '../../ui/aula.tsx'

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
    <div className="grid min-h-dvh place-items-center bg-fondo px-4 py-10 text-[15px] text-tinta">
      <main className="w-full max-w-sm">
        <p className="mb-6 flex items-center justify-center gap-2.5 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-menta-oscuro text-white">
            <Icono nombre="asterisco" className="size-4" />
          </span>
          Leer para Todos
        </p>
        <div className="rounded-xl border border-borde bg-white p-6">
          <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-tinta-suave">Panel docente: tu clase en vivo, las salas y el avance de cada niño.</p>
          <form onSubmit={enviar} noValidate className="mt-5 grid gap-4">
            <Campo etiqueta="Correo" error={formState.errors.email?.message}>
              <input type="email" autoComplete="username" className={claseEntrada} {...register('email')} />
            </Campo>
            <Campo etiqueta="Contraseña" error={formState.errors.clave?.message}>
              <input type="password" autoComplete="current-password" className={claseEntrada} {...register('clave')} />
            </Campo>
            {formState.errors.root && <Aviso tono="peligro">{formState.errors.root.message}</Aviso>}
            <Boton type="submit" disabled={formState.isSubmitting} className="mt-1">
              {formState.isSubmitting ? 'Entrando…' : 'Entrar'}
            </Boton>
          </form>
        </div>
        <p className="mt-5 text-center text-sm">
          <Link to="/" className="font-medium text-tinta-suave underline underline-offset-2 hover:text-tinta">
            Volver al inicio
          </Link>
        </p>
      </main>
    </div>
  )
}
