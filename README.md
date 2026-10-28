# Brotito

Aplicación móvil web con Vue 3, TypeScript, Docker y Supabase. Incluye cuentas, cinco criaturas, tablero, plantillas, registro diario, historial, crecimiento, tienda y armario. Conserva una vista previa local independiente. Usa ilustraciones SVG originales de Figma y Nunito local.

## Ejecutar

Requiere Docker Desktop en modo Linux. No necesitas instalar Node ni paquetes en Windows.

```powershell
docker compose up --build -d
```

Abre http://localhost:5173. El código se actualiza automáticamente al editarlo; las dependencias viven en un volumen exclusivo de Brotito. El puerto solo se publica en la máquina local y el contenedor usa un usuario sin privilegios.

```powershell
docker compose logs -f web
docker compose down
```

## Verificar

```powershell
docker compose exec web npm test
docker compose exec web npm run build
```

## Alcance de esta entrega

- Registro, acceso, confirmación, recuperación y cierre de sesión conectados a Supabase. `/jardin/*` usa la cuenta; `/vista-previa/*` mantiene sus datos locales. La cuenta comienza vacía y no importa la vista previa.
- Hoy y Para otros días muestran cinco hábitos por página, con controles Anterior/Siguiente y contador. El progreso diario incluye todos los hábitos. Plantillas y armario comparten el control, visible solo al superar cinco elementos. El historial ya se divide por mes.
- El tablero comienza vacío y muestra solo los hábitos creados. Las cinco plantillas y los hábitos propios permiten cantidades o sí/no, frecuencia semanal y fecha de inicio desde hoy. Lectura permite minutos o páginas; la hora de descanso sirve como referencia, no como registro automático.
- `brotito.habits.v1` guarda zona horaria, hábitos, registros y compras/equipo. Las vistas previas anteriores se migran agregando un armario vacío. Cada nueva fecha empieza en cero y conserva las anteriores. Cada hábito completo genera 10 XP + 5 monedas una vez por fecha; el saldo disponible descuenta únicamente las compras que se conservan.
- Solo se registra y corrige hoy según la zona horaria inicial del navegador. Bajar de completo a pendiente requiere confirmar la retirada de la recompensa. Volver a completar la recupera una vez. Una pantalla abierta antes de medianoche queda bloqueada para el día anterior.
- Si el navegador bloquea el guardado de la vista previa, se conserva el estado en memoria mientras siga abierta. En cuentas, el servidor confirma cada cambio y calcula las recompensas; si falla la conexión, se muestra el error y se requiere actualizar antes de seguir guardando.
- Crecimiento automático en 0 / 100 / 300 / 600 XP. Flori tiene cuatro etapas ilustradas; las otras criaturas tienen sus dos primeras formas y usan Flori como referencia de las etapas avanzadas. Ver una etapa futura no altera el progreso.
- Tienda: pañuelo 40, corona 60 y gafas 90 monedas; compra única por accesorio, sin pagos reales ni requisitos de nivel. El armario permite equipar un accesorio por categoría y quitarlo conservando la propiedad.
- Corregir muestra experiencia, saldo disponible, racha, etapa y compras devueltas antes de confirmar. Si falta saldo se revierten compras desde la más reciente al precio pagado y se desequipa lo devuelto. Registro, compras y equipo se guardan juntos. Si cambia el estado después de revisarlo, hay que revisar otra vez. Completar de nuevo recupera la recompensa sin recomprar accesorios automáticamente.
- Historial navegable por hábito y mes, consulta de días cerrados, racha actual y mejor racha. El nombre cambia hoy; metas y frecuencia desde mañana. Archivar retira el hábito desde hoy conservando historial, recompensas y accesorios.
- El saldo de cuenta se calcula en el servidor; el saldo de vista previa permanece local. No hay pagos reales ni sincronización sin conexión.

## Diseño y reglas

Supabase conectado al espacio de cuenta con permisos por usuario y operaciones transaccionales. Configuración, comprobación y límites: [docs/supabase.md](docs/supabase.md). Pruebas de base aislada: `./scripts/test-database.ps1`.

[Figma](https://www.figma.com/design/2z9yZOWwmcrh54MeAIqElQ/Brotito?node-id=38-4427). Brotito representa la marca; Flori, Musguito, Seti, Lumi y Semillín son las mascotas elegibles.

Reglas aprobadas en Figma `44:5748`: por hábito, 10 XP + 5 monedas; evolución, 0 / 100 / 300 / 600 XP; accesorios, 40 / 60 / 90 monedas. Correcciones solo del día actual, archivo inmediato y nuevas metas/frecuencias desde mañana. Progreso, compras, correcciones, historial, edición y archivo ya funcionan en esta vista previa local.

La validación de la vista previa acepta nombres de 1 a 60 caracteres, unidades propias de hasta 20, metas enteras de 1 a 1000 y al menos un día semanal. Son límites de esta implementación; el servidor deberá aplicar el mismo contrato o acordar los ajustes antes de conectar datos reales.

## Estructura

`src/components`: controles reutilizables. `src/views`: pantallas. `src/stores`: estado de vista previa. `src/domain`: validación. `public/illustrations`: recursos originales. `docs/figma-assets.json`: procedencia de los recursos.

La imagen de producción se puede construir con `docker build --target production -t brotito:production .`; sirve archivos compilados mediante Nginx con soporte para las rutas de la aplicación.
