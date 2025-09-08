npm run build      # Production build
## Products GA — Motor de Precios (Checkpoint antes de Base de Datos)

Proyecto Next.js (App Router) + TypeScript con un motor de precios determinista totalmente separado de la capa UI. Actualmente usa repositorios en memoria; el siguiente hito es migrar a Postgres mediante Drizzle ORM manteniendo las mismas interfaces.

## 1. Objetivo

Centralizar y hacer predecible la lógica de cálculo de PVP (precio de venta) aplicando reglas de precedencia, mínimos efectivos y redondeos configurables, garantizando:

* Determinismo (misma entrada => misma salida)
* Testeabilidad (motor puro sin dependencias de React / fetch / DB)
* Fácil sustitución de capa de persistencia (patrón repositorio con interfaces estables)
* Auditabilidad (differences por campo para cada cambio relevante)

## 2. Estado Actual (Checkpoint)

Implementado:

* Motor puro (`src/lib/pricing/*`: tipos, precedencia, redondeo, cálculo, construcción de filas, export CSV)
* 10 tests Vitest (rounding, precedence, compute, edge cases) todos en verde
* Repositorios en memoria (`src/repositories/memory/*`) detrás de interfaces (`interfaces.ts`)
* `PricingService` orquestando dependencias sin lógica matemática adicional
* Server action `computePriceAction` con seed temporal
* UI (`app/page.tsx`) sin fórmulas duplicadas — sólo consume resultados

Pendiente (fase DB):

1. Drizzle schema + migraciones (`schema.ts`, `drizzle.config.ts`)
2. Implementaciones Drizzle de repos (misma firma pública)
3. Script de seed y validación de entorno
4. Persistencia de auditoría (`audit_log`)
5. Decisión de cache (mem / redis) para precios derivados (opcional)
6. Refuerzo README con pasos de despliegue DB / rollback

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
	repositories/       # Interfaces + impls en memoria
	services/           # Servicios orquestadores (PricingService, etc.)
	server/actions/     # Server actions (computePriceAction)
	tests/              # Tests unitarios (Vitest)
```

## 6. Puesta en Marcha Rápida

```bash
npm install
npm run dev
```

Build y test:

```bash
npm run build
npm run start
npm run test
npm run lint
```

## 7. Variables de Entorno (Próximas)

Archivo `.env` (no versionado) futuro:

```env
DATABASE_URL=postgres://usuario:password@host:5432/products_ga
NODE_ENV=development
```

## 8. Estrategia de Migración a DB

1. Definir `schema.ts` (tablas: providers, tiers, products, category_rules, price_params, audit_log)
2. Generar migración inicial y aplicarla localmente
3. Implementar repos Drizzle (respetando las firmas actuales)
4. Reemplazar seeds en memoria por script `seed.ts` (Drizzle + transacción)
5. Sustituir instancia singleton en server action por container con repos reales
6. Añadir pruebas de integración (PricingService + DB)
7. Añadir rollback docs (`pg_dump` y revert de migraciones)

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

## 14. Licencia

Prototipo interno (licencia pendiente). No distribuir externamente sin autorización.

---

Si necesitas el resumen rápido: motor puro estable + interfaces listas para conectar Postgres. El siguiente paso inmediato es crear el esquema Drizzle.
