import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Product } from '@/lib/pricing/types';
import type { AuditEntry } from '@/server/queries/getInitialData';
import { buildPricedProductRow } from '@/lib/pricing/row';
import { Th, Td, Button, Input, Card, IconButton } from './ui';
import { CommitNumberInput } from './CommitInputs';

// const CURRENCY = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

interface CostSourceInfo {
  source: 'FACTURA' | 'MANUAL';
  purchase?: {
    id: string;
    invoice_no?: string;
    supplier_name?: string;
    date: string;
    item_name: string;
    quantity: number;
    area_sqft_per_unit: number;
    unit_price: number;
    cost_ft2_line: number;
  };
}

// Helper function to get cost source from audit log
function getCostSource(productSku: string, audit: AuditEntry[]): CostSourceInfo {
  // Find the most recent cost_sqft audit entry for this product
  const lastCostAudit = audit
    .filter(entry => entry.entity === 'products' && entry.id === productSku && entry.field === 'cost_sqft')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (!lastCostAudit) {
    return { source: 'MANUAL' };
  }

  // Check if this audit entry has purchase information in the 'after' field
  const afterData = lastCostAudit.after as Record<string, unknown>;
  if (afterData && typeof afterData === 'object' && afterData.source === 'purchase') {
    return {
      source: 'FACTURA',
      purchase: {
        id: String(afterData.purchase_id || ''),
        invoice_no: afterData.invoice_no ? String(afterData.invoice_no) : undefined,
        supplier_name: afterData.supplier_name ? String(afterData.supplier_name) : undefined,
        date: lastCostAudit.date,
        item_name: String(afterData.item_name || ''),
        quantity: Number(afterData.quantity || 0),
        area_sqft_per_unit: Number(afterData.area_sqft_per_unit || 0),
        unit_price: Number(afterData.unit_price || 0),
        cost_ft2_line: Number(afterData.cost_ft2_line || 0)
      }
    };
  }

  return { source: 'MANUAL' };
}

interface ProductsTableProps {
  computedProducts: ReturnType<typeof buildPricedProductRow>[];
  query: string;
  onQueryChange: (query: string) => void;
  showAudit: boolean;
  onToggleAudit: () => void;
  onExportCSV: (full?: boolean) => void;
  onCreateProduct: () => void;
  onEditProduct: (sku: string) => void;
  onUpdateProduct: (sku: string, patch: Partial<Product>) => void;
  providerName: (id: string) => string;
  audit: AuditEntry[];
  tiers: Array<{ id: number; mult: number; number_of_layers: number }>;
}

export function ProductsTable({
  computedProducts,
  query,
  onQueryChange,
  showAudit,
  onToggleAudit,
  onExportCSV,
  onCreateProduct,
  onEditProduct,
  onUpdateProduct,
  providerName,
  audit,
  tiers
}: ProductsTableProps) {
  const [selectedProductForPurchaseInfo, setSelectedProductForPurchaseInfo] = useState<string | null>(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  
  // Close column selector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Define available columns for the selector
  const [visibleColumns, setVisibleColumns] = useState({
    sku: true,
    producto: true,
    proveedor: true,
    categoria: true,
    cost: true,
    modo: true,
    tier: true,
    base: false, // Start hidden to reduce clutter
    ink: false,
    lam: false,
    cut: false,
    addons: false,
    final: true,
    area: true,
    activo: true,
    acciones: true
  });

  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: 'sku' | 'name' | 'cost_sqft' | 'final' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  // Sorting function
  const handleSort = (key: 'sku' | 'name' | 'cost_sqft' | 'final') => {
    setSortConfig(prevSort => ({
      key,
      direction: prevSort.key === key && prevSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort the products based on current sort config
  const sortedProducts = useMemo(() => {
    if (!sortConfig.key) return computedProducts;
    
    return [...computedProducts].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortConfig.key) {
        case 'sku':
          aValue = a.product.sku;
          bValue = b.product.sku;
          break;
        case 'name':
          aValue = a.product.name;
          bValue = b.product.name;
          break;
        case 'cost_sqft':
          aValue = a.product.cost_sqft;
          bValue = b.product.cost_sqft;
          break;
        case 'final':
          aValue = a.finalPrice;
          bValue = b.finalPrice;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [computedProducts, sortConfig]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Productos</h2>
          <p className="text-gray-600 text-sm">Gestiona tu catálogo de productos y precios</p>
        </div>
        <Button
          onClick={onCreateProduct}
          variant="success"
          size="md"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Nuevo producto
        </Button>
      </div>

      {/* Search and Controls */}
      <Card className="p-6">

        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              value={query}
              onChange={onQueryChange}
              placeholder="Buscar SKU, nombre, categoría o proveedor…"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          
          {/* Utility Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => onExportCSV(false)}
              variant="secondary"
              size="sm"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              <span className="hidden sm:inline">Exportar CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            
            <Button
              onClick={() => onExportCSV(true)}
              variant="secondary"
              size="sm"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                }
            >
              <span className="hidden sm:inline">Exportar Full</span>
              <span className="sm:hidden">Full</span>
            </Button>
            
            <Button
              onClick={onToggleAudit}
              variant="secondary"
              size="sm"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            >
              {showAudit ? "Ocultar" : "Ver"} auditoría
            </Button>
            
            {/* Column Selector */}
            <div className="relative" ref={columnSelectorRef}>
              <Button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                variant="secondary"
                size="sm"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                }
              >
                <span className="hidden sm:inline">Columnas</span>
                <span className="sm:hidden">Col</span>
              </Button>
              
              {showColumnSelector && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10 p-2">
                  <div className="text-xs font-medium text-slate-700 mb-2">Mostrar columnas:</div>
                  <div className="space-y-1">
                    {Object.entries({
                      sku: 'SKU',
                      producto: 'Producto', 
                      proveedor: 'Proveedor',
                      categoria: 'Categoría',
                      cost: 'Cost/ft²',
                      modo: 'Modo',
                      tier: 'Tier',
                      base: 'Base',
                      ink: 'Ink',
                      lam: 'Lam',
                      cut: 'Cut',
                      addons: 'Add-ons',
                      final: 'Final',
                      area: 'Area',
                      activo: 'Activo',
                      acciones: 'Acciones'
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={visibleColumns[key as keyof typeof visibleColumns]}
                          onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                          className="w-3 h-3"
                        />
                        <span className="text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>        {/* Stats */}
        <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
          <span>{computedProducts.length} producto{computedProducts.length !== 1 ? 's' : ''}</span>
          {query && (
            <span className="text-blue-600">
              Filtrado{computedProducts.length === 0 ? ' - sin resultados' : ''}
            </span>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                {visibleColumns.sku && (
                  <Th 
                    sortable 
                    onSort={() => handleSort('sku')}
                    sortDirection={sortConfig.key === 'sku' ? sortConfig.direction : null}
                  >
                    SKU
                  </Th>
                )}
                {visibleColumns.producto && (
                  <Th 
                    sortable 
                    onSort={() => handleSort('name')}
                    sortDirection={sortConfig.key === 'name' ? sortConfig.direction : null}
                  >
                    Producto
                  </Th>
                )}
                {visibleColumns.proveedor && <Th>Proveedor</Th>}
                {visibleColumns.categoria && <Th>Categoría</Th>}
                {visibleColumns.cost && (
                  <Th 
                    className="text-right" 
                    sortable 
                    onSort={() => handleSort('cost_sqft')}
                    sortDirection={sortConfig.key === 'cost_sqft' ? sortConfig.direction : null}
                  >
                    Cost/ft²
                  </Th>
                )}
                {visibleColumns.modo && <Th>Modo</Th>}
                {visibleColumns.tier && <Th>Tier</Th>}
                {visibleColumns.base && <Th className="text-right">Base</Th>}
                {visibleColumns.ink && <Th className="text-right">Ink</Th>}
                {visibleColumns.lam && <Th className="text-right">Lam</Th>}
                {visibleColumns.cut && <Th className="text-right">Cut</Th>}
                {visibleColumns.addons && <Th className="text-right">Add-ons</Th>}
                {visibleColumns.final && (
                  <Th 
                    className="text-right" 
                    sortable 
                    onSort={() => handleSort('final')}
                    sortDirection={sortConfig.key === 'final' ? sortConfig.direction : null}
                  >
                    Final
                  </Th>
                )}
                {visibleColumns.area && <Th>Area</Th>}
                {visibleColumns.activo && <Th>Activo</Th>}
                {visibleColumns.acciones && <Th className="w-12">Acciones</Th>}
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((row) => (
                <ProductRow
                  key={row.product.sku}
                  row={row}
                  onEditProduct={onEditProduct}
                  onUpdateProduct={onUpdateProduct}
                  providerName={providerName}
                  tiers={tiers}
                  audit={audit}
                  selectedProductForPurchaseInfo={selectedProductForPurchaseInfo}
                  onShowPurchaseInfo={setSelectedProductForPurchaseInfo}
                  visibleColumns={visibleColumns}
                />
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Empty State */}
        {computedProducts.length === 0 && (
          <div className="py-12 text-center">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No hay productos</h3>
            <p className="text-slate-500 mb-4">
              {query ? 'No se encontraron productos que coincidan con tu búsqueda.' : 'Comienza creando tu primer producto.'}
            </p>
            {!query && (
              <Button onClick={onCreateProduct} variant="primary">
                Crear primer producto
              </Button>
            )}
          </div>
        )}
      </Card>
      
      {/* Purchase Info Panel */}
      {selectedProductForPurchaseInfo && (() => {
        const selectedProduct = computedProducts.find(p => p.product.sku === selectedProductForPurchaseInfo);
        const costSource = selectedProduct ? getCostSource(selectedProduct.product.sku, audit) : null;
        
        if (!selectedProduct || !costSource?.purchase) return null;
        
        return (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-semibold text-blue-900">
                Último coste aplicado - {selectedProduct.product.name} ({selectedProduct.product.sku})
              </h4>
              <IconButton
                onClick={() => setSelectedProductForPurchaseInfo(null)}
                variant="ghost"
                size="sm"
                title="Cerrar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconButton>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Factura:</span>
                <div className="text-gray-900">{costSource.purchase.invoice_no || 'S/N'}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Fecha:</span>
                <div className="text-gray-900">{new Date(costSource.purchase.date).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Cantidad:</span>
                <div className="text-gray-900">{costSource.purchase.quantity}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Área por unidad:</span>
                <div className="text-gray-900">{costSource.purchase.area_sqft_per_unit} sq ft</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Precio unitario:</span>
                <div className="text-gray-900">${costSource.purchase.unit_price.toFixed(2)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Costo/ft²:</span>
                <div className="text-gray-900 font-medium">${costSource.purchase.cost_ft2_line.toFixed(4)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Artículo:</span>
                <div className="text-gray-900">{costSource.purchase.item_name}</div>
              </div>
            </div>
          </Card>
        );
      })()}
      
      {/* Formula Note */}
      <Card className="p-4 bg-slate-50">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-slate-700 mb-1">Fórmula de cálculo</h4>
            <p className="text-sm text-slate-600">
              Base = (cost_sqft × mult × área) + Ink(ink_price × layers × área) + Lam(lam_price × área) + Cut(cut_factor × base, solo modo SQFT) → redondeo hacia arriba
            </p>
          </div>
        </div>
      </Card>
      
      {showAudit && (
        <Card className="overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Auditoría de cambios</h3>
            <p className="text-sm text-slate-600 mt-1">Últimos {audit.length} cambios registrados</p>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <Th>Fecha</Th>
                  <Th>Usuario</Th>
                  <Th>Entidad</Th>
                  <Th>ID</Th>
                  <Th>Campo</Th>
                  <Th>Anterior</Th>
                  <Th>Nuevo</Th>
                </tr>
              </thead>
              <tbody>
                {audit.slice(0, 50).map((a, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <Td className="whitespace-nowrap">{new Date(a.date).toLocaleString()}</Td>
                    <Td>{a.user}</Td>
                    <Td>{a.entity}</Td>
                    <Td>{a.id}</Td>
                    <Td>{a.field}</Td>
                    <Td className="max-w-[150px] truncate" title={String(a.before)}>{String(a.before)}</Td>
                    <Td className="max-w-[150px] truncate" title={String(a.after)}>{String(a.after)}</Td>
                  </tr>
                ))}
                {audit.length > 50 && (
                  <tr>
                    <Td colSpan={7} className="text-center text-slate-500 italic py-4">
                      Mostrando los primeros 50 de {audit.length} registros
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

interface ProductRowProps {
  row: ReturnType<typeof buildPricedProductRow>;
  onEditProduct: (sku: string) => void;
  onUpdateProduct: (sku: string, patch: Partial<Product>) => void;
  providerName: (id: string) => string;
  tiers: Array<{ id: number; mult: number; number_of_layers: number }>;
  audit: AuditEntry[];
  selectedProductForPurchaseInfo: string | null;
  onShowPurchaseInfo: (sku: string | null) => void;
  visibleColumns: {
    sku: boolean;
    producto: boolean;
    proveedor: boolean;
    categoria: boolean;
    cost: boolean;
    modo: boolean;
    tier: boolean;
    base: boolean;
    ink: boolean;
    lam: boolean;
    cut: boolean;
    addons: boolean;
    final: boolean;
    area: boolean;
    activo: boolean;
    acciones: boolean;
  };
}

function ProductRow({ 
  row, 
  onEditProduct, 
  onUpdateProduct, 
  providerName, 
  tiers, 
  audit, 
  selectedProductForPurchaseInfo, 
  onShowPurchaseInfo,
  visibleColumns
}: ProductRowProps) {
  const costSource = getCostSource(row.product.sku, audit);

  return (
    <tr className={`hover:bg-slate-50 transition-colors ${!row.product.active ? "opacity-60" : ""}`}>
      {/* SKU */}
      {visibleColumns.sku && (
        <Td>
          <button
            className="text-blue-600 hover:text-blue-800 font-medium"
            onClick={() => onEditProduct(row.product.sku)}
            title="Editar producto"
          >
            {row.product.sku}
          </button>
        </Td>
      )}
      
      {/* Producto */}
      {visibleColumns.producto && (
        <Td className="max-w-[200px]">
          <div className="truncate" title={row.product.name}>
            {row.product.name}
          </div>
        </Td>
      )}
      
      {/* Proveedor */}
      {visibleColumns.proveedor && (
        <Td>
          {providerName(row.product.providerId)}
        </Td>
      )}
      
      {/* Categoría */}
      {visibleColumns.categoria && (
        <Td>
          {row.product.category}
        </Td>
      )}
      
      {/* Cost/ft² */}
      {visibleColumns.cost && (
        <Td className={`text-right tabular-nums ${row.product.cost_sqft === 0 ? 'text-red-600 font-semibold' : ''}`} 
            title={row.product.cost_sqft === 0 ? 'Coste = 0 (revisar)' : undefined}>
          <div className="flex items-center justify-end gap-2">
            <span>{row.product.cost_sqft.toFixed(2)}</span>
            <span 
              className={`text-xs px-1.5 py-0.5 rounded font-medium cursor-help ${
                costSource.source === 'FACTURA' 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={
                costSource.source === 'FACTURA' && costSource.purchase
                  ? `Origen: Factura\nFactura: ${costSource.purchase.invoice_no || 'S/N'}\nFecha: ${new Date(costSource.purchase.date).toLocaleDateString()}\nCosto/ft²: $${costSource.purchase.cost_ft2_line.toFixed(4)}\n\nClick para ver detalles`
                  : 'Origen: Manual'
              }
              onClick={() => {
                if (costSource.source === 'FACTURA' && costSource.purchase) {
                  onShowPurchaseInfo(
                    selectedProductForPurchaseInfo === row.product.sku 
                      ? null 
                      : row.product.sku
                  );
                }
              }}
            >
              {costSource.source === 'FACTURA' ? 'F' : 'M'}
            </span>
          </div>
        </Td>
      )}
      
      {/* Modo */}
      {visibleColumns.modo && (
        <Td>
          <span className={`text-xs px-2 py-1 rounded ${row.product.sell_mode === 'SQFT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
            {row.product.sell_mode}
          </span>
        </Td>
      )}
      
      {/* Tier */}
      {visibleColumns.tier && (
        <Td>
          <select
            className="bg-transparent border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={row.product.active_tier}
            onChange={(e) => onUpdateProduct(row.product.sku, { active_tier: Number(e.target.value) })}
          >
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>{t.id}</option>
            ))}
          </select>
        </Td>
      )}
      
      {/* Base */}
      {visibleColumns.base && (
        <Td className="text-right tabular-nums" title={`Base per sqft: ${row.activePricing.base_per_sqft.toFixed(2)}`}>
          {row.activePricing.base_total.toFixed(2)}
        </Td>
      )}
      
      {/* Ink */}
      {visibleColumns.ink && (
        <Td className="text-right tabular-nums">
          {row.activePricing.ink_add ? row.activePricing.ink_add.toFixed(2) : "—"}
        </Td>
      )}
      
      {/* Lam */}
      {visibleColumns.lam && (
        <Td className="text-right tabular-nums">
          {row.activePricing.lam_add ? row.activePricing.lam_add.toFixed(2) : "—"}
        </Td>
      )}
      
      {/* Cut */}
      {visibleColumns.cut && (
        <Td className="text-right tabular-nums">
          {row.activePricing.cut_add ? row.activePricing.cut_add.toFixed(2) : 
           (row.product.cut_enabled && row.product.sell_mode === 'SHEET') ? 
           <span className="text-orange-500 text-xs" title="Cutting disabled for SHEET mode">⚠️</span> : "—"}
        </Td>
      )}
      
      {/* Add-ons */}
      {visibleColumns.addons && (
        <Td className="text-right tabular-nums">
          {row.activePricing.addons_total.toFixed(2)}
        </Td>
      )}
      
      {/* Final Price */}
      {visibleColumns.final && (
        <Td className="text-right tabular-nums font-semibold text-slate-900">
          ${row.finalPrice.toFixed(2)} 
        </Td>
      )}
      
      {/* Area */}
      {visibleColumns.area && (
        <Td className="text-center">
          <CommitNumberInput
            value={row.product.area_sqft}
            onCommit={(newValue) => onUpdateProduct(row.product.sku, { area_sqft: Math.max(0.01, newValue || 0.01) })}
            step={0.01}
            min={0.01}
            className="w-20 border border-slate-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Td>
      )}
      
      {/* Activo */}
      {visibleColumns.activo && (
        <Td className="text-center">
          <input
            type="checkbox"
            checked={row.product.active}
            onChange={(e) => onUpdateProduct(row.product.sku, { active: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
        </Td>
      )}
      
      {/* Actions */}
      <Td>
        <IconButton
          onClick={() => onEditProduct(row.product.sku)}
          variant="ghost"
          size="sm"
          title="Editar producto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </IconButton>
      </Td>
    </tr>
  );
}
