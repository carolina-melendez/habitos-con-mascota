# Conexión inicial a Supabase

La URL de API verificada es `https://jixvyzlqfmlhzfxfrkvu.supabase.co`. El enlace `supabase.com/dashboard/project/...` abre el panel administrativo y no se utiliza para las peticiones de la aplicación.

La URL y la clave pública están en `.env.local`, excluido de Git y del contexto de construcción de Docker. La biblioteca oficial está instalada y `src/lib/supabase.ts` expone un cliente único de inicialización diferida. Sin configuración, la vista previa local continúa disponible.

Para comprobar conectividad sin crear usuarios, enviar correos ni cambiar datos:

```powershell
docker compose exec -T web node scripts/check-supabase.mjs
```

Verificación realizada: el servicio de autenticación respondió HTTP 200 con la clave configurada. Acceso por correo habilitado, registro habilitado y confirmación de correo requerida. Esto verifica conectividad y aceptación de la clave; no demuestra que existan tablas, políticas o cuentas funcionales en Brotito.

## Esquema de desarrollo aplicado

El 20 de octubre de 2026 se aplicó la migración `supabase/migrations/202610200001_brotito.sql` mediante el editor SQL del proyecto autorizado. Se verificó previamente que no había tablas públicas ni esquema `brotito_private`. La ejecución completa terminó correctamente.

Verificación remota con `supabase/verify.sql`: 11 tablas de Brotito, 11 tablas con RLS, 11 políticas y 11 operaciones públicas de servidor. Catálogos: 5 especies, 5 plantillas y 3 accesorios. Cero permisos de escritura directa para `anon`/`authenticated` y cero funciones de Brotito ejecutables por `anon`.

La segunda migración, `202610200002_snapshot.sql`, agrega `brotito_jardin`: una lectura coherente por usuario que comparte el bloqueo del perfil con las mutaciones. Aplicada y confirmada mediante el editor SQL el 20 de octubre de 2026. Ahora hay 12 operaciones públicas de servidor, todas restringidas a usuarios autenticados.

Detalle de operaciones: [bloque-5-base-datos.md](bloque-5-base-datos.md). Integración de pantallas y pruebas: [bloque-6-cuentas.md](bloque-6-cuentas.md). No se importaron hábitos del navegador.

## Autenticación local configurada

Site URL: `http://localhost:5173`. Retornos exactos guardados en el panel:

- `http://localhost:5173/cuenta/confirmar`
- `http://localhost:5173/cuenta/restablecer`
- `http://127.0.0.1:5173/cuenta/confirmar`
- `http://127.0.0.1:5173/cuenta/restablecer`

Confirmación de correo requerida. PKCE: los enlaces deben abrirse en el mismo navegador y origen desde el que se solicitaron. La sesión se almacena con la clave independiente `brotito.auth.v1`; los hábitos de cuenta no se escriben en las claves de vista previa.

El panel muestra SMTP personalizado desactivado. El correo de desarrollo de Supabase solo permite destinatarios del equipo del proyecto y tiene límites reducidos. Antes de probar otras direcciones o publicar, configurar un proveedor SMTP. Referencia: https://supabase.com/docs/guides/auth/auth-smtp .

## Trabajo pendiente

El usuario confirmó su cuenta e informó haber realizado las pruebas del jardín. No dispone todavía de dominio ni proveedor SMTP. La guía y las plantillas preparadas, sin activar SMTP, están en [bloque-7-recuperacion-correo.md](bloque-7-recuperacion-correo.md).

- Completar las pruebas manuales de registro, correo, recuperación y dos cuentas reales; requieren que las personas introduzcan sus propias contraseñas y que el servicio de correo permita esos destinatarios.
- Configurar SMTP personalizado para destinatarios ajenos al equipo y preparar las condiciones de una publicación pública.
- Definir por separado importación de datos locales y eliminación de cuentas. No se envían datos locales automáticamente.

La clave pública permite acceder a servicios públicos según sus permisos; no permite administrar el esquema. La migración se aplicó usando la sesión administrativa del panel autorizado. No colocar contraseñas ni claves administrativas en variables `VITE_*`.

La compilación de producción requiere aportar las variables públicas al entorno de Vite durante la construcción. El Dockerfile actual excluye `.env.local`: la configuración local por sí sola no configura una imagen de producción.
