import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Button, Checkbox, Select } from './ui';
import { 
  ExportConfig, 
  ExportPreset, 
  EXPORT_PRESETS, 
  COLUMN_GROUPS,
  EXPORT_COLUMNS,
  DEFAULT_EXPORT_CONFIG,
  TableState
} from '@/lib/export/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => Promise<void>;
  tableState: TableState;
  totalRows: number;
  filteredRows: number;
  selectedRows: number;
  defaultColumns: string[];
}

export function ExportModal({ 
  isOpen, 
  onClose, 
  onExport, 
  tableState, 
  totalRows, 
  filteredRows, 
  selectedRows,
  defaultColumns
}: ExportModalProps) {
  const [config, setConfig] = useState<ExportConfig>(DEFAULT_EXPORT_CONFIG);
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('basic-price-list');

  const columnOrder = useMemo(
    () => COLUMN_GROUPS.flatMap(group => group.columns.map(column => column.id)),
    []
  );

  const requiredColumnIds = useMemo(
    () => columnOrder.filter(id => EXPORT_COLUMNS[id]?.required),
    [columnOrder]
  );

  const normalizeColumns = useCallback((columns: string[]) => {
    const allowed = new Set(columnOrder);
    const base = new Set(
      columns.filter(column => allowed.has(column))
    );

    requiredColumnIds.forEach(id => base.add(id));

    return columnOrder.filter(id => base.has(id));
  }, [columnOrder, requiredColumnIds]);

  const mergedDefaultColumns = useMemo(
    () => normalizeColumns(defaultColumns.length > 0 ? defaultColumns : DEFAULT_EXPORT_CONFIG.columns),
    [defaultColumns, normalizeColumns]
  );

  const formatLabel = useMemo(() => {
    switch (config.format) {
      case 'excel':
        return 'Excel (.xlsx)';
      case 'csv':
        return 'CSV (.csv)';
      case 'pdf':
      default:
        return 'PDF (próximamente)';
    }
  }, [config.format]);

  const currencyLabel = useMemo(
    () => (config.currency === 'USD' ? 'USD ($)' : 'EUR (€)'),
    [config.currency]
  );

  // Initialize config based on current table state
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const selectedProductIds = tableState.selectedProducts.length > 0
      ? tableState.selectedProducts
      : undefined;

    setSelectedPreset('basic-price-list');

    setConfig({
      ...DEFAULT_EXPORT_CONFIG,
      columns: mergedDefaultColumns,
      selectedProductIds,
      scope: selectedProductIds ? 'selected' : DEFAULT_EXPORT_CONFIG.scope
    });
  }, [isOpen, tableState.selectedProducts, mergedDefaultColumns]);

  const handlePresetSelect = (presetId: string) => {
    const preset = EXPORT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setConfig(prev => ({
        ...preset.config,
        columns: normalizeColumns(preset.config.columns),
        selectedProductIds: prev.selectedProductIds,
        filename: prev.filename
      }));
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(config);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      // Handle error (could show notification)
    } finally {
      setIsExporting(false);
    }
  };

  const getRowCount = () => {
    switch (config.scope) {
      case 'all':
        return totalRows;
      case 'filtered':
        return filteredRows;
      case 'selected':
        return selectedRows;
      case 'active-only':
        return filteredRows; // Assuming filtered already includes active filter
      default:
        return 0;
    }
  };

  const estimateFileSize = () => {
    const rowCount = getRowCount();
    const columnCount = config.columns.length;
    const avgCellSize = 20; // Average bytes per cell
    const sizeBytes = rowCount * columnCount * avgCellSize;
    
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
    return `${Math.round(sizeBytes / (1024 * 1024))} MB`;
  };

  const toggleColumn = (columnId: string) => {
    const column = EXPORT_COLUMNS[columnId];
    if (!column) {
      return;
    }

    if (column.required) {
      return;
    }

    setConfig(prev => {
      const hasColumn = prev.columns.includes(columnId);
      const nextColumns = hasColumn
        ? prev.columns.filter(id => id !== columnId)
        : [...prev.columns, columnId];

      return {
        ...prev,
        columns: normalizeColumns(nextColumns)
      };
    });
  };

  const toggleAllColumns = (groupId: string, enable: boolean) => {
    const group = COLUMN_GROUPS.find(g => g.id === groupId);
    if (!group) return;

    const groupColumnIds = group.columns.map(col => col.id);
    
    setConfig(prev => ({
      ...prev,
      columns: enable
        ? normalizeColumns([...prev.columns, ...groupColumnIds])
        : normalizeColumns(prev.columns.filter(id => !groupColumnIds.includes(id)))
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exportar Productos" size="xl">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('preset')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'preset'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Plantillas
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'custom'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Personalizado
          </button>
        </div>

        {/* Preset Tab */}
        {activeTab === 'preset' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EXPORT_PRESETS.map(preset => (
                <div
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPreset === preset.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{preset.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{preset.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {preset.config.format.toUpperCase()}
                        </span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {preset.config.columns.length} columnas
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Tab */}
        {activeTab === 'custom' && (
          <div className="space-y-6">
            {/* Scope Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alcance de exportación
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="filtered"
                    checked={config.scope === 'filtered'}
                    onChange={(e) => setConfig(prev => ({ ...prev, scope: e.target.value as any }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Productos filtrados ({filteredRows})</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="selected"
                    checked={config.scope === 'selected'}
                    onChange={(e) => setConfig(prev => ({ ...prev, scope: e.target.value as any }))}
                    className="w-4 h-4 text-blue-600"
                    disabled={selectedRows === 0}
                  />
                  <span className={`text-sm ${selectedRows === 0 ? 'text-gray-400' : ''}`}>
                    Productos seleccionados ({selectedRows})
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="all"
                    checked={config.scope === 'all'}
                    onChange={(e) => setConfig(prev => ({ ...prev, scope: e.target.value as any }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Todos los productos ({totalRows})</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="active-only"
                    checked={config.scope === 'active-only'}
                    onChange={(e) => setConfig(prev => ({ ...prev, scope: e.target.value as any }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Solo activos</span>
                </label>
              </div>
            </div>

            {/* Column Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Columnas a exportar
              </label>
              <div className="space-y-4">
                {COLUMN_GROUPS.map(group => {
                  const groupColumns = group.columns;
                  const selectedCount = groupColumns.filter(col => config.columns.includes(col.id)).length;
                  const allSelected = selectedCount === groupColumns.length;
                  const someSelected = selectedCount > 0 && selectedCount < groupColumns.length;

                  return (
                    <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{group.label}</h4>
                        <Checkbox
                          checked={allSelected}
                          onChange={(checked) => toggleAllColumns(group.id, checked)}
                          label={allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
                          className={someSelected ? 'opacity-60' : ''}
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {groupColumns.map(column => (
                          <Checkbox
                            key={column.id}
                            checked={config.columns.includes(column.id)}
                            onChange={() => toggleColumn(column.id)}
                            label={column.label}
                            disabled={column.required}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Format and Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato
                </label>
                <Select
                  value={config.format}
                  onChange={(value) => setConfig(prev => ({ ...prev, format: value as any }))}
                  options={[
                    { value: 'excel', label: 'Excel (.xlsx)' },
                    { value: 'csv', label: 'CSV (.csv)' },
                    { value: 'pdf', label: 'PDF (próximamente)' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda
                </label>
                <Select
                  value={config.currency}
                  onChange={(value) => setConfig(prev => ({ ...prev, currency: value as any }))}
                  options={[
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'EUR', label: 'EUR (€)' }
                  ]}
                />
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-3">
              <Checkbox
                checked={config.includeHeaders}
                onChange={(checked) => setConfig(prev => ({ ...prev, includeHeaders: checked }))}
                label="Incluir encabezados"
              />
              <Checkbox
                checked={config.onlyActive}
                onChange={(checked) => setConfig(prev => ({ ...prev, onlyActive: checked }))}
                label="Solo productos activos"
              />
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Vista previa</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-gray-500">Filas</span>
              <span className="text-lg font-semibold text-gray-900">{getRowCount()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-gray-500">Formato</span>
              <span className="text-sm font-medium text-gray-900">{formatLabel}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-gray-500">Moneda</span>
              <span className="text-sm font-medium text-gray-900">{currencyLabel}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Columnas seleccionadas ({config.columns.length})</span>
              <span className="text-xs text-gray-500">Tamaño estimado: {estimateFileSize()}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
              {config.columns.map(columnId => {
                const column = EXPORT_COLUMNS[columnId];
                return (
                  <span
                    key={columnId}
                    className="inline-flex items-center text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-full px-3 py-1 shadow-sm"
                  >
                    {column?.label ?? columnId}
                  </span>
                );
              })}
              {config.columns.length === 0 && (
                <span className="text-xs text-gray-500 italic">Selecciona al menos una columna</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            variant="primary"
            loading={isExporting}
            disabled={config.columns.length === 0 || getRowCount() === 0}
          >
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}