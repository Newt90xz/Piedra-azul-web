// Íconos de línea simples, en la línea visual del prototipo «Aula».
const TRAZOS = {
  asterisco: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9',
  casa: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  personas: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  grafico: 'M3 3v18h18M7 15l4-4 3 3 6-6',
  salir: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h12',
  mas: 'M12 5v14M5 12h14',
  aula: 'M3 5h18v11H3zM8 21h8M12 16v5',
  izquierda: 'M15 18l-6-6 6-6',
  derecha: 'M9 6l6 6-6 6',
  altavoz: 'M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  silencio: 'M11 5 6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6',
  candado: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  lapiz: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  nota: 'M5 3h14v18H5zM9 8h6M9 12h6M9 16h4',
  check: 'M5 12l5 5 9-10',
  reintentar: 'M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5',
} as const

export type NombreIcono = keyof typeof TRAZOS

export function Icono({ nombre, className = 'size-5' }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={TRAZOS[nombre]} />
    </svg>
  )
}
