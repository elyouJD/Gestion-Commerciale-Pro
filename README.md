# Gestion Commerciale Pro

Aplicación web de catálogo, carrito, pedidos y panel privado de administración. Usa Firebase Authentication, Firestore y Cloudinary.

## 1. Contenido

- `index.html`: catálogo público, buscador, carrito y formulario de pedido.
- `admin.html`: acceso de administrador, alta de productos, carga de imágenes desde el ordenador, gestión de lotes, inventario y pedidos recibidos.
- `assets/css/main.css`: estilos compartidos y diseño adaptable.
- `js/firebase.js`: configuración del proyecto Firebase.
- `js/app.js`: lógica del catálogo y pedidos.
- `js/admin.js`: lógica del panel de administración.
- `firestore.rules`: reglas de seguridad de Firestore.
- Las imágenes se suben a Cloudinary mediante un Upload Preset Unsigned.

## 2. Cómo abrir la aplicación

**No abras `admin.html` haciendo doble clic desde Descargas.** Los módulos JavaScript de Firebase necesitan un servidor local.

1. Extrae el ZIP completo.
2. Abre la carpeta `gestion-commerciale-pro` en Visual Studio Code.
3. Instala la extensión **Live Server** si todavía no la tienes.
4. Haz clic derecho en `index.html` y selecciona **Open with Live Server**.
5. Para administrar, pulsa **Administración** en el menú o abre `admin.html` desde la misma dirección local.

Alternativa: desde una terminal abierta en la carpeta del proyecto ejecuta `python -m http.server 5500` y visita `http://localhost:5500`.

## 3. Configuración Firebase necesaria

La configuración web de Firebase está incluida en `js/firebase.js`. Para que los datos y las imágenes funcionen, el proyecto Firebase debe tener habilitados estos servicios:

1. **Authentication**: activa el proveedor **Email/Password** y crea el usuario administrador en Authentication > Users.
2. **Firestore Database**: crea la base de datos y publica el contenido de `firestore.rules` en Firestore > Rules.
3. **Cloudinary**: crea un Upload Preset llamado `gestion_products` en modo `Unsigned` y configura el Asset folder `products`. El Cloud name configurado es `vjq9mwnh`.
4. Comprueba que el UID del administrador en las dos reglas coincide con el UID real del usuario creado en Authentication.

El UID configurado en los archivos de reglas de este paquete es `cO8W4xaU7xXWUedPhCXgiu5Amms1`. Si el usuario administrador de Firebase tiene otro UID, sustituye ese valor en ambos archivos antes de publicar las reglas.

**Importante:** Cloudinary puede requerir el plan Blaze en proyectos nuevos. Revisa los precios y límites de Firebase antes de activar facturación.

## 4. Imágenes de productos

En el panel de administración selecciona la imagen desde tu ordenador. El navegador la optimiza a WebP (máximo 1600 px y 2 MB) y la sube a Cloudinary. Firestore guarda solamente la URL, la ruta y metadatos pequeños; no guarda los bytes de la imagen.

## 5. Límites de esta versión

Esta versión es una base funcional para catálogo y recepción de pedidos, no un sistema fiscal listo para producción. Los pedidos y totales enviados desde el navegador deben verificarse antes de aceptarlos. Para vender con facturación real se necesita un backend que valide precios y stock, gestione el inventario de forma atómica y genere facturas conforme a la normativa aplicable en España.
