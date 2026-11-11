Imagenes locales para las actividades

Guarda aqui un archivo PNG por palabra, usando el texto alternativo como nombre
de archivo en minusculas, sin tildes y con guiones entre palabras.

Ejemplos:
  avión       -> avion.png
  mamá        -> mama.png
  zanahoria   -> zanahoria.png

ImagenNino busca primero las URLs configuradas en la imagen (foto o pictograma,
segun el modo del estudiante), despues este archivo local y finalmente muestra
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

Revisar siempre el dibujo elegido: la búsqueda a veces devuelve otro sentido
de la palabra (p. ej. «bota» de vino en vez de calzado).
