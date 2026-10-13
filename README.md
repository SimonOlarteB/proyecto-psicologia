# Psicología — sitio y agenda

Aplicación de [Next.js](https://nextjs.org) 16 (App Router, React 19) para la práctica de psicología: agenda de citas con pagos Wompi, Google Calendar / Google Meet, correos con Resend, recordatorios automáticos y panel de administración.

- **Runtime:** Node.js 20+ (no es compatible con Edge por `mysql2`, `googleapis` y `fs`).
- **Base de datos:** MySQL 8 con `utf8mb4` (esquema en `schema/001_init.sql`).
- **Zona horaria de negocio:** `America/Bogota`.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y completar
npm run dev
```

Abrir http://localhost:3000. El esquema de la base se crea con:

```bash
mysql -u root -p < schema/001_init.sql
node scripts/crear-admin.mjs
```

## Variables de entorno

Todas están documentadas en [`.env.example`](./.env.example). Las obligatorias en producción:

| Variable | Para qué sirve |
| --- | --- |
| `APP_URL` | URL pública HTTPS (correos, reprogramar, crons internos). |
| `AUTH_SECRET` | HMAC de la cookie de sesión admin. ≥ 32 bytes aleatorios. |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Conexión MySQL. **Nunca `root` en producción**; usa un usuario de aplicación con privilegios mínimos. |
| `DB_SSL` / `DB_SSL_CA` | SSL hacia el MySQL (obligatorio en cloud; `DB_SSL_CA` es la ruta al PEM del proveedor si lo exige). |
| `WOMPI_PUBLIC_KEY` / `WOMPI_INTEGRITY_SECRET` / `WOMPI_EVENTS_SECRET` | Checkout Wompi, firma de integridad y verificación del webhook. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Correos. Verifica tu dominio en Resend; no uses `onboarding@resend.dev` en producción. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | OAuth de Google Calendar (`https://dominio/api/google/callback`). |
| `CRON_SECRET` | Bearer de los jobs de recordatorios. |
| `UPLOAD_DIR` | Opcional. Directorio persistente para fotos; por defecto `public/uploads`. |
| `TOKEN_ENCRYPTION_KEY` | Opcional. Cifrado del refresh_token de Google en reposo; si no se define se usa `AUTH_SECRET`. |

## Despliegue

**Forma recomendada:** VPS o PaaS con disco persistente y proceso Node largo (Railway, Render, Fly, DigitalOcean, o un VPS con Caddy/Nginx). Región cercana a Bogotá o São Paulo.

Vercel solo si se cambia la arquitectura: el filesystem efímero rompe los uploads, el pool de MySQL y el webhook largo pelean con serverless.

### Pasos

1. **Base de datos** en el host: `mysql < schema/001_init.sql` con el usuario de aplicación.
2. **Secretos** del paso anterior en el panel del proveedor (nunca en el repo).
3. **Construir y arrancar:**

   ```bash
   npm ci
   npm run build
   npm start          # next start, puerto 3000
   ```

   O con Docker:

   ```bash
   docker build -t psicologia .
   docker run -p 3000:3000 --env-file .env.local \
     -v /var/lib/psicologia/uploads:/app/public/uploads \
     psicologia
   ```

4. **TLS** delante (HTTPS obligatorio: cookies `Secure`, HSTS y webhook de Wompi exigen HTTPS del dominio real).
5. **Webhook de Wompi:** configurar `https://tudominio.com/api/wompi/webhook` en el panel de Wompi.
6. **OAuth de Google:** `https://tudominio.com/api/google/callback` como redirect URI autorizado.
7. **Crons** (siguiente sección).
8. **Respaldos:** programar `node scripts/respaldo-mysql.mjs /ruta/respaldos` diariamente y cifrar el volumen o el bucket de destino.

### Crons

Configura los crons en **hPanel de Hostinger > Avanzado > Cron Jobs**. No necesitas GitHub Actions ni un cron de Vercel. Crea dos tareas, cada 15 minutos, con estos comandos:

Recordatorios de citas:

```bash
curl -fsS --max-time 300 -H "Authorization: Bearer <CRON_SECRET>" https://tudominio.com/api/recordatorios/12-horas
```

Invitaciones a testimonios:

```bash
curl -fsS --max-time 300 -H "Authorization: Bearer <CRON_SECRET>" https://tudominio.com/api/recordatorios/testimonios
```

Reemplaza `https://tudominio.com` por el dominio publico de la app y `<CRON_SECRET>` por el mismo secreto configurado como variable de entorno en la aplicacion de Hostinger. Configura la frecuencia de cada tarea en hPanel (cada 15 minutos); no ejecutes estos comandos localmente como proceso permanente.

Para probar la consulta de citas sin enviar correos ni modificar datos, anade `?dryRun=1` a la ruta de 12 horas y conserva el encabezado de autorizacion. `APP_URL`, `CRON_SECRET`, `RESEND_API_KEY` y `RESEND_FROM_EMAIL` deben estar configuradas en el entorno de produccion de Hostinger.

### Almacenamiento de imágenes

Perfil, logo, trayectoria y publicaciones se escriben en `UPLOAD_DIR` (por defecto `public/uploads`). En un VPS monta un volumen persistente y sirve ese directorio con el proxy; `public/uploads` está ignorado en git. Para serverless haría falta object storage (S3/R2/Cloudinary).

## Operación

| Tarea | Comando / ruta |
| --- | --- |
| Salud de la app + MySQL | `GET /api/health` |
| Crear administrador | `node scripts/crear-admin.mjs` |
| Restablecer contraseña | `node scripts/restablecer-admin.mjs` |
| Respaldo MySQL | `node scripts/respaldo-mysql.mjs [destino]` |
| Crear bloqueos de agenda | `POST /api/bloqueos-agenda` (sesión admin) |
| Migraciones de datos | `node scripts/migrar-bloqueos-agenda.mjs`, `node scripts/migrar-tipo-servicio.mjs` |

## Seguridad vigente

Cookies `httpOnly` + `Secure` en producción; sesión HMAC con `timingSafeEqual`; contraseñas con `scrypt` + salt; SQL parametrizado en todo el repo; webhook Wompi valida checksum SHA-256, monto y moneda, con `FOR UPDATE` e idempotencia por `transaccion_id`; rate limit en login (10/15 min) y reserva/pago (20/hora); headers de seguridad en `next.config.ts`; refresh_token de Google cifrado AES-256-GCM en reposo; consulta pública de agenda sin ids internos; crons protegidos con Bearer.

PD: trata los datos de clientes según la Ley 1581 de Colombia: MySQL cifrado en reposo, respaldos cifrados, acceso mínimo y retención definida.

## Licencia

Privada.
