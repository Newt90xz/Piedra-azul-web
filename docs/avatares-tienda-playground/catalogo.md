# Catálogo

Es lo que hay implementado en `frontend/src/contenido/tienda.ts` y `contenido/personaje.ts`. Se puede agregar o quitar lo que sea (ver [`tecnico.md`](tecnico.md)). Los `id` son también los nombres de archivo de los dibujos.

## 1. De lo que les gusta a nuestra versión

Decisión de Mati: muy parecido, sin copiar (ver [`README.md`](README.md), sección 3).

| Lo que piden | Qué hay | Qué evitamos |
|---|---|---|
| Goku, anime | `pelo_guerrero` (negro), `pelo_guerrero_dorado`, `ojos_anime`, `cintillo_ninja`, `kimono_azul` | Nombres, símbolos, traje naranja junto con ese pelo |
| Rey León | `pelo_leon`, `orejas_leon`, `pintura_leon`, `cachorro_leon` | Nombres, escenas, dibujar a sus personajes |
| La Era del Hielo | `gorro_mamut`, `mamut_bebe`, `perezoso` | Nombres, la ardilla con su bellota |
| Princesas | `tiara`, `corona`, `vestido_princesa`, `zapatos_cristal`, `pelo_rizos_reales`, `pelo_trenza_real` | Nombres, combinaciones de pelo y vestido de una princesa específica |
| Superhéroes | `capa_roja`, `antifaz`, `traje_heroe`, `escudo_estrella`, `botas_heroe` | Logos, máscaras y colores de un héroe específico |
| Autos | `auto_carrera`, `camion_bombero`, `moto`, `casco_piloto`, `traje_piloto` | Autos con ojos, marcas |
| Fútbol | `polera_futbol_roja`, `polera_futbol_azul`, `balon`, `gorra_futbol` | Escudos, patrocinadores, jugadores |
| Videojuegos | `lentes_pixel`, `control`, `polera_pixel` | Gorra roja con letra, marcas de consolas |
| Grupos musicales | `microfono`, `guitarra`, `traje_escenario`, `pelo_cresta` | Nombres, integrantes y logos |
| Dinosaurios, tiburones, jirafas, piratas, océano | Gorros, buzos, mascotas y accesorios | Son temas genéricos: sin problema con diseño propio |

## 2. Personajes base (gratis)

Son 12 puntos de partida sin género. La docente elige uno; todo lo demás se puede cambiar después.

| Base | Pelo | Piel | Color de pelo | Ojos |
|---|---|---|---|---|
| Corto | `pelo_corto` | 2 | negro | `ojos_redondos` |
| Rulos | `pelo_rulos` | 4 | cafe oscuro | `ojos_alegres` |
| Chasquilla | `pelo_chasquilla` | 1 | rubio | `ojos_redondos` |
| Colitas | `pelo_colitas` | 3 | cafe claro | `ojos_alegres` |
| Trenza | `pelo_trenza` | 5 | negro | `ojos_redondos` |
| Afro | `pelo_afro` | 6 | negro | `ojos_alegres` |
| Liso | `pelo_liso` | 2 | cobrizo | `ojos_alegres` |
| Moño | `pelo_mono` | 3 | negro | `ojos_redondos` |
| Puntas | `pelo_puntas` | 4 | cafe claro | `ojos_alegres` |
| Ondas | `pelo_ondas` | 1 | cobrizo | `ojos_redondos` |
| Rapado | `pelo_rapado` | 5 | cafe oscuro | `ojos_redondos` |
| Melena | `pelo_melena` | 3 | rubio | `ojos_alegres` |

**También gratis:** 6 tonos de piel, 6 colores de pelo, 4 expresiones (feliz, tranquilo, triste, enojado), levantar la mano, y los apoyos `lentes_opticos`, `audifono_medico` y `silla_ruedas`. La polera y el pantalón base toman el color del perfil.

## 3. Precios

| Nivel | Precio | Partidas aproximadas |
|---|---|---|
| A | 40 | 1 |
| B | 80 | 2 |
| C | 150 | 3 a 5 |
| D | 250 | 5 a 8 |
| E | 400 | 8 a 13 |

**Supuesto:** cada partida da entre 30 y 60 monedas. El máximo es 60; el valor habitual es una estimación, todavía sin medir.

## 4. Pelos

| id | Nombre | Precio |
|---|---|---|
| `pelo_corto` | Pelo corto | Gratis |
| `pelo_rulos` | Rulos | Gratis |
| `pelo_chasquilla` | Chasquilla | Gratis |
| `pelo_colitas` | Colitas | Gratis |
| `pelo_trenza` | Trenza | Gratis |
| `pelo_afro` | Afro | Gratis |
| `pelo_liso` | Pelo liso | Gratis |
| `pelo_mono` | Moño | Gratis |
| `pelo_puntas` | Puntas | Gratis |
| `pelo_ondas` | Ondas | Gratis |
| `pelo_rapado` | Rapado | Gratis |
| `pelo_melena` | Melena | Gratis |
| `pelo_guerrero` | Pelo de guerrero | 250 |
| `pelo_guerrero_dorado` | Pelo de guerrero dorado | 400 |
| `pelo_leon` | Melena de león | 250 |
| `pelo_rizos_reales` | Rizos reales | 150 |
| `pelo_algodon` | Algodón de azúcar | 150 |
| `pelo_fuego` | Pelo de fuego | 250 |
| `pelo_electrico` | Puntas eléctricas | 150 |
| `pelo_largo_rosado` | Pelo largo rosado | 150 |
| `pelo_coletas` | Coletas moradas | 150 |
| `pelo_trenza_real` | Trenza de reina | 150 |
| `pelo_cresta` | Cresta rockera | 150 |
| `pelo_estrella` | Pelo de estrella | 150 |
| `pelo_arcoiris` | Pelo arcoíris | 400 |
| `pelo_galaxia` | Pelo de galaxia | 400 |

## 5. Ojos

| id | Nombre | Precio |
|---|---|---|
| `ojos_redondos` | Ojos redondos | Gratis |
| `ojos_alegres` | Ojos alegres | Gratis |
| `ojos_anime` | Ojos grandes | 80 |
| `ojos_estrella` | Ojos de estrella | 80 |
| `ojos_corazon` | Ojos de corazón | 80 |
| `ojos_gato` | Ojos de gato | 150 |
| `ojos_dino` | Ojos de dinosaurio | 150 |
| `ojos_robot` | Ojos de robot | 150 |
| `ojos_brillantes` | Ojos brillantes | 150 |
| `ojos_fuego` | Ojos de fuego | 250 |

## 6. Cabeza

| id | Nombre | Precio |
|---|---|---|
| `gorra_futbol` | Gorra de fútbol | 40 |
| `orejas_gato` | Orejas de gato | 40 |
| `tiara` | Tiara | 80 |
| `casco_bombero` | Casco de bombero | 80 |
| `orejas_leon` | Orejas de león | 80 |
| `cintillo_ninja` | Cintillo con estrella | 80 |
| `gorro_dino` | Gorro de dinosaurio | 150 |
| `gorro_mamut` | Gorro de mamut | 150 |
| `sombrero_pirata` | Sombrero pirata | 150 |
| `casco_piloto` | Casco de piloto | 150 |
| `gorro_tiburon` | Gorro de tiburón | 150 |
| `gorro_jirafa` | Gorro de jirafa | 150 |
| `cuernos_dragon` | Cuernos de dragón | 150 |
| `sombrero_mago` | Sombrero de mago | 150 |
| `corona` | Corona dorada | 250 |
| `casco_astronauta` | Casco de astronauta | 250 |

## 7. Cara

| id | Nombre | Precio |
|---|---|---|
| `lentes_sol` | Lentes de sol | 40 |
| `parche_pirata` | Parche pirata | 40 |
| `pintura_leon` | Pintura de león | 40 |
| `antifaz` | Antifaz de héroe | 80 |
| `lentes_pixel` | Lentes pixelados | 80 |
| `bandana_ninja` | Bandana | 80 |
| `lentes_estrella` | Lentes de estrella | 80 |
| `visor_robot` | Visor de robot | 150 |

## 8. Poleras

| id | Nombre | Precio |
|---|---|---|
| `polera_futbol_roja` | Camiseta roja | 40 |
| `polera_futbol_azul` | Camiseta azul | 40 |
| `polera_dino` | Polera de dinosaurio | 40 |
| `polera_auto` | Polera de auto | 40 |
| `polera_estrella` | Polera de estrella | 40 |
| `polera_pixel` | Polera pixelada | 40 |
| `polera_ola` | Polera de ola | 40 |
| `polera_rayo` | Polera de rayo | 40 |

## 9. Trajes (reemplazan polera y pantalón)

| id | Nombre | Precio |
|---|---|---|
| `vestido_princesa` | Vestido de princesa | 250 |
| `traje_heroe` | Traje de héroe | 250 |
| `vestido_estrellas` | Vestido de estrellas | 250 |
| `traje_pirata` | Traje de pirata | 250 |
| `traje_ninja` | Traje ninja | 250 |
| `kimono_azul` | Kimono azul | 250 |
| `traje_piloto` | Traje de piloto | 250 |
| `buzo_dino` | Buzo de dinosaurio | 250 |
| `buzo_tiburon` | Buzo de tiburón | 250 |
| `traje_escenario` | Traje de escenario | 250 |
| `traje_astronauta` | Traje de astronauta | 400 |
| `cola_sirena` | Cola de sirena | 400 |

## 10. Zapatos

| id | Nombre | Precio |
|---|---|---|
| `zapatillas_rojas` | Zapatillas rojas | 40 |
| `botas_lluvia` | Botas de lluvia | 40 |
| `zapatos_futbol` | Zapatos de fútbol | 40 |
| `botas_heroe` | Botas de héroe | 80 |
| `zapatos_cristal` | Zapatos de cristal | 150 |
| `zapatillas_cohete` | Zapatillas cohete | 250 |

## 11. Espalda

| id | Nombre | Precio |
|---|---|---|
| `capa_roja` | Capa roja | 80 |
| `aleta_tiburon` | Aleta de tiburón | 80 |
| `capa_real` | Capa real | 150 |
| `alas_mariposa` | Alas de mariposa | 150 |
| `alas_dragon` | Alas de dragón | 250 |
| `mochila_cohete` | Mochila cohete | 400 |

## 12. En la mano

| id | Nombre | Precio |
|---|---|---|
| `balon` | Balón | 40 |
| `microfono` | Micrófono | 40 |
| `control` | Control de juego | 40 |
| `bandera_pirata` | Bandera pirata | 40 |
| `globo` | Globo | 40 |
| `varita` | Varita | 80 |
| `escudo_estrella` | Escudo de estrella | 80 |
| `guitarra` | Guitarra | 150 |

## 13. Mascotas (van junto al personaje)

| id | Nombre | Precio |
|---|---|---|
| `gatito` | Gatito | 80 |
| `perrito` | Perrito | 80 |
| `perezoso` | Perezoso | 150 |
| `tiburoncito` | Tiburoncito | 150 |
| `jirafita` | Jirafita | 150 |
| `loro` | Loro | 150 |
| `cachorro_leon` | Cachorro de león | 250 |
| `mamut_bebe` | Mamut bebé | 250 |
| `dino_bebe` | Dinosaurio bebé | 250 |
| `dragoncito` | Dragoncito | 400 |

## 14. Vehículos (todos a la misma velocidad)

| id | Nombre | Precio |
|---|---|---|
| `patineta` | Patineta | 150 |
| `scooter` | Scooter | 150 |
| `auto_carrera` | Auto de carrera | 400 |
| `camion_bombero` | Camión de bomberos | 400 |
| `moto` | Moto | 400 |
| `nave` | Nave espacial | 400 |
