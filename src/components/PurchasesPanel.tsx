"use client";

import React, { useState } from 'react';
import { createPurchase } from '@/server/actions/purchaseActions';
import { createProvider } from '@/server/actions/providerMutations';
import { calculateCostPerSqft } from '@/lib/purchases/calculations';
import type { CreatePurchaseInput, CreatePurchaseItemInput } from '@/lib/purchases/types';
import type { Provider } from '@/server/queries/getInitialData';
import type { Product } from '@/lib/pricing/types';

interface PurchasesPanelProps {
  suppliers: Provider[];
  products: Product[];
  onSuppliersChange: (suppliers: Provider[]) => void;
}

export function PurchasesPanel({ suppliers, products, onSuppliersChange }: PurchasesPanelProps) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  
  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CreatePurchaseItemInput[]>([
    {
      name: '',
      qty: 1,
      unit: 'sqft',
      amount: 0,
      linked: false,
      appliedToProduct: false,
    }
  ]);

  const resetForm = () => {
    setSupplierId('');
    setInvoiceNo('');
    setDate(new Date().toISOString().split('T')[0]);
    setCurrency('USD');
    setNotes('');
    setShowNewSupplierForm(false);
    setNewSupplierName('');
    setItems([{
      name: '',
      qty: 1,
      unit: 'sqft',
      amount: 0,
      linked: false,
      appliedToProduct: false,
    }]);
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;
    
    setIsCreatingSupplier(true);
    try {
      const newSupplier = await createProvider({ name: newSupplierName.trim() });
      onSuppliersChange([...suppliers, newSupplier]);
      setSupplierId(newSupplier.id);
      setNewSupplierName('');
      setShowNewSupplierForm(false);
    } catch (error) {
      alert('Error al crear proveedor: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const addItem = () => {
    setItems([...items, {
      name: '',
      qty: 1,
      unit: 'sqft',
      amount: 0,
      linked: false,
      appliedToProduct: false,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof CreatePurchaseItemInput, value: string | number | boolean | undefined) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-link logic
    if (field === 'productId' && value) {
      newItems[index].linked = true;
      const product = products.find(p => p.sku === value);
      if (product) {
        newItems[index].name = product.name;
      }
    } else if (field === 'productId' && !value) {
      newItems[index].linked = false;
      newItems[index].appliedToProduct = false;
    }

    setItems(newItems);
  };

  const getCostPerSqft = (item: CreatePurchaseItemInput): number | null => {
    if (!item.productId) {
      return calculateCostPerSqft(item);
    }
    
    const product = products.find(p => p.sku === item.productId);
    return calculateCostPerSqft(item, product?.area_sqft);
  };

  const canApplyToProduct = (item: CreatePurchaseItemInput): boolean => {
    return !!(item.linked && item.productId);
  };

  const needsDimensions = (item: CreatePurchaseItemInput): boolean => {
    return item.unit === 'sheet' && !item.productId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const purchaseData: CreatePurchaseInput = {
        supplierId: supplierId || undefined,
        invoiceNo: invoiceNo || undefined,
        date: new Date(date),
        currency: currency || undefined,
        notes: notes || undefined,
        items: items.filter(item => item.name.trim() && item.qty > 0 && item.amount >= 0),
      };

      await createPurchase(purchaseData);
      
      resetForm();
      setView('list');
      alert('Compra creada exitosamente');
    } catch (error) {
      alert('Error al crear la compra: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Nueva Compra</h2>
            <p className="text-gray-600 text-sm">Registrar factura manual de proveedor</p>
          </div>
          <button
            onClick={() => {
              setView('list');
              resetForm();
            }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5m7-7l-7 7 7 7"/>
            </svg>
            Volver a la lista
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Purchase Header */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Información de la Compra</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor
                </label>
                <div className="flex gap-2">
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewSupplierForm(true)}
                    className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                    title="Crear nuevo proveedor"
                  >
                    +
                  </button>
                </div>
                
                {/* New supplier creation inline */}
                {showNewSupplierForm && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      placeholder="Nombre del nuevo proveedor"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateSupplier();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateSupplier}
                      disabled={isCreatingSupplier || !newSupplierName.trim()}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm"
                    >
                      {isCreatingSupplier ? '...' : 'Crear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewSupplierForm(false);
                        setNewSupplierName('');
                      }}
                      className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. Factura
                </label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: FAC-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="MXN">MXN</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          {/* Purchase Items */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Artículos</h3>
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Agregar Artículo
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* Product Selection */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Producto (opcional)
                      </label>
                      <select
                        value={item.productId || ''}
                        onChange={(e) => updateItem(index, 'productId', e.target.value || undefined)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Sin vincular...</option>
                        {products.map((product) => (
                          <option key={product.sku} value={product.sku}>
                            {product.sku} - {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nombre del artículo"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unidad *
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value as 'sqft' | 'sheet')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="sqft">Pie²</option>
                        <option value="sheet">Hoja</option>
                      </select>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monto *
                      </label>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Sheet Dimensions (when needed) */}
                  {needsDimensions(item) && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800 mb-2">
                        Dimensiones requeridas para cálculo (unidad: hoja sin producto vinculado)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ancho
                          </label>
                          <input
                            type="number"
                            value={item.tempWidth || ''}
                            onChange={(e) => updateItem(index, 'tempWidth', parseFloat(e.target.value) || undefined)}
                            min="0"
                            step="0.1"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Alto
                          </label>
                          <input
                            type="number"
                            value={item.tempHeight || ''}
                            onChange={(e) => updateItem(index, 'tempHeight', parseFloat(e.target.value) || undefined)}
                            min="0"
                            step="0.1"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unidad
                          </label>
                          <select
                            value={item.tempUom || 'in'}
                            onChange={(e) => updateItem(index, 'tempUom', e.target.value as 'in' | 'cm')}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="in">Pulgadas</option>
                            <option value="cm">Centímetros</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cost Calculation & Actions */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      {/* Cost per sqft display */}
                      {(() => {
                        const costPerSqft = getCostPerSqft(item);
                        return costPerSqft !== null ? (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Costo/pie²: </span>
                            <span className="text-green-600 font-mono">
                              ${costPerSqft.toFixed(4)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm text-red-600">
                            Faltan datos para calcular costo/pie²
                          </div>
                        );
                      })()}

                      {/* Apply to product checkbox */}
                      {canApplyToProduct(item) && (
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={item.appliedToProduct}
                            onChange={(e) => updateItem(index, 'appliedToProduct', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            Actualizar precio del producto ahora
                          </span>
                        </label>
                      )}
                    </div>

                    {/* Remove button */}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                setView('list');
                resetForm();
              }}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.every(item => !item.name.trim())}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Guardando...' : 'Crear Compra'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Compras</h2>
          <p className="text-gray-600 text-sm">Gestionar facturas manuales de proveedores</p>
        </div>
        <button
          onClick={() => setView('create')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Nueva Compra
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-center py-8">
          Lista de compras próximamente disponible.<br />
          Por ahora, puedes crear una nueva compra usando el botón de arriba.
        </p>
      </div>
    </div>
  );
}