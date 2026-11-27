# Modo online (AGENTE 09)

## Fase A — cuentas, roles y campañas: programada, pendiente de conectar

Hecho en el código:
- `supabase/schema.sql`: perfiles, campañas, miembros con rol (`gm` / `player`), administrador (`profiles.is_admin`), enciclopedia con escritura solo para administradores, funciones `create_campaign`, `join_campaign`, `regenerate_invite`, `delete_my_account`. Toda la seguridad con RLS y permisos por columna en el servidor.
- `src/online/supabase.ts`: cliente y sesión. Sin variables de entorno la app sigue en modo local.
- `src/screens/AccountScreen.tsx`: iniciar sesión, crear cuenta (con consentimiento RGPD y edad), recuperar contraseña, cambiar nombre, ver roles, crear campaña, unirse con código, copiar/regenerar código (GM), salir de campaña, borrar cuenta.

### Conectarlo (una vez)
1. Supabase → SQL Editor → pegar `supabase/schema.sql` → Run.
2. Crear `.env.local` en la raíz (copia de `.env.example`) con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. **Nunca** la `service_role`.
3. Supabase → Authentication → URL Configuration → Site URL = dirección donde se abre la app (p. ej. `http://localhost:5173`; más adelante tu dominio).
4. Registrarte en la app y ejecutar en SQL Editor (con tu correo):
   `update public.profiles set is_admin = true where id = (select id from auth.users where email = 'TU_CORREO');`

## Fase B — pendiente
- Personajes en la nube con visibilidad por partes (público / jugador y GM / privado / solo GM) aplicada en el servidor, y campos que solo cambia el GM (clase del Don, aprobación, bonos, vitalidad en ficha aprobada).
- Tiradas generadas en el servidor (función SQL con `gen_random_bytes`, sin inserción directa del cliente).
- Tiempo real: barras, tiradas, combate, mensajes y susurros.
- Inicio de sesión con Google (requiere crear credenciales OAuth en Google Cloud).
