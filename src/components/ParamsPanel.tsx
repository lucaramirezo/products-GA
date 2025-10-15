import React, { useState, useEffect } from 'react';
import type { PriceParams, Tier, CategoryRule, Product, ComputeContext, PriceBreakdown } from '@/lib/pricing/types';
import { computePrice } from '@/lib/pricing/compute';
import { AddCategoryForm } from './ui';
import { CommitNumberInput } from './CommitInputs';

interface ParamsPanelProps {
  params: PriceParams;
  tiers: Tier[];
  categoryRules: CategoryRule[];
  products?: Product[]; // For sandbox testing
  onUpdateParams: (patch: Partial<PriceParams>) => void;
  onUpdateTier: (id: number, patch: Partial<Tier>) => void;
  onUpsertCategoryRule: (rule: CategoryRule) => void;
  onDeleteCategoryRule: (category: string) => void;
}

interface ValidationError {
  field: string;
  message: string;
  section: 'params' | 'tiers' | 'categories';
}

export function ParamsPanel({
  params,
  tiers,
  categoryRules,
  products = [],
  onUpdateParams,
  onUpdateTier,
  onUpsertCategoryRule,
  onDeleteCategoryRule
}: ParamsPanelProps) {
  // Local state for tracking changes
  const [localParams, setLocalParams] = useState<PriceParams>(params);
  const [localTiers, setLocalTiers] = useState<Tier[]>(tiers);
  const [localCategoryRules, setLocalCategoryRules] = useState<CategoryRule[]>(categoryRules);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showSandbox, setShowSandbox] = useState(false);
  const [sandboxProduct, setSandboxProduct] = useState<string>('');
  const [sandboxToggles, setSandboxToggles] = useState({ ink: true, lam: true, cut: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Keep local state in sync with props
  useEffect(() => {
    setLocalParams(params);
    setLocalTiers(tiers);
    setLocalCategoryRules(categoryRules);
    setHasChanges(false);
    setValidationErrors([]);
  }, [params, tiers, categoryRules]);

  // Validation functions
  const validateParams = (p: PriceParams): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (p.ink_price < 0) {
      errors.push({ field: 'ink_price', message: 'El precio de tinta no puede ser negativo', section: 'params' });
    }
    if (p.lamination_price < 0) {
      errors.push({ field: 'lamination_price', message: 'El precio de laminación no puede ser negativo', section: 'params' });
    }
    if (p.cut_price < 0) {
      errors.push({ field: 'cut_price', message: 'El precio de corte no puede ser negativo', section: 'params' });
    }
    if (p.cut_factor < 0 || p.cut_factor > 1) {
      errors.push({ field: 'cut_factor', message: 'El factor de corte debe estar entre 0% y 100%', section: 'params' });
    }
    if (p.rounding_step <= 0) {
      errors.push({ field: 'rounding_step', message: 'El redondeo debe ser mayor a 0', section: 'params' });
    }
    
    return errors;
  };

  const validateTiers = (tierList: Tier[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    tierList.forEach(tier => {
      if (tier.mult < 0) {
        errors.push({ 
          field: `tier_${tier.id}_mult`, 
          message: `Tier ${tier.id}: El multiplicador no puede ser negativo`, 
          section: 'tiers' 
        });
      }
      if (tier.number_of_layers < 0) {
        errors.push({ 
          field: `tier_${tier.id}_layers`, 
          message: `Tier ${tier.id}: El número de capas no puede ser negativo`, 
          section: 'tiers' 
        });
      }
    });
    
    return errors;
  };

  const validateCategoryRules = (rules: CategoryRule[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    rules.forEach(rule => {
      if (rule.override_multiplier !== undefined && rule.override_multiplier < 0) {
        errors.push({ 
          field: `cat_${rule.category}_mult`, 
          message: `Categoría ${rule.category}: El multiplicador no puede ser negativo`, 
          section: 'categories' 
        });
      }
      if (rule.override_number_of_layers !== undefined && rule.override_number_of_layers < 0) {
        errors.push({ 
          field: `cat_${rule.category}_layers`, 
          message: `Categoría ${rule.category}: El número de capas no puede ser negativo`, 
          section: 'categories' 
        });
      }
    });
    
    return errors;
  };

  // Update validation when values change
  useEffect(() => {
    const paramErrors = validateParams(localParams);
    const tierErrors = validateTiers(localTiers);
    const categoryErrors = validateCategoryRules(localCategoryRules);
    
    setValidationErrors([...paramErrors, ...tierErrors, ...categoryErrors]);
  }, [localParams, localTiers, localCategoryRules]);

  // Check if there are changes from original values
  useEffect(() => {
    const paramsChanged = JSON.stringify(localParams) !== JSON.stringify(params);
    const tiersChanged = JSON.stringify(localTiers) !== JSON.stringify(tiers);
    const categoriesChanged = JSON.stringify(localCategoryRules) !== JSON.stringify(categoryRules);
    
    setHasChanges(paramsChanged || tiersChanged || categoriesChanged);
  }, [localParams, localTiers, localCategoryRules, params, tiers, categoryRules]);

  const handleParamUpdate = (field: keyof PriceParams, value: string | number) => {
    setLocalParams(prev => ({ ...prev, [field]: value }));
  };

  const handleTierUpdate = (id: number, field: keyof Tier, value: string | number) => {
    setLocalTiers(prev => prev.map(tier => 
      tier.id === id ? { ...tier, [field]: value } : tier
    ));
  };

  const handleCategoryRuleUpdate = (category: string, field: keyof CategoryRule, value: number | undefined) => {
    setLocalCategoryRules(prev => {
      const existingIndex = prev.findIndex(r => r.category === category);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], [field]: value };
        return updated;
      } else {
        return [...prev, { category, [field]: value }];
      }
    });
  };

  const handleAddCategory = (cat: string) => {
    const exists = localCategoryRules.some(x => x.category === cat);
    if (!exists) {
      setLocalCategoryRules(prev => [...prev, { category: cat }]);
    }
  };

  const handleDeleteCategory = (category: string) => {
    setLocalCategoryRules(prev => prev.filter(r => r.category !== category));
  };

  const handleRevert = () => {
    if (window.confirm('¿Estás seguro de que quieres descartar todos los cambios?')) {
      setLocalParams(params);
      setLocalTiers(tiers);
      setLocalCategoryRules(categoryRules);
      setHasChanges(false);
      setValidationErrors([]);
    }
  };

  const handleSave = async () => {
    if (validationErrors.length > 0) {
      alert('Por favor corrige los errores de validación antes de guardar.');
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      // Apply params changes
      const paramsChanges: Partial<PriceParams> = {};
      (Object.keys(localParams) as Array<keyof PriceParams>).forEach(key => {
        if (localParams[key] !== params[key]) {
          (paramsChanges as Record<string, unknown>)[key] = localParams[key];
        }
      });

      if (Object.keys(paramsChanges).length > 0) {
        onUpdateParams(paramsChanges);
      }

      // Apply tier changes
      localTiers.forEach(localTier => {
        const originalTier = tiers.find(t => t.id === localTier.id);
        if (originalTier) {
          const tierChanges: Partial<Tier> = {};
          (Object.keys(localTier) as Array<keyof Tier>).forEach(key => {
            if (localTier[key] !== originalTier[key]) {
              (tierChanges as Record<string, unknown>)[key] = localTier[key];
            }
          });

          if (Object.keys(tierChanges).length > 0) {
            onUpdateTier(localTier.id, tierChanges);
          }
        }
      });

      // Apply category changes
      const originalCategories = categoryRules.map(r => r.category);
      const localCategories = localCategoryRules.map(r => r.category);
      
      // Handle deletions
      originalCategories.forEach(category => {
        if (!localCategories.includes(category)) {
          onDeleteCategoryRule(category);
        }
      });

      // Handle additions and updates
      localCategoryRules.forEach(localRule => {
        const originalRule = categoryRules.find(r => r.category === localRule.category);
        if (!originalRule || JSON.stringify(localRule) !== JSON.stringify(originalRule)) {
          onUpsertCategoryRule(localRule);
        }
      });

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error saving parameters:', error);
      alert('Error al guardar los parámetros: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sandbox calculation
  const calculateSandboxPricing = (): { before: PriceBreakdown | null, after: PriceBreakdown | null } => {
    const product = products.find(p => p.sku === sandboxProduct);
    if (!product) return { before: null, after: null };

    const originalTier = tiers.find(t => t.id === product.active_tier);
    const localTier = localTiers.find(t => t.id === product.active_tier);
    const originalCategoryRule = categoryRules.find(r => r.category === product.category);
    const localCategoryRule = localCategoryRules.find(r => r.category === product.category);

    if (!originalTier || !localTier) return { before: null, after: null };

    const beforeCtx: ComputeContext = {
      product,
      tier: originalTier,
      params,
      categoryRule: originalCategoryRule,
      toggles: sandboxToggles
    };

    const afterCtx: ComputeContext = {
      product,
      tier: localTier,
      params: localParams,
      categoryRule: localCategoryRule,
      toggles: sandboxToggles
    };

    return {
      before: computePrice(beforeCtx),
      after: computePrice(afterCtx)
    };
  };

  const sandboxResults = showSandbox ? calculateSandboxPricing() : { before: null, after: null };

  const getFieldError = (field: string) => {
    return validationErrors.find(e => e.field === field);
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Parámetros de Precios</h2>
          <p className="text-gray-600 text-sm">
            Configurar precios base, tiers y reglas por categoría
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
              {validationErrors.length > 0 ? `${validationErrors.length} errores` : 'Cambios pendientes'}
            </span>
          )}
          
          {submitSuccess && (
            <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              ✓ Guardado exitosamente
            </span>
          )}
          
          <button
            onClick={() => setShowSandbox(!showSandbox)}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            title={showSandbox ? 'Cerrar sandbox de pruebas' : 'Probar cambios sin guardar'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            {showSandbox ? 'Cerrar' : 'Probar cambios'}
          </button>
          
          {hasChanges && (
            <button
              onClick={handleRevert}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              title="Descartar todos los cambios realizados"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Descartar
            </button>
          )}
          
          <button
            onClick={handleSave}
            disabled={!hasChanges || validationErrors.length > 0 || isSubmitting}
            className={`flex items-center gap-2 px-6 py-2 rounded-md transition-colors ${
              !hasChanges || validationErrors.length > 0 || isSubmitting
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={
              !hasChanges ? 'No hay cambios para guardar' :
              validationErrors.length > 0 ? 'Corrige los errores antes de guardar' :
              'Guardar todos los cambios realizados'
            }
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Guardando...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17,21 17,13 7,13 7,21"/>
                  <polyline points="7,3 7,8 15,8"/>
                </svg>
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sandbox Section */}
      {showSandbox && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <h3 className="text-lg font-semibold text-blue-800">Sandbox de Precios</h3>
            <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
              Los cambios aquí NO se guardan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Producto para probar
                </label>
                <select
                  value={sandboxProduct}
                  onChange={(e) => setSandboxProduct(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar producto...</option>
                  {products.map(product => (
                    <option key={product.sku} value={product.sku}>
                      {product.sku} - {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Servicios a incluir
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sandboxToggles.ink}
                      onChange={(e) => setSandboxToggles(prev => ({ ...prev, ink: e.target.checked }))}
                      className="mr-2"
                    />
                    Tinta
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sandboxToggles.lam}
                      onChange={(e) => setSandboxToggles(prev => ({ ...prev, lam: e.target.checked }))}
                      className="mr-2"
                    />
                    Laminación
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sandboxToggles.cut}
                      onChange={(e) => setSandboxToggles(prev => ({ ...prev, cut: e.target.checked }))}
                      className="mr-2"
                    />
                    Corte
                  </label>
                </div>
              </div>
            </div>

            {sandboxProduct && sandboxResults.before && sandboxResults.after && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-800">Comparación de Precios</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-600 mb-2">Antes (Original)</h5>
                    <div className="space-y-1 text-sm">
                      <div>Total: <span className="font-medium">${sandboxResults.before.final.toFixed(2)}</span></div>
                      <div>Por ft²: <span className="font-medium">${sandboxResults.before.final_per_sqft.toFixed(2)}</span></div>
                      <div className="text-xs text-gray-500">
                        Mult: {sandboxResults.before.effective.mult} | 
                        Capas: {sandboxResults.before.effective.number_of_layers}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-600 mb-2">Después (Con cambios)</h5>
                    <div className="space-y-1 text-sm">
                      <div>Total: <span className="font-medium">${sandboxResults.after.final.toFixed(2)}</span></div>
                      <div>Por ft²: <span className="font-medium">${sandboxResults.after.final_per_sqft.toFixed(2)}</span></div>
                      <div className="text-xs text-gray-500">
                        Mult: {sandboxResults.after.effective.mult} | 
                        Capas: {sandboxResults.after.effective.number_of_layers}
                      </div>
                    </div>
                  </div>
                </div>

                {sandboxResults.before.final !== sandboxResults.after.final && (
                  <div className={`p-3 rounded-lg ${
                    sandboxResults.after.final > sandboxResults.before.final 
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-green-50 border border-green-200 text-green-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {sandboxResults.after.final > sandboxResults.before.final ? (
                          <polyline points="18,15 12,9 6,15"/>
                        ) : (
                          <polyline points="6,9 12,15 18,9"/>
                        )}
                      </svg>
                      <span className="font-medium">
                        {sandboxResults.after.final > sandboxResults.before.final ? 'Aumento' : 'Reducción'} de $
                        {Math.abs(sandboxResults.after.final - sandboxResults.before.final).toFixed(2)}
                      </span>
                      <span className="text-sm">
                        ({((sandboxResults.after.final - sandboxResults.before.final) / sandboxResults.before.final * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parameter Form Sections */}
      <div className="space-y-6">
        {/* Global Parameters */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6"/>
              <path d="m21 12-6 0m-6 0-6 0"/>
            </svg>
            <h3 className="text-lg font-semibold">Parámetros Globales</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Aplica a todos los productos
            </span>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Tinta ($/ft²)
                <span className="text-xs text-gray-500" title="Precio por capa de tinta por pie cuadrado">ℹ</span>
              </label>
              <CommitNumberInput
                value={localParams.ink_price}
                onCommit={(newValue) => handleParamUpdate('ink_price', newValue || 0)}
                step={0.01}
                min={0}
                className={`w-full rounded border px-3 py-2 text-sm ${
                  getFieldError('ink_price') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {getFieldError('ink_price') && (
                <p className="text-xs text-red-600">{getFieldError('ink_price')?.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Laminación ($/ft²)
                <span className="text-xs text-gray-500" title="Precio de laminación por pie cuadrado">ℹ</span>
              </label>
              <CommitNumberInput
                value={localParams.lamination_price}
                onCommit={(newValue) => handleParamUpdate('lamination_price', newValue || 0)}
                step={0.01}
                min={0}
                className={`w-full rounded border px-3 py-2 text-sm ${
                  getFieldError('lamination_price') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {getFieldError('lamination_price') && (
                <p className="text-xs text-red-600">{getFieldError('lamination_price')?.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Corte ($/hoja)
                <span className="text-xs text-gray-500" title="Precio fijo por hoja cortada">ℹ</span>
              </label>
              <CommitNumberInput
                value={localParams.cut_price}
                onCommit={(newValue) => handleParamUpdate('cut_price', newValue || 0)}
                step={0.01}
                min={0}
                className={`w-full rounded border px-3 py-2 text-sm ${
                  getFieldError('cut_price') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {getFieldError('cut_price') && (
                <p className="text-xs text-red-600">{getFieldError('cut_price')?.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Factor de Corte (%)
                <span className="text-xs text-gray-500" title="Porcentaje del costo base aplicado como corte">ℹ</span>
              </label>
              <CommitNumberInput
                value={localParams.cut_factor * 100}
                onCommit={(newValue) => handleParamUpdate('cut_factor', (newValue || 0) / 100)}
                step={1}
                min={0}
                max={100}
                className={`w-full rounded border px-3 py-2 text-sm ${
                  getFieldError('cut_factor') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {getFieldError('cut_factor') && (
                <p className="text-xs text-red-600">{getFieldError('cut_factor')?.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Redondeo ($)
                <span className="text-xs text-gray-500" title="Paso de redondeo hacia arriba">ℹ</span>
              </label>
              <CommitNumberInput
                value={localParams.rounding_step}
                onCommit={(newValue) => handleParamUpdate('rounding_step', newValue || 0.01)}
                step={0.01}
                min={0.01}
                className={`w-full rounded border px-3 py-2 text-sm ${
                  getFieldError('rounding_step') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {getFieldError('rounding_step') && (
                <p className="text-xs text-red-600">{getFieldError('rounding_step')?.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Método de Costo</label>
              <select
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                value={localParams.cost_method || 'latest'}
                onChange={(e) => handleParamUpdate('cost_method', e.target.value)}
              >
                <option value="latest">Último (MVP)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tiers */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <rect x="3" y="4" width="18" height="4" rx="1"/>
              <rect x="5" y="10" width="14" height="4" rx="1"/>
              <rect x="7" y="16" width="10" height="4" rx="1"/>
            </svg>
            <h3 className="text-lg font-semibold">Tiers de Producto</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Multiplicador × número de capas
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localTiers.map((tier) => (
              <div key={tier.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-800">
                  Tier {tier.id}
                </h4>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-600">
                    Multiplicador
                  </label>
                  <CommitNumberInput
                    value={tier.mult}
                    onCommit={(newValue) => handleTierUpdate(tier.id, 'mult', newValue || 0)}
                    step={0.1}
                    min={0}
                    className={`w-full rounded border px-2 py-1 text-sm ${
                      getFieldError(`tier_${tier.id}_mult`) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError(`tier_${tier.id}_mult`) && (
                    <p className="text-xs text-red-600">{getFieldError(`tier_${tier.id}_mult`)?.message}</p>
                  )}
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-600">
                    Número de Capas
                  </label>
                  <CommitNumberInput
                    value={tier.number_of_layers}
                    onCommit={(newValue) => handleTierUpdate(tier.id, 'number_of_layers', newValue || 0)}
                    step={1}
                    min={0}
                    className={`w-full rounded border px-2 py-1 text-sm ${
                      getFieldError(`tier_${tier.id}_layers`) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError(`tier_${tier.id}_layers`) && (
                    <p className="text-xs text-red-600">{getFieldError(`tier_${tier.id}_layers`)?.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Rules */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <h3 className="text-lg font-semibold">Reglas por Categoría</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Sobreescribe valores de tier por categoría
            </span>
          </div>
          
          <div className="space-y-3">
            {localCategoryRules.map((rule) => (
              <div key={rule.category} className="flex flex-wrap items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div className="font-semibold min-w-32 text-sm text-gray-800">
                  {rule.category}
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Mult Override</label>
                  <CommitNumberInput
                    value={rule.override_multiplier}
                    onCommit={(newValue) => handleCategoryRuleUpdate(rule.category, 'override_multiplier', newValue || undefined)}
                    step={0.1}
                    min={0}
                    className={`w-20 rounded border px-2 py-1 text-sm ${
                      getFieldError(`cat_${rule.category}_mult`) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Auto"
                  />
                  {getFieldError(`cat_${rule.category}_mult`) && (
                    <span className="text-xs text-red-600">{getFieldError(`cat_${rule.category}_mult`)?.message}</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Capas Override</label>
                  <CommitNumberInput
                    value={rule.override_number_of_layers}
                    onCommit={(newValue) => handleCategoryRuleUpdate(rule.category, 'override_number_of_layers', newValue || undefined)}
                    step={1}
                    min={0}
                    className={`w-16 rounded border px-2 py-1 text-sm ${
                      getFieldError(`cat_${rule.category}_layers`) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Auto"
                  />
                  {getFieldError(`cat_${rule.category}_layers`) && (
                    <span className="text-xs text-red-600">{getFieldError(`cat_${rule.category}_layers`)?.message}</span>
                  )}
                </div>
                
                <button
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                  onClick={() => handleDeleteCategory(rule.category)}
                  title={`Eliminar regla para ${rule.category}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
            
            <AddCategoryForm onAdd={handleAddCategory} />
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      {hasChanges && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-600">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <h3 className="font-semibold text-orange-800">Resumen de Cambios Pendientes</h3>
          </div>
          
          <div className="text-sm text-orange-700 space-y-1">
            {JSON.stringify(localParams) !== JSON.stringify(params) && (
              <div>• Parámetros globales modificados</div>
            )}
            {JSON.stringify(localTiers) !== JSON.stringify(tiers) && (
              <div>• Configuración de tiers actualizada</div>
            )}
            {JSON.stringify(localCategoryRules) !== JSON.stringify(categoryRules) && (
              <div>• Reglas de categoría modificadas</div>
            )}
            
            {validationErrors.length > 0 && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <div className="font-medium text-red-800 mb-1">Errores de validación:</div>
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-red-700">• {error.message}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
