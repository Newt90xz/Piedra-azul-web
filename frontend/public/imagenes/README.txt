Imagenes locales para las actividades

Guarda aqui un archivo PNG por palabra, usando el texto alternativo como nombre
de archivo en minusculas, sin tildes y con guiones entre palabras.

Ejemplos:
  avión       -> avion.png
  mamá        -> mama.png
  zanahoria   -> zanahoria.png

ImagenNino busca primero las URLs configuradas en la imagen (pictograma y luego
foto), despues este archivo local y finalmente muestra
el emoji de respaldo. Si la imagen no existe o no carga, pasa a la siguiente
opcion.

Esta carpeta corresponde a public/ de Vite; no agregues el prefijo "public" al
nombre de la URL. Solo se usa PNG para las imagenes locales.

Origen de los pictogramas

Los pictogramas son de ARASAAC (https://arasaac.org): autor Sergio Palao,
propiedad del Gobierno de Aragón (España), licencia Creative Commons BY-NC-SA.
Se pueden usar sin fines comerciales, citando autor, origen y licencia (va en
el pie de la portada de la app) y compartiendo las adaptaciones con la misma
licencia. Se descargan de la API pública en 500 px:

  https://api.arasaac.org/v1/pictograms/es/search/<palabra>   (buscar el id)
  https://static.arasaac.org/pictograms/<id>/<id>_500.png     (descargar)

Para agregar palabras: anotar el id en scripts/pictogramas/arasaac.json
(«archivo»: { "id": 1234, "clave": "palabra en ARASAAC si es otra" }) y, desde
frontend/, correr:

  node scripts/pictogramas/descargar.ts

El script revisa que el pictograma tenga esa palabra clave y baja solo los que
faltan (--forzar los vuelve a bajar). Igual hay que revisar el dibujo elegido:
la búsqueda a veces devuelve otro sentido de la palabra (p. ej. «bota» de vino
en vez de calzado, o el «mango» de una sartén). Cada palabra también lleva su
tema en contenido/banco.ts (ver contenido/temas.ts) y una migración en
supabase/migrations con su tema.
