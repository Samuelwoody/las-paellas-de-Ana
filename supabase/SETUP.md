# Setup de Supabase — Las Paellas de Ana

Esta guía explica cómo conectar la web con Supabase para que Ana pueda
gestionar los productos desde su dashboard. Solo se hace **una vez**.

## 1. Crear el proyecto Supabase

1. Ve a https://supabase.com y crea una cuenta gratis (si no tienes).
2. Haz clic en **New project**.
3. Nombre: `las-paellas-de-ana` · Región: `eu-west-3 (Paris)` o la más
   cercana a España. Elige una contraseña fuerte para la base de datos.
4. Cuando el proyecto esté listo (~1 minuto), continúa.

## 2. Ejecutar el esquema SQL

1. En tu proyecto Supabase, ve al menú lateral → **SQL Editor**.
2. Clic en **New query**.
3. Copia y pega el contenido completo de `supabase/schema.sql` (este repo).
4. Clic en **Run**. Debe decir _Success. No rows returned_.

Esto crea:
- Tabla `products` con el catálogo inicial.
- Políticas RLS (lectura pública de productos activos, escritura solo
  para Ana autenticada).
- Bucket de Storage `product-images` para subir fotos.

## 3. Crear la cuenta de Ana

1. Menú lateral → **Authentication** → **Users**.
2. Clic en **Add user** → **Create new user**.
3. Email: `ana@laspaellasdeana.com` (o el que quieras).
4. Password: elige una contraseña para Ana.
5. **Auto Confirm User: SÍ** (marca la casilla para que no tenga que
   confirmar por email).
6. Clic en **Create user**.

> Ana usará este email + contraseña para entrar al dashboard en `/login`.

## 4. Copiar las credenciales del proyecto en la web

1. Menú lateral → **Project Settings** (icono de engranaje abajo) →
   **API**.
2. Copia los dos valores:
   - **Project URL** (ej. `https://xxxxxxxx.supabase.co`)
   - **anon / public key** (una cadena larga `eyJhbG...`)
3. Abre `config.js` en la raíz del repo y pégalos:

```js
window.LPDA_CONFIG = {
    SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOi...TU_KEY_COMPLETA'
};
```

4. Haz commit y push. El deploy de Vercel se actualiza solo.

> **Nota de seguridad:** la `anon key` es pública por diseño — Supabase
> la protege con Row Level Security (las políticas que instalamos en el
> paso 2). No expone datos privados.

## 5. Probar

- Público: `https://tu-web.vercel.app` → debe mostrar los 9 productos
  semilla.
- Dashboard: `https://tu-web.vercel.app/login.html` → Ana entra con su
  email/password → puede crear/editar/borrar productos y subir fotos.

## 6. Subir fotos desde el dashboard

Ana sube imágenes directamente desde el formulario de producto en el
dashboard. Se guardan en el bucket `product-images` y se muestran en la
web pública automáticamente.

## Problemas comunes

- **"Invalid API key"** → confirma que pegaste la `anon key` completa y
  que el `SUPABASE_URL` acaba en `.supabase.co` sin barra final.
- **Las imágenes no cargan** → verifica que el bucket `product-images`
  está marcado como **Public** (Storage → product-images → Settings).
- **No puedo iniciar sesión** → revisa en Authentication → Users que la
  cuenta existe y está confirmada.
