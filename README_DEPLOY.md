
# study.godios.org — Deploy en Vercel (paso a paso)

## Copia estos archivos dentro de tu carpeta local `study/`
- `package.json`
- `.gitignore`
- `vercel.json` (opcional, permite `/js/api/*` → `/api/*`)
- Carpeta `api/` (wrappers mínimos requeridos por Vercel)
- Carpeta `js/server/api/` (código fuente real de las funciones)
- `js/backend.vercel.adapter.js` (adaptador frontend)

**En tu `index.html`**, antes de los scripts de users, añade:
```html
<script src="js/backend.vercel.adapter.js"></script>
```

## 1) Subir a Git y conectar Vercel
1. Dentro de `study/`:
   ```bash
   git init
   git add .
   git commit -m "Deploy: base site + vercel api"
   git branch -M main
   git remote add origin <URL-de-tu-repo>
   git push -u origin main
   ```
2. **Vercel → New Project → Importa** tu repo.
   - Framework: **Other** (estático).
   - Build: **none**. Output: raíz.
   - Deploy.

## 2) Dominio `study.godios.org`
- Vercel → Project → **Settings → Domains** → añade `study.godios.org`.
- En tu DNS: **CNAME** `study` → target CNAME que da Vercel.
- SSL auto (espera la verificación).

## 3) Variables de entorno (Vercel)
- `SUPABASE_URL` = https://TU-REF.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` = (Service Role Key)
- `POSTMARK_TOKEN` = (Server Token de Postmark)
- `APP_BASE_URL` = https://study.godios.org
Guarda y **redeploy**.

## 4) Supabase
Tabla `profiles` con: email, first_name, validation_token, is_validated (bool), updated_at.
Índice opcional por lower(email).

## 5) Postmark (info@godios.org)
- Verifica dominio/sender para godios.org
- Añade SPF/DKIM que pide Postmark.
- Copia Server Token → Vercel `POSTMARK_TOKEN`.

## 6) Flujo
- Frontend registra → `/api/register` envía correo en ES o EN según `PrefsStore.language`.
- Link apunta a `/api/validate?token=...` → marca validado y redirige `/?validate=`.
- Tu frontend completa el autologin con ese query param (ya implementado).
