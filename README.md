npm run build      # Production build

## Products GA — Motor de Precios + Sistema de Compras

Proyecto Next.js (App Router) + TypeScript con un motor de precios determinista totalmente separado de la capa UI. Implementado con PostgreSQL mediante Drizzle ORM y sistema de compras manuales integrado.

## 1. Objetivo

Centralizar y hacer predecible la lógica de cálculo de PVP (precio de venta) aplicando reglas de precedencia, mínimos efectivos y redondeos configurables, además de gestionar compras manuales de productos para actualizar costos, garantizando:

* Determinismo (misma entrada => misma salida)
* Testeabilidad (motor puro sin dependencias de React / fetch / DB)
* Fácil sustitución de capa de persistencia (patrón repositorio con interfaces estables)
* Auditabilidad (differences por campo para cada cambio relevante)
* Gestión de costos actualizada mediante facturas manuales

## 2. Estado Actual (Implementado)

**Sistema de Pricing (Completo):**
* Motor puro (`src/lib/pricing/*`: tipos, precedencia, redondeo, cálculo, construcción de filas, export CSV)
* 10 tests Vitest (rounding, precedence, compute, edge cases) todos en verde
* Repositorios Drizzle (`src/repositories/drizzle/*`) implementando interfaces (`interfaces.ts`)
* `PricingService` orquestando dependencias sin lógica matemática adicional
* Server actions completos (`computePriceAction`, `productMutations`, etc.)
* UI completa sin fórmulas duplicadas — sólo consume resultados

**Base de Datos (PostgreSQL + Drizzle):**
* Schema completo con todas las tablas principales
* Migraciones aplicadas y funcionando
* Seed scripts para datos de prueba
* Audit logging implementado

**Sistema de Compras (Implementado):**
* Tablas `purchases` y `purchase_items` implementadas
* Panel de compras integrado en la UI principal
* Creación de facturas manuales con múltiples productos
* Gestión de proveedores integrada
* Cálculo automático de costos por unidad (sqft/sheet)
* Actualización de `cost_sqft` de productos al confirmar compra

**Próximas Mejoras:**
* Importación automática de facturas PDF/Excel
* Análisis de tendencias de precios
* Alertas de variaciones de costo significativas

## 3. Arquitectura Lógica (Resumen)

```text
UI (React Components) --> PricingService --> Repositorios (InMemory | Drizzle) --> Postgres
						   |                               
						   --> Motor Puro (computePrice, resolveEffective, rounding)
```

Principios:

* Capa pura: funciones sin efectos → alta cobertura y facilidad de refactor
* Capa de servicio: orquesta repos + motor, aplica políticas transversales (futuro cache/audit)
* Repositorios: frontera tecnológica (in-memory hoy, Drizzle mañana) manteniendo contrato
* Server Actions: entrada controlada desde UI / API

## 4. Reglas de Dominio Clave

* Precedencia: overrides de producto > overrides de categoría > tier > mínimo global
* Mínimo efectivo = max(product.min_pvp, category.min_pvp, global.min_pvp_global)
* Redondeo: techo al múltiplo (step) configurado (ej: 0.05)
* Salida incluye desglose (componentes ink / lam / cut / margen aplicado)

## 5. Estructura de Carpetas

```text
src/
    app/                # App Router
    lib/pricing/        # Motor puro (sin efectos externos)
    lib/purchases/      # Lógica de compras y cálculos de costos
    repositories/       # Interfaces + implementaciones Drizzle
    services/           # Servicios orquestadores (PricingService, etc.)
    server/actions/     # Server actions (computePriceAction, purchaseActions)
    components/         # UI components (PurchasesPanel, ProductsTable, etc.)
    tests/              # Tests unitarios (Vitest)
    db/                 # Schema, migraciones y seeds
```

## 6. Puesta en Marcha

### Configuración inicial:

```powershell
# Configurar variables de entorno
copy .env.example .env
# Editar .env con credenciales de PostgreSQL

# Instalar dependencias
npm install

# Configurar base de datos
npm run db:generate
npm run db:migrate
npm run db:seed

# Iniciar desarrollo
npm run dev
```

### Comandos disponibles:

```bash
# Desarrollo
npm run dev          # Next.js con Turbopack
npm run build        # Production build
npm run start        # Servir build de producción
npm run lint         # ESLint

# Base de datos
npm run db:generate  # Generar migraciones desde schema
npm run db:migrate   # Aplicar migraciones pendientes
npm run db:seed      # Poblar con datos de prueba
npm run db:studio    # Abrir Drizzle Studio

# Testing
npm run test         # Vitest unit tests
```

## 7. Variables de Entorno

Archivo `.env` requerido:

```env
# Base de datos PostgreSQL
DATABASE_URL=postgres://usuario:password@host:5432/products_ga

# Entorno
NODE_ENV=development
```

## 8. Sistema de Compras (Implementado)

### Funcionalidades

* **Gestión de facturas manuales**: Crear facturas con múltiples productos
* **Gestión de proveedores**: Crear y gestionar proveedores desde el flujo de compras
* **Cálculo automático de costos**: Conversión automática entre unidades (sqft/sheet)
* **Actualización de costos**: Los productos actualizan su `cost_sqft` al confirmar compra
* **Auditoría**: Todas las compras quedan registradas con timestamp

### Tablas de Base de Datos

* `purchases`: facturas con proveedor, fecha, total
* `purchase_items`: líneas de factura con producto, cantidad, precio, unidad
* Enum `purchase_unit`: 'sqft' | 'sheet' para flexibilidad de unidades

### Flujo de Trabajo

1. Acceder al panel "Compras" en la aplicación principal
2. Crear nueva factura seleccionando proveedor (o crear uno nuevo)
3. Agregar productos con cantidad, precio unitario y unidad
4. Confirmar para actualizar costos de productos automáticamente

### Próximas Mejoras

* Importación automática de facturas PDF/Excel
* Análisis de tendencias de precios y alertas
* Integración con sistema de inventario
### 8.1 Estado de Implementación Actual

**Completamente Implementado:**

* `drizzle.config.ts` (configuración de migraciones)
* `src/db/schema.ts` (todas las tablas incluidas purchases/purchase_items)
* `src/db/seed.ts` (semilla completa con datos de prueba)
* `src/db/client.ts` (conexión pooled a PostgreSQL)
* `src/services/auditLogger.ts` (auditoría funcionando)
* `src/repositories/drizzle/*` (todos los repositorios Drizzle implementados)
* `src/components/PurchasesPanel.tsx` (UI completa integrada)
* `src/server/actions/purchaseActions.ts` (server actions de compras)
* `src/lib/purchases/` (lógica pura de cálculos de compras)

**Comandos de Base de Datos:**

```powershell
npm run db:generate    # Generar migraciones
npm run db:migrate     # Aplicar migraciones  
npm run db:seed        # Poblar con datos de prueba
npm run db:studio      # Abrir Drizzle Studio
```

**Backup & Restore:**

```powershell
pg_dump $Env:DATABASE_URL -Fc -f backup.dump
pg_restore -c -d $Env:DATABASE_URL backup.dump
```

## 9. Testing

* Tests unitarios: sólo motor / lógica de precedencia y cálculo
* Próximo: tests de integración sobre Drizzle (sembrado controlado)
* Cobertura: priorizar caminos de negocio y bordes de precedencia (mínimos escalando)

## 10. Auditoría (Roadmap)

* Función `diffFields` ya disponible para generar cambios por campo
* Guardado futuro: insertar una fila por campo cambiado con snapshot antes/después
* Retención y filtrado: índice por entidad + timestamp

## 11. Convenciones de Código

* Tipos en `types.ts` centralizan vocabulario de dominio
* No usar `any`; preferir tipos explícitos composables
* Motor nunca debe importar desde `app/` ni dependencias de React
* Repos no devuelven `undefined` silencioso: usar `null` o lanzar error según caso

## 12. Próximas Mejoras Menores

* Normalizar errores de dominio (`DomainError` base)
* Instrumentación ligera (tiempos de compute) detrás de feature flag
* Métrica de drift si se introduce decimal library

## 13. Cómo Contribuir

1. Añade/ajusta tests primero (rojo)
2. Implementa cambios en motor / servicio
3. Ejecuta `npm run test` y lint
4. Documenta en este README si cambias contratos

## 14. Sistema de Compras - Guía de Uso

### Acceso al Sistema

El sistema de compras está integrado en la aplicación principal. Accede desde el tab "Compras" en la interfaz principal.

### Crear una Nueva Factura

1. **Seleccionar Proveedor**: Elige un proveedor existente o crea uno nuevo
2. **Agregar Productos**: Selecciona productos y especifica:
   - Cantidad comprada
   - Precio unitario pagado
   - Unidad de compra (sqft o sheet)
3. **Revisión**: El sistema calcula automáticamente los totales
4. **Confirmar**: Al confirmar, se actualiza el `cost_sqft` de cada producto

### Gestión de Proveedores

* **Crear nuevo proveedor**: Usa el botón "Crear nuevo proveedor" durante el proceso de compra
* **Proveedores existentes**: Se mantienen como catálogo para futuras compras
* **No se eliminan**: Los proveedores permanecen para mantener historial

### Cálculos Automáticos

* **Conversión de unidades**: Si compras por "sheet", el sistema convierte a costo por sqft usando las dimensiones del producto
* **Actualización de costos**: Solo se actualiza `cost_sqft` cuando confirmas la compra
* **Dimensiones temporales**: Para productos sin dimensiones, puedes especificar temporalmente

### Auditoría y Seguimiento

* Todas las compras quedan registradas con timestamp
* Historial completo de cambios de costos
* Trazabilidad de precios por proveedor

## 15. Licencia

Prototipo interno (licencia pendiente). No distribuir externamente sin autorización.

---

**Estado**: Sistema completamente funcional con motor de precios estable + sistema de compras manuales. El siguiente hito es la importación automática de facturas.
