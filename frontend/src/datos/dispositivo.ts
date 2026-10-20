// Credencial del dispositivo del alumno: la entrega la sala al unirse y la
// exigen las demás funciones de sala. Como la sesión de la docente, la maneja
// el repositorio; las pantallas solo ven el id del alumno. Los datos del niño
// siempre se consultan al servidor, así que si la docente lo desconecta, la app
// lo detecta y vuelve a la espera.

const CLAVE = 'leer-para-todos/alumno'

export interface Credencial {
  estudianteId: string
  token: string
}

export function leerCredencial(): Credencial | null {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<Credencial> | null
    // Antes se guardaba solo el id, sin token: ese dispositivo vuelve a elegir su perfil.
    return typeof c?.estudianteId === 'string' && typeof c.token === 'string' ? { estudianteId: c.estudianteId, token: c.token } : null
  } catch {
    return null
  }
}

export function guardarCredencial(c: Credencial) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(c))
  } catch {
    // Sin almacenamiento el niño tendrá que elegir de nuevo al recargar.
  }
}

export function olvidarCredencial() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Nada que borrar.
  }
}
