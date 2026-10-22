// Primera letra en mayúscula, saltando signos iniciales (¿, ¡, comillas):
// «sala de prueba» → «Sala de prueba», «mariposa» → «Mariposa».
export function capitalizar(s: string) {
  return s.replace(/^([^\p{L}\p{N}]*)(\p{L})/u, (_, previo: string, letra: string) => previo + letra.toLocaleUpperCase('es-CL'))
}
