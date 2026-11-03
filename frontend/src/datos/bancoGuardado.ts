import { aplicarBanco, type BancoRemoto } from '../contenido/banco.ts'

// Banco de contenidos en la base (RNF-14): agregar una palabra no requiere tocar
// código. Las actividades arman sus listas al cargarse, así que el banco debe
// estar listo antes: este módulo se importa primero en main.tsx y aplica la última
// copia guardada, sin esperar la red. Lo que llegue de la base se usa en la próxima
// carga. Sin copia ni red quedan las palabras incluidas en el código (RNF-12).

const CLAVE = 'leer-para-todos/banco'

try {
  const guardado = localStorage.getItem(CLAVE)
  if (guardado) aplicarBanco(JSON.parse(guardado) as BancoRemoto)
} catch {
  // Almacenamiento bloqueado o copia dañada: quedan las palabras del código.
}

export function guardarBanco(banco: BancoRemoto | null) {
  if (!banco) return
  try {
    localStorage.setItem(CLAVE, JSON.stringify(banco))
  } catch {
    // Sin almacenamiento, cada carga parte con las palabras del código.
  }
}
