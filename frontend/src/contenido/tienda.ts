// Tienda del personaje (RF-24). Cada artículo es un SVG en
// src/assets/personaje/<espacio>/<id>.svg. Los precios los vuelve a validar la
// base (privado.articulos en supabase/migrations): cambiarlos o agregar
// artículos aquí sin la migración no cambia lo que se cobra (lo revisa tienda.test.ts).

export type EspacioOpcional = 'cabeza' | 'cara' | 'ropa' | 'traje' | 'zapatos' | 'espalda' | 'mano' | 'mascota' | 'vehiculo'
export type Espacio = 'pelo' | 'ojos' | 'apoyo' | EspacioOpcional

export interface Articulo {
  id: string
  espacio: Espacio
  nombre: string
  // 0: gratis para todos.
  precio: number
  // Solo cabeza: tapa el pelo de adelante.
  cubrePelo?: boolean
}

const grupo = (espacio: Espacio, filas: [id: string, nombre: string, precio: number, cubrePelo?: boolean][]): Articulo[] =>
  filas.map(([id, nombre, precio, cubrePelo]) => ({ id, espacio, nombre, precio, ...(cubrePelo && { cubrePelo }) }))

export const ARTICULOS: Articulo[] = [
  ...grupo('pelo', [
    ['pelo_corto', 'Pelo corto', 0],
    ['pelo_rulos', 'Rulos', 0],
    ['pelo_chasquilla', 'Chasquilla', 0],
    ['pelo_colitas', 'Colitas', 0],
    ['pelo_trenza', 'Trenza', 0],
    ['pelo_afro', 'Afro', 0],
    ['pelo_liso', 'Pelo liso', 0],
    ['pelo_mono', 'Moño', 0],
    ['pelo_puntas', 'Puntas', 0],
    ['pelo_ondas', 'Ondas', 0],
    ['pelo_rapado', 'Rapado', 0],
    ['pelo_melena', 'Melena', 0],
    ['pelo_guerrero', 'Pelo de guerrero', 250],
    ['pelo_guerrero_dorado', 'Pelo de guerrero dorado', 400],
    ['pelo_leon', 'Melena de león', 250],
    ['pelo_rizos_reales', 'Rizos reales', 150],
    ['pelo_algodon', 'Algodón de azúcar', 150],
    ['pelo_fuego', 'Pelo de fuego', 250],
    ['pelo_electrico', 'Puntas eléctricas', 150],
    ['pelo_largo_rosado', 'Pelo largo rosado', 150],
    ['pelo_coletas', 'Coletas moradas', 150],
    ['pelo_trenza_real', 'Trenza de reina', 150],
    ['pelo_cresta', 'Cresta rockera', 150],
    ['pelo_estrella', 'Pelo de estrella', 150],
    ['pelo_arcoiris', 'Pelo arcoíris', 400],
    ['pelo_galaxia', 'Pelo de galaxia', 400],
  ]),
  ...grupo('ojos', [
    ['ojos_redondos', 'Ojos redondos', 0],
    ['ojos_alegres', 'Ojos alegres', 0],
    ['ojos_anime', 'Ojos grandes', 80],
    ['ojos_estrella', 'Ojos de estrella', 80],
    ['ojos_corazon', 'Ojos de corazón', 80],
    ['ojos_gato', 'Ojos de gato', 150],
    ['ojos_dino', 'Ojos de dinosaurio', 150],
    ['ojos_robot', 'Ojos de robot', 150],
    ['ojos_brillantes', 'Ojos brillantes', 150],
    ['ojos_fuego', 'Ojos de fuego', 250],
  ]),
  ...grupo('apoyo', [
    ['lentes_opticos', 'Lentes', 0],
    ['audifono_medico', 'Audífono', 0],
    ['silla_ruedas', 'Silla de ruedas', 0],
  ]),
  ...grupo('cabeza', [
    ['gorra_futbol', 'Gorra de fútbol', 40, true],
    ['orejas_gato', 'Orejas de gato', 40],
    ['tiara', 'Tiara', 80],
    ['casco_bombero', 'Casco de bombero', 80, true],
    ['orejas_leon', 'Orejas de león', 80],
    ['cintillo_ninja', 'Cintillo con estrella', 80],
    ['gorro_dino', 'Gorro de dinosaurio', 150, true],
    ['gorro_mamut', 'Gorro de mamut', 150, true],
    ['sombrero_pirata', 'Sombrero pirata', 150, true],
    ['casco_piloto', 'Casco de piloto', 150, true],
    ['gorro_tiburon', 'Gorro de tiburón', 150, true],
    ['gorro_jirafa', 'Gorro de jirafa', 150, true],
    ['cuernos_dragon', 'Cuernos de dragón', 150],
    ['sombrero_mago', 'Sombrero de mago', 150, true],
    ['corona', 'Corona dorada', 250],
    ['casco_astronauta', 'Casco de astronauta', 250, true],
  ]),
  ...grupo('cara', [
    ['lentes_sol', 'Lentes de sol', 40],
    ['parche_pirata', 'Parche pirata', 40],
    ['pintura_leon', 'Pintura de león', 40],
    ['antifaz', 'Antifaz de héroe', 80],
    ['lentes_pixel', 'Lentes pixelados', 80],
    ['bandana_ninja', 'Bandana', 80],
    ['lentes_estrella', 'Lentes de estrella', 80],
    ['visor_robot', 'Visor de robot', 150],
  ]),
  ...grupo('ropa', [
    ['polera_futbol_roja', 'Camiseta roja', 40],
    ['polera_futbol_azul', 'Camiseta azul', 40],
    ['polera_dino', 'Polera de dinosaurio', 40],
    ['polera_auto', 'Polera de auto', 40],
    ['polera_estrella', 'Polera de estrella', 40],
    ['polera_pixel', 'Polera pixelada', 40],
    ['polera_ola', 'Polera de ola', 40],
    ['polera_rayo', 'Polera de rayo', 40],
  ]),
  ...grupo('traje', [
    ['vestido_princesa', 'Vestido de princesa', 250],
    ['traje_heroe', 'Traje de héroe', 250],
    ['vestido_estrellas', 'Vestido de estrellas', 250],
    ['traje_pirata', 'Traje de pirata', 250],
    ['traje_ninja', 'Traje ninja', 250],
    ['kimono_azul', 'Kimono azul', 250],
    ['traje_piloto', 'Traje de piloto', 250],
    ['buzo_dino', 'Buzo de dinosaurio', 250],
    ['buzo_tiburon', 'Buzo de tiburón', 250],
    ['traje_escenario', 'Traje de escenario', 250],
    ['traje_astronauta', 'Traje de astronauta', 400],
    ['cola_sirena', 'Cola de sirena', 400],
  ]),
  ...grupo('zapatos', [
    ['zapatillas_rojas', 'Zapatillas rojas', 40],
    ['botas_lluvia', 'Botas de lluvia', 40],
    ['zapatos_futbol', 'Zapatos de fútbol', 40],
    ['botas_heroe', 'Botas de héroe', 80],
    ['zapatos_cristal', 'Zapatos de cristal', 150],
    ['zapatillas_cohete', 'Zapatillas cohete', 250],
  ]),
  ...grupo('espalda', [
    ['capa_roja', 'Capa roja', 80],
    ['aleta_tiburon', 'Aleta de tiburón', 80],
    ['capa_real', 'Capa real', 150],
    ['alas_mariposa', 'Alas de mariposa', 150],
    ['alas_dragon', 'Alas de dragón', 250],
    ['mochila_cohete', 'Mochila cohete', 400],
  ]),
  ...grupo('mano', [
    ['balon', 'Balón', 40],
    ['microfono', 'Micrófono', 40],
    ['control', 'Control de juego', 40],
    ['bandera_pirata', 'Bandera pirata', 40],
    ['globo', 'Globo', 40],
    ['varita', 'Varita', 80],
    ['escudo_estrella', 'Escudo de estrella', 80],
    ['guitarra', 'Guitarra', 150],
  ]),
  ...grupo('mascota', [
    ['gatito', 'Gatito', 80],
    ['perrito', 'Perrito', 80],
    ['perezoso', 'Perezoso', 150],
    ['tiburoncito', 'Tiburoncito', 150],
    ['jirafita', 'Jirafita', 150],
    ['loro', 'Loro', 150],
    ['cachorro_leon', 'Cachorro de león', 250],
    ['mamut_bebe', 'Mamut bebé', 250],
    ['dino_bebe', 'Dinosaurio bebé', 250],
    ['dragoncito', 'Dragoncito', 400],
  ]),
  ...grupo('vehiculo', [
    ['patineta', 'Patineta', 150],
    ['scooter', 'Scooter', 150],
    ['auto_carrera', 'Auto de carrera', 400],
    ['camion_bombero', 'Camión de bomberos', 400],
    ['moto', 'Moto', 400],
    ['nave', 'Nave espacial', 400],
  ]),
]

const PORID = new Map(ARTICULOS.map((a) => [a.id, a]))

export const articulo = (id: string | undefined) => (id ? PORID.get(id) : undefined)
export const articulosDe = (espacio: Espacio) => ARTICULOS.filter((a) => a.espacio === espacio)

// Lo que oye el niño si no le alcanza (también lo usa lib/catalogoVoz.ts).
// El número solo ayuda si es chico: «te faltan 237» no le dice nada a un niño de
// cuatro años (y así son pocas frases, que quedan generadas de antemano).
export const MAX_FALTAN_CON_NUMERO = 10
export const faltanMonedas = (n: number) =>
  n === 1
    ? 'Te falta 1 moneda. ¡Juega para ganar más!'
    : n <= MAX_FALTAN_CON_NUMERO
      ? `Te faltan ${n} monedas. ¡Juega para ganar más!`
      : '¡Te faltan muchas monedas! Juega para ganar más.'
