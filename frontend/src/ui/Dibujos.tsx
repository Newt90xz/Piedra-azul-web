// Dibujos propios en SVG para lo que algunos emojis no muestran: 🪙 (moneda) y
// 🛝 (tobogán) son nuevos y Windows 10 los dibuja como un cuadro vacío. Se
// escalan con el texto (1em) como un emoji.

export function Moneda({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`inline-block size-[1em] shrink-0 align-[-0.15em] ${className}`}>
      <circle cx="12" cy="12" r="11" fill="#e0a800" />
      <circle cx="12" cy="11.2" r="10.2" fill="#ffd23f" />
      <circle cx="12" cy="11.2" r="7.4" fill="none" stroke="#e0a800" strokeWidth="1.4" />
      <path d="M12 6.4l1.45 2.95 3.25.47-2.35 2.29.56 3.24L12 13.83l-2.91 1.52.56-3.24-2.35-2.29 3.25-.47z" fill="#e0a800" />
      <path d="M6.2 7.6a7.4 7.4 0 0 1 3.4-2.9" fill="none" stroke="#fff6c8" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

// Parque: un tobogán con su escalera y un árbol.
export function IconoParque({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`inline-block size-[1em] shrink-0 ${className}`}>
      <circle cx="18.5" cy="8" r="4.3" fill="#43a047" />
      <rect x="17.7" y="11" width="1.6" height="9" rx=".6" fill="#8d6e63" />
      <path d="M4 20V6.5M8 20V6.5M4 10h4M4 13.5h4M4 17h4" stroke="#e8a35c" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 6.5c3.5 0 4.2 2 6 6.5s3.2 7 5 7" fill="none" stroke="#2f80c9" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M2.5 20.5h19" stroke="#7cb342" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
