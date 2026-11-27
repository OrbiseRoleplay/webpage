# Modo online y Base de Datos (Supabase)

## Qué incluye la base de datos (`supabase/schema.sql`)

1. **Registro de usuarios (`public.profiles`):**
   - Guarda nombre visible, correo y estado de administrador.
   - El **primer usuario** que se registra recibe automáticamente el rol de **Admin**.
2. **Roles dinámicos y permisos (`public.app_roles` y `public.user_roles`):**
   - Roles base del sistema: **Admin**, **Master** y **Jugador**.
   - Creación y edición de **roles personalizados** desde la propia web (con color, descripción y permisos granulares: gestionar roles/usuarios, permisos de Master, subir archivos y moderar todos los archivos).
   - Asignación y retirada de roles a cualquier usuario con un clic desde la pestaña **Usuarios**.
3. **Subida y compartición de archivos (`public.shared_files`, `file_role_shares`, `file_user_shares` + Storage bucket `orbise-files`):**
   - Subida de archivos de hasta 50 MB almacenados de forma segura en Supabase Storage.
   - Compartición flexible al subir o en cualquier momento desde el botón **Permisos**:
     - **Público** (para todos los usuarios registrados).
     - **Por Roles** (ej. compartir solo con `Master`, o con un rol personalizado que hayas creado).
     - **Por Usuarios** (seleccionando usuarios concretos de la lista).
   - Seguridad real en servidor (RLS en tablas y en `storage.objects`): nadie puede listar ni descargar un archivo si no es su creador, Admin, o está incluido en los usuarios/roles con los que se compartió.
4. **Campañas (`public.campaigns` y `public.campaign_members`):**
   - Creación de campañas y unión mediante código de invitación de 8 caracteres.

## Cómo conectarlo en 3 minutos (Supabase + Vercel)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En el menú lateral de Supabase ve a **SQL Editor → New query**, pega todo el contenido de [`supabase/schema.sql`](../supabase/schema.sql) y pulsa **Run**.
3. Ve a **Project Settings → API** y copia:
   - `Project URL` → será tu `VITE_SUPABASE_URL`
   - `anon` `public` key → será tu `VITE_SUPABASE_ANON_KEY`
4. **En local:** crea un archivo `.env.local` en la raíz del proyecto con esas dos variables (como en `.env.example`).
5. **En Vercel:** entra en tu proyecto → **Settings → Environment Variables**, añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` y haz un **Redeploy**.
6. En Supabase → **Authentication → URL Configuration**, pon como `Site URL` el enlace de tu web en Vercel (y añade `http://localhost:5173` en *Redirect URLs* si pruebas en local).
