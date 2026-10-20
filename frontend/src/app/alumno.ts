// Perfil que eligió este dispositivo de alumno. Solo guarda el id: la sala y los
// datos del niño siempre se consultan al servidor, así que si la docente lo
// desconecta, la app lo detecta y vuelve a la espera.

const CLAVE = 'leer-para-todos/alumno'

export function alumnoGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

export function guardarAlumno(id: string) {
  try {
    localStorage.setItem(CLAVE, id)
  } catch {
    // Sin almacenamiento el niño tendrá que elegir de nuevo al recargar.
  }
}

export function olvidarAlumno() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Nada que borrar.
  }
}
