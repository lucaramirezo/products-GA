"use client";

import React, { useState, useEffect } from 'react';
import { createPurchase, updatePurchase, deletePurchase } from '@/server/actions/purchaseActions';
import { getPurchasesList, getPurchaseById } from '@/server/actions/purchaseQueries';
import { createProvider } from '@/server/actions/providerMutations';
import { calculateCostPerSqft } from '@/lib/purchases/calculations';
import type { CreatePurchaseInput, CreatePurchaseItemInput, PurchaseWithDetails } from '@/lib/purchases/types';
import type { Provider } from '@/server/queries/getInitialData';
import type { Product, CategoryRule } from '@/lib/pricing/types';

interface PurchasesPanelProps {
  suppliers: Provider[];
  products: Product[];
  onSuppliersChange: (suppliers: Provider[]) => void;
  categoryRules: CategoryRule[]; // Add category rules for dropdown
}

export function PurchasesPanel({ suppliers, products, onSuppliersChange, categoryRules }: PurchasesPanelProps) {
  const [view, setView] = useState<'list' | 'create' | 'view' | 'edit'>('list');
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithDetails | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseWithDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [purchasesList, setPurchasesList] = useState<PurchaseWithDetails[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [totalPurchases, setTotalPurchases] = useState(0);
  
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

  // Load purchases list
  useEffect(() => {
    if (view === 'list') {
      loadPurchases();
    }
  }, [view, searchTerm, selectedSupplier]);

  const loadPurchases = async () => {
    setListLoading(true);
    try {
      const result = await getPurchasesList({
        limit: 50,
        offset: 0,
        search: searchTerm || undefined,
        supplierId: selectedSupplier || undefined
      });
      setPurchasesList(result.purchases);
      setTotalPurchases(result.total);
    } catch (error) {
      console.error('Error loading purchases:', error);
      alert('Error al cargar las compras: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setListLoading(false);
    }
  };

  const loadPurchaseDetails = async (purchaseId: string) => {
    try {
      const purchase = await getPurchaseById(purchaseId);
      if (purchase) {
        setSelectedPurchase(purchase);
        setView('view');
      } else {
        alert('No se pudo cargar la compra');
      }
    } catch (error) {
      console.error('Error loading purchase details:', error);
      alert('Error al cargar los detalles de la compra');
    }
  };

  const handleEditPurchase = async (purchaseId: string) => {
    try {
      const purchase = await getPurchaseById(purchaseId);
      if (purchase) {
        setEditingPurchase(purchase);
        // Populate form with purchase data
        setSupplierId(purchase.supplierId || '');
        setInvoiceNo(purchase.invoiceNo || '');
        setDate(purchase.date.toISOString().split('T')[0]);
        setCurrency(purchase.currency || 'USD');
        setNotes(purchase.notes || '');
        
        // Convert purchase items to CreatePurchaseItemInput format
        const formItems: CreatePurchaseItemInput[] = purchase.items.map(item => ({
          name: item.name,
          qty: item.qty,
          unit: item.unit,
          amount: item.amount,
          linked: item.linked,
          appliedToProduct: item.appliedToProduct,
          productId: item.productId,
          tempWidth: item.tempWidth,
          tempHeight: item.tempHeight,
          tempUom: item.tempUom as 'in' | 'cm' | undefined,
          linkingMode: item.productId ? 'existing' : 'none'
        }));
        setItems(formItems);
        setView('edit');
      } else {
        alert('No se pudo cargar la compra para editar');
      }
    } catch (error) {
      console.error('Error loading purchase for editing:', error);
      alert('Error al cargar la compra para editar');
    }
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!showDeleteConfirm || showDeleteConfirm !== purchaseId) {
      setShowDeleteConfirm(purchaseId);
      return;
    }

    setIsDeleting(true);
    try {
      await deletePurchase(purchaseId);
      setShowDeleteConfirm(null);
      // Reload the list
      await loadPurchases();
      alert('Compra eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting purchase:', error);
      alert('Error al eliminar la compra: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

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
      linkingMode: 'none',
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof CreatePurchaseItemInput, value: string | number | boolean | undefined) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-link logic for existing products
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

    // Clear dependent fields when linking mode changes
    if (field === 'linkingMode') {
      if (value === 'none') {
        newItems[index].productId = undefined;
        newItems[index].linked = false;
        newItems[index].newProductCategory = undefined;
        newItems[index].newProductArea = undefined;
      } else if (value === 'existing') {
        newItems[index].newProductCategory = undefined;
        newItems[index].newProductArea = undefined;
      } else if (value === 'create') {
        newItems[index].productId = undefined;
        newItems[index].linked = false;
      }
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

  const getValidationError = (item: CreatePurchaseItemInput): string | null => {
    if (!item.name.trim()) return null; // Skip validation for empty items
    
    if (item.qty <= 0) return 'La cantidad debe ser mayor a 0';
    if (item.amount < 0) return 'El monto no puede ser negativo';
    
    // Validate product linking
    if (item.linkingMode === 'existing' && !item.productId) {
      return 'Debe seleccionar un producto para vincularlo';
    }
    
    if (item.linkingMode === 'create') {
      if (!item.newProductCategory?.trim()) {
        return 'Se requiere categoría para crear un nuevo producto';
      }
      if (!item.newProductArea || item.newProductArea <= 0) {
        return 'Se requiere área válida para crear un nuevo producto';
      }
    }
    
    if (item.unit === 'sheet') {
      if (!item.productId && (!item.tempWidth || !item.tempHeight || !item.tempUom)) {
        return 'Se requieren dimensiones para unidad "hoja" sin producto';
      }
      
      if (item.tempWidth && item.tempWidth <= 0) return 'El ancho debe ser mayor a 0';
      if (item.tempHeight && item.tempHeight <= 0) return 'El alto debe ser mayor a 0';
      
      // Check if area calculation would be valid
      const costPerSqft = getCostPerSqft(item);
      if (item.qty > 0 && item.amount > 0 && costPerSqft === null) {
        return 'Error en cálculo de área - verifique las dimensiones';
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all items
    const validItems = items.filter(item => item.name.trim());
    if (validItems.length === 0) {
      alert('La compra debe tener al menos un artículo válido');
      return;
    }
    
    // Check for validation errors
    for (let i = 0; i < validItems.length; i++) {
      const error = getValidationError(validItems[i]);
      if (error) {
        alert(`Error en artículo ${i + 1}: ${error}`);
        return;
      }
    }
    
    setIsSubmitting(true);

    try {
      if (view === 'edit' && editingPurchase) {
        // Update existing purchase
        const updateData = {
          supplierId: supplierId || undefined,
          invoiceNo: invoiceNo || undefined,
          date: new Date(date),
          currency: currency || undefined,
          notes: notes || undefined,
        };

        await updatePurchase(editingPurchase.id, updateData);
        alert('Compra actualizada exitosamente');
      } else {
        // Create new purchase
        const purchaseData: CreatePurchaseInput = {
          supplierId: supplierId || undefined,
          invoiceNo: invoiceNo || undefined,
          date: new Date(date),
          currency: currency || undefined,
          notes: notes || undefined,
          items: validItems.filter(item => item.qty > 0 && item.amount >= 0),
        };

        await createPurchase(purchaseData);
        alert('Compra creada exitosamente');
      }
      
      resetForm();
      setEditingPurchase(null);
      setView('list');
      // List will reload automatically due to useEffect
    } catch (error) {
      const action = view === 'edit' ? 'actualizar' : 'crear';
      alert(`Error al ${action} la compra: ` + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === 'create' || view === 'edit') {
    const isEditing = view === 'edit';
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">{isEditing ? 'Editar Compra' : 'Nueva Compra'}</h2>
            <p className="text-gray-600 text-sm">
              {isEditing ? 'Modificar información de la compra' : 'Registrar factura manual de proveedor'}
            </p>
          </div>
          <button
            onClick={() => {
              setView('list');
              resetForm();
              setEditingPurchase(null);
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
              {items.map((item, index) => {
                const validationError = getValidationError(item);
                return (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  {validationError && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                      ⚠️ {validationError}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* Product Linking Options */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vinculación de Producto
                      </label>
                      
                      {/* Improved linking mode selection with better layout */}
                      <div className="grid grid-cols-3 gap-1 mb-3">
                        <button
                          type="button"
                          onClick={() => updateItem(index, 'linkingMode', 'none')}
                          className={`p-2 text-xs rounded-md border transition-all ${
                            item.linkingMode === 'none' || !item.linkingMode
                              ? 'bg-gray-500 text-white border-gray-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Sin vincular
                        </button>
                        <button
                          type="button"
                          onClick={() => updateItem(index, 'linkingMode', 'existing')}
                          className={`p-2 text-xs rounded-md border transition-all ${
                            item.linkingMode === 'existing'
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Existente
                        </button>
                        <button
                          type="button"
                          onClick={() => updateItem(index, 'linkingMode', 'create')}
                          className={`p-2 text-xs rounded-md border transition-all ${
                            item.linkingMode === 'create'
                              ? 'bg-green-500 text-white border-green-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Crear nuevo
                        </button>
                      </div>
                        
                      {/* Existing Product Selection */}
                      {item.linkingMode === 'existing' && (
                        <select
                          value={item.productId || ''}
                          onChange={(e) => updateItem(index, 'productId', e.target.value || undefined)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Seleccionar producto...</option>
                          {products.map((product) => (
                            <option key={product.sku} value={product.sku}>
                              {product.sku} - {product.name}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      {/* New Product Creation Form */}
                      {item.linkingMode === 'create' && (
                        <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-md">
                          <div className="text-xs font-medium text-green-800 mb-2">Nuevo Producto</div>
                          
                          {/* Category Dropdown */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría *</label>
                            <select
                              value={item.newProductCategory || ''}
                              onChange={(e) => updateItem(index, 'newProductCategory', e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                              <option value="">Seleccionar categoría...</option>
                              {categoryRules.map((rule) => (
                                <option key={rule.category} value={rule.category}>
                                  {rule.category}
                                </option>
                              ))}
                              <option value="General">General</option>
                              <option value="LargeFormat">LargeFormat</option>
                              <option value="Printing">Printing</option>
                              <option value="Signage">Signage</option>
                            </select>
                          </div>
                          
                          {/* Area Input with better step */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Área (sq ft) *</label>
                            <input
                              type="number"
                              value={item.newProductArea || ''}
                              onChange={(e) => updateItem(index, 'newProductArea', parseFloat(e.target.value) || 0)}
                              placeholder="Ej: 12, 24, 48..."
                              min="1"
                              step="1"
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                            <div className="text-xs text-gray-500 mt-1">Valores comunes: 12, 24, 36, 48 sq ft</div>
                          </div>
                        </div>
                      )}
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
                      {canApplyToProduct(item) && (() => {
                        const costPerSqft = getCostPerSqft(item);
                        const product = products.find(p => p.sku === item.productId);
                        return (
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={item.appliedToProduct}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked && costPerSqft !== null && product) {
                                  const confirmed = window.confirm(
                                    `¿Vas a actualizar el coste de "${product.name}" (${product.sku}) a $${costPerSqft.toFixed(4)}/ft²?\n\n` +
                                    `Coste actual: $${product.cost_sqft}/ft²\n` +
                                    `Nuevo coste: $${costPerSqft.toFixed(4)}/ft²`
                                  );
                                  if (confirmed) {
                                    updateItem(index, 'appliedToProduct', true);
                                  }
                                } else {
                                  updateItem(index, 'appliedToProduct', checked);
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              Actualizar precio del producto ahora
                            </span>
                          </label>
                        );
                      })()}
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
                );
              })}
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
              disabled={isSubmitting || items.every(item => !item.name.trim()) || items.some(item => getValidationError(item) !== null)}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar Compra' : 'Crear Compra')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // View purchase details
  if (view === 'view' && selectedPurchase) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Detalles de Compra</h2>
            <p className="text-gray-600 text-sm">Información de la factura {selectedPurchase.invoiceNo || 'sin número'}</p>
          </div>
          <button
            onClick={() => {
              setView('list');
              setSelectedPurchase(null);
            }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5m7-7l-7 7 7 7"/>
            </svg>
            Volver a la lista
          </button>
        </div>

        {/* Purchase Header Info */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Información General</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <div className="text-sm text-gray-900">
                {new Date(selectedPurchase.date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <div className="text-sm text-gray-900">
                {selectedPurchase.supplierName || 'Sin proveedor'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. Factura</label>
              <div className="text-sm text-gray-900">
                {selectedPurchase.invoiceNo || '-'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <div className="text-sm text-gray-900">
                {selectedPurchase.currency || 'USD'}
              </div>
            </div>
          </div>
          
          {selectedPurchase.notes && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                {selectedPurchase.notes}
              </div>
            </div>
          )}
        </div>

        {/* Purchase Items */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Artículos ({selectedPurchase.itemsCount})</h3>
          </div>
          
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto Vinculado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costo/sq ft
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedPurchase.items.map((item, index) => {
                  const product = products.find(p => p.sku === item.productId);
                  // Convert PurchaseItem to CreatePurchaseItemInput for calculation
                  const itemForCalculation: CreatePurchaseItemInput = {
                    productId: item.productId,
                    name: item.name,
                    qty: item.qty,
                    unit: item.unit,
                    amount: item.amount,
                    linked: item.linked,
                    appliedToProduct: item.appliedToProduct,
                    tempWidth: item.tempWidth,
                    tempHeight: item.tempHeight,
                    tempUom: item.tempUom as 'in' | 'cm' | undefined
                  };
                  const costPerSqft = calculateCostPerSqft(itemForCalculation, product?.area_sqft);
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.productId ? (
                          <span className="text-blue-600">
                            {item.productId} {product ? `- ${product.name}` : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400">Sin vincular</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.qty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        ${item.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {costPerSqft ? `$${costPerSqft.toFixed(4)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {item.linked && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Vinculado
                            </span>
                          )}
                          {item.appliedToProduct && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Costo aplicado
                            </span>
                          )}
                          {!item.linked && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Sin vincular
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Summary */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Total:</span>
              <span className="text-lg font-semibold text-gray-900">
                ${selectedPurchase.totalAmount.toFixed(2)} {selectedPurchase.currency || 'USD'}
              </span>
            </div>
          </div>
        </div>
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

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="No. factura, notas..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los proveedores</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadPurchases}
              disabled={listLoading}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
            >
              {listLoading ? 'Buscando...' : 'Actualizar'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Purchases List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {listLoading ? (
          <div className="p-8 text-center text-gray-500">
            Cargando compras...
          </div>
        ) : purchasesList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron compras.
            <br />
            <button
              onClick={() => setView('create')}
              className="text-blue-600 hover:text-blue-700 underline mt-2"
            >
              Crear la primera compra
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {totalPurchases} compra{totalPurchases !== 1 ? 's' : ''} encontrada{totalPurchases !== 1 ? 's' : ''}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proveedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No. Factura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Artículos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchasesList.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(purchase.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {purchase.supplierName || 'Sin proveedor'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {purchase.invoiceNo || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {purchase.itemsCount} artículo{purchase.itemsCount !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        ${purchase.totalAmount.toFixed(2)} {purchase.currency || 'USD'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-1">
                          {/* Ver - Azul */}
                          <button
                            onClick={() => loadPurchaseDetails(purchase.id)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                            title="Ver detalles"
                          >
                            Ver
                          </button>
                          
                          {/* Editar - Amarillo */}
                          <button
                            onClick={() => handleEditPurchase(purchase.id)}
                            className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
                            title="Editar compra"
                          >
                            Editar
                          </button>
                          
                          {/* Eliminar - Rojo */}
                          {showDeleteConfirm === purchase.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDeletePurchase(purchase.id)}
                                disabled={isDeleting}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 transition-colors"
                                title="Confirmar eliminación"
                              >
                                {isDeleting ? '...' : '✓'}
                              </button>
                              <button
                                onClick={cancelDelete}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                                title="Cancelar"
                              >
                                ✗
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeletePurchase(purchase.id)}
                              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                              title="Eliminar compra"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}