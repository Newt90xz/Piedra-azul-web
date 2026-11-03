# Parámetros de los dibujos

**Ya existe un dibujo para cada pieza** (131 del personaje, 16 del parque, 6 íconos y el escenario de la tienda), hecho en SVG. Para mejorar uno, basta con reemplazar su archivo por otro que cumpla lo siguiente; no hay que tocar el código. Un artículo nuevo además necesita entrar en `frontend/src/contenido/tienda.ts` y en una migración (ver [`tecnico.md`](tecnico.md)).

## 1. Parámetros obligatorios

| Parámetro | Valor |
|---|---|
| Formato | SVG. Sin imágenes PNG incrustadas |
| Lienzo | `viewBox="0 0 512 512"`, fondo transparente |
| Nombre | Igual al `id` del catálogo: `pelo_guerrero.svg` |
| Carpeta | `frontend/src/assets/personaje/<espacio>/` |
| Vista | De frente |
| Contorno | Color `#33364d`, grosor 7, puntas redondeadas |
| Colores | Suaves y sin parpadeos (RNF-08). Sin degradados |
| Prohibido en el archivo | Atributos `id` (salvo los de capas), `<script>`, `<style>`, degradados, filtros, nombres ajenos |
| Peso | Idealmente menos de 5 KB |
| Legibilidad | Se entiende a 24 px (panel de la docente) y a 400 px (tienda) |

Los degradados y filtros usan `id`, que chocan cuando hay varios personajes en la misma pantalla.

## 2. Dónde va cada cosa

Todas las piezas se superponen sobre el mismo cuerpo, así que deben respetar estas medidas del lienzo de 512:

| Parte | Posición |
|---|---|
| Cabeza | Centro en (256, 190); 118 de radio horizontal y 108 vertical. Va de y=82 a y=298 |
| Ojos | Centros en (210, 196) y (302, 196) |
| Boca | Alrededor de (256, 250) |
| Orejas | Centros en (138, 200) y (374, 200) |
| Torso | De x=190 a x=322 y de y=290 a y=410 |
| Piernas | Centros en x=225 y x=287, de y=395 a y=462 |
| Zapatos | Centros en (222, 474) y (290, 474) |
| Mano con objetos | Mano derecha en (366, 392) |
| Mano levantada | (398, 222); los objetos en la mano se ocultan |

La vista de busto muestra solo el recuadro `x=76, y=4` de 360 × 360; todo lo que se quiera ver en la entrada y en el panel de la docente debe caber ahí.

## 3. Capas

Se dibujan en este orden, de atrás hacia adelante:

1. Vehículo o silla de ruedas (`atras`)
2. Espalda
3. Pelo y gorro (`atras`)
4. Cuerpo
5. Zapatos
6. Pantalón base (no se dibuja con traje)
7. Polera o traje
8. Brazos
9. Vehículo o silla de ruedas (`adelante`)
10. Objeto en la mano
11. Cabeza
12. Ojos
13. Boca y cejas (expresión)
14. Lentes o antifaz
15. Pelo (`adelante`; se omite si el gorro tiene `cubrePelo`)
16. Gorro (`adelante`)
17. Audífono
18. Mascota

**Partes de atrás y de adelante:** los pelos, gorros y vehículos que pasan detrás del cuerpo usan dos grupos. Un archivo sin grupos se dibuja completo como "adelante".

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <g id="atras"><!-- detrás del cuerpo --></g>
  <g id="adelante"><!-- delante de la cara --></g>
</svg>
```

**Colores que cambian:** en las partes gratis se usa `var(--piel)`, `var(--pelo)` y `var(--ropa)` en lugar de un color fijo. Los artículos comprados tienen colores fijos.

**Mascotas:** se dibujan centradas en su propio lienzo de 512. La app las reduce al 30 % y las pone junto al personaje.

## 4. Escenario del parque

Van en `frontend/public/parque/`, sin capas ni variables. A diferencia del personaje, aquí **sí se pueden usar degradados**, porque cada imagen se carga aparte. El fondo es de `1920 × 1080`.

- **Paisaje** (sin contorno, para que se quede atrás): `fondo`, `arbol_1`, `arbol_2`, `arbusto`, `flores`, `banca`, `arco`, `pileta`, `primer_plano`.
- **Juegos** (con contorno `#4a3f55`, para que se note que se usan): `columpio`, `resbalin`, `balancin`, `cama`, `arenero`, `kiosko`, y el objeto `balon`.
- **Íconos** en `iconos/`: `tienda`, `columpio`, `resbalin`, `balancin`, `cama`, `arenero`. Lienzo de 100 × 100, en blanco y sobre fondo transparente; el círculo de color lo pone la app.
- **Tienda:** `frontend/public/tienda/escenario.svg`, de 800 × 900; el personaje queda de pie sobre el podio.

**Para dar profundidad:** lo lejano es más chico, más claro y con menos detalle; cada objeto trae su sombra en el suelo y su base en la parte inferior de la imagen.

Posición, tamaño, huella en el suelo y puestos de cada objeto están en `frontend/src/contenido/parque.ts`.

## 5. Antes de aprobar un dibujo

1. **Parecido:** evoca sin copiar; sin nombres, logos ni el personaje completo (ver [`README.md`](README.md), sección 3).
2. **Calce:** se ve bien sobre el cuerpo base y con pelos largos y cortos.
3. **Tamaño:** se entiende a 24 px y a 400 px.
4. **Inventario:** queda en la tabla de abajo.

Si usan IA como apoyo, no pidan el nombre de un personaje o película en el prompt, y pregunten al profesor guía si el resultado cuenta como recurso propio.

## 6. Inventario de recursos (RNF-11)

RNF-11 lo pide como verificación.

| Archivos | Autor o fuente | Herramienta | Licencia | Fecha |
|---|---|---|---|---|
| `frontend/src/assets/personaje/**`, `frontend/public/parque/*` (versión inicial) | Equipo del proyecto, con asistencia de Claude | Código SVG escrito a mano | Propio del proyecto | 2026-11-02 |
