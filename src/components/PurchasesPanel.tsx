"use client";

import React, { useState, useEffect } from 'react';
import { createPurchase, updatePurchaseWithItems, deletePurchase } from '@/server/actions/purchaseActions';
import { getPurchasesList, getPurchaseById } from '@/server/actions/purchaseQueries';
import { createProvider } from '@/server/actions/providerMutations';
import { calculateCostPerSqft } from '@/lib/purchases/calculations';
import type { CreatePurchaseInput, UpdatePurchaseInput, CreatePurchaseItemInput, PurchaseWithDetails } from '@/lib/purchases/types';
import type { Provider } from '@/server/queries/getInitialData';
import type { Product, CategoryRule } from '@/lib/pricing/types';
import { Button } from './ui';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetPurchase, setDeleteTargetPurchase] = useState<PurchaseWithDetails | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
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
      areaSqft: 1.0, // Default area for sq ft items
      unitPrice: 0,
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
          unitPrice: item.unitPrice,
          amount: item.amount,
          areaSqft: item.areaSqft || 1.0, // Default to 1.0 if no area stored
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

  const handleDeletePurchase = async (purchase: PurchaseWithDetails) => {
    setDeleteTargetPurchase(purchase);
    setShowDeleteModal(true);
  };

  const confirmDeletePurchase = async () => {
    if (!deleteTargetPurchase || deleteConfirmText !== 'CONFIRMAR') {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePurchase(deleteTargetPurchase.id);
      setShowDeleteModal(false);
      setDeleteTargetPurchase(null);
      setDeleteConfirmText('');
      // Reload the list silently
      await loadPurchases();
    } catch (error) {
      console.error('Error deleting purchase:', error);
      alert('Error al eliminar la compra: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTargetPurchase(null);
    setDeleteConfirmText('');
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
      areaSqft: 1.0, // Default area for sq ft items
      unitPrice: 0,
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
      qty: 1, // Default to 1
      unit: 'sqft',
      areaSqft: 1.0, // Default area for sq ft items
      unitPrice: 0, // Will show empty placeholder
      amount: 0, // Calculated automatically
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
    
    // Auto-calculate amount when qty or unitPrice changes
    if (field === 'qty' || field === 'unitPrice') {
      const qty = field === 'qty' ? (value as number) : newItems[index].qty || 0;
      const unitPrice = field === 'unitPrice' ? (value as number) : newItems[index].unitPrice || 0;
      newItems[index].amount = qty * unitPrice;
    }
    
    // Smart area defaults when linking to existing products
    if (field === 'productId' && value) {
      newItems[index].linked = true;
      const product = products.find(p => p.sku === value);
      if (product) {
        newItems[index].name = product.name;
        if (product.area_sqft) {
          newItems[index].areaSqft = product.area_sqft;
        } else if (!newItems[index].areaSqft) {
          newItems[index].areaSqft = 1.0;
        }
      }
    } else if (field === 'productId' && !value) {
      newItems[index].linked = false;
      newItems[index].appliedToProduct = false;
    }

    // Smart area defaults when changing unit
    if (field === 'unit') {
      if (value === 'sqft' && !newItems[index].areaSqft) {
        newItems[index].areaSqft = 1.0; // Default for sq ft
      }
    }

    // Update newProductArea when areaSqft changes and in create mode
    if (field === 'areaSqft' && newItems[index].linkingMode === 'create') {
      newItems[index].newProductArea = value as number;
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
        // Initialize newProductArea with current line area
        newItems[index].newProductArea = newItems[index].areaSqft || 1.0;
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


  const getValidationError = (item: CreatePurchaseItemInput): string | null => {
    if (!item.name.trim()) return null; // Skip validation for empty items
    
    if (item.qty <= 0) return 'La cantidad debe ser mayor a 0';
    if (item.unitPrice <= 0) return 'El precio unitario debe ser mayor a 0';
    if (!item.areaSqft || item.areaSqft <= 0) return 'El área debe ser mayor a 0';
    
    // Validate product linking
    if (item.linkingMode === 'existing' && !item.productId) {
      return 'Debe seleccionar un producto para vincularlo';
    }
    
    if (item.linkingMode === 'create') {
      if (!item.newProductCategory?.trim()) {
        return 'Se requiere categoría para crear un nuevo producto';
      }
      // For new product creation, use the line area if newProductArea is not set
      const productArea = item.newProductArea || item.areaSqft;
      if (!productArea || productArea <= 0) {
        return 'Se requiere área válida para crear un nuevo producto';
      }
    }
    
    return null;
  };

  // Derived field calculations
  const getTotalArea = (item: CreatePurchaseItemInput): number => {
    return (item.qty || 0) * (item.areaSqft || 0);
  };

  const getTotalCost = (item: CreatePurchaseItemInput): number => {
    return (item.qty || 0) * (item.unitPrice || 0);
  };

  const getCostFt2Line = (item: CreatePurchaseItemInput): number | null => {
    const totalArea = getTotalArea(item);
    const totalCost = getTotalCost(item);
    
    if (totalArea <= 0) return null; // Divide by zero guard
    return totalCost / totalArea;
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
        const finalItems = validItems.filter(item => item.qty > 0 && item.amount >= 0);
        
        const updateData: UpdatePurchaseInput = {
          supplierId: supplierId || undefined,
          invoiceNo: invoiceNo || undefined,
          date: new Date(date),
          currency: currency || undefined,
          notes: notes || undefined,
          items: finalItems,
        };

        await updatePurchaseWithItems(editingPurchase.id, updateData);
      } else {
        // Create new purchase
        const finalItems = validItems.filter(item => item.qty > 0 && item.amount >= 0);
        
        const purchaseData: CreatePurchaseInput = {
          supplierId: supplierId || undefined,
          invoiceNo: invoiceNo || undefined,
          date: new Date(date),
          currency: currency || undefined,
          notes: notes || undefined,
          items: finalItems,
        };

        await createPurchase(purchaseData);
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
                        value={item.qty || ''}
                        onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="1"
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Cantidad"
                      />
                    </div>

                    {/* Area */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Área (sq ft) *
                      </label>
                      <input
                        type="number"
                        value={item.areaSqft || ''}
                        onChange={(e) => updateItem(index, 'areaSqft', parseFloat(e.target.value) || undefined)}
                        min="0"
                        step="0.01"
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: 12, 24, 48..."
                      />
                    </div>

                    {/* Unit Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Precio Unitario *
                      </label>
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Precio"
                      />
                    </div>
                  </div>

                  {/* Monto Total - Segunda fila a la derecha */}
                  <div className="mt-3 flex justify-end">
                    <div className="w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monto Total
                      </label>
                      <div className="w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-700 font-medium text-right tabular-nums">
                        ${((item.unitPrice || 0) * (item.qty || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Derived calculations display */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <label className="block font-medium text-gray-700 mb-1">Total Área</label>
                        <div className="text-gray-800 tabular-nums">{getTotalArea(item).toFixed(2)} sq ft</div>
                      </div>
                      <div>
                        <label className="block font-medium text-gray-700 mb-1">Total Costo</label>
                        <div className="text-gray-800 tabular-nums">${getTotalCost(item).toFixed(2)}</div>
                      </div>
                      <div>
                        <label className="block font-medium text-gray-700 mb-1">Costo/ft²</label>
                        <div className="text-gray-800">
                          {(() => {
                            const costFt2 = getCostFt2Line(item);
                            return costFt2 !== null ? `$${costFt2.toFixed(4)}` : 'N/A';
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="block font-medium text-gray-700 mb-1">Estado</label>
                        <div className="flex items-center space-x-2">
                          {item.linked && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Vinculado</span>
                          )}
                          {item.appliedToProduct && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Aplicado</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Linking & Actions */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      {/* Apply to product checkbox */}
                      {canApplyToProduct(item) && (() => {
                        const costFt2Line = getCostFt2Line(item);
                        const product = products.find(p => p.sku === item.productId);
                        return (
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={item.appliedToProduct}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked && costFt2Line !== null && product) {
                                  const confirmed = window.confirm(
                                    `¿Aplicar precio ahora?\n\n` +
                                    `Producto: "${product.name}" (${product.sku})\n` +
                                    `Coste actual: $${product.cost_sqft}/ft²\n` +
                                    `Nuevo coste: $${costFt2Line.toFixed(4)}/ft²\n\n` +
                                    `Esto actualizará el coste del producto inmediatamente.`
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
                              <strong>Aplicar precio ahora</strong> al producto
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
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Eliminar línea
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
                    Área (sq ft)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Unitario
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
                    areaSqft: item.areaSqft,
                    unitPrice: item.unitPrice,
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
                        {item.areaSqft || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 tabular-nums">
                        ${item.unitPrice?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 tabular-nums">
                        ${item.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 tabular-nums">
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
              <span className="text-lg font-semibold text-gray-900 tabular-nums">
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
        <Button
          onClick={() => setView('create')}
          variant="success"
          size="md"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Nueva Compra
        </Button>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 tabular-nums">
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
                          <button
                            onClick={() => handleDeletePurchase(purchase)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                            title="Eliminar compra"
                          >
                            Eliminar
                          </button>
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
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTargetPurchase && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={cancelDelete} />
          <div className="relative bg-white rounded-lg p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Confirmar eliminación</h3>
            <p className="text-sm text-slate-600 mb-4">
              Para confirmar la eliminación de la compra{' '}
              <strong>
                {deleteTargetPurchase.invoiceNo || `#${deleteTargetPurchase.id.slice(-6)}`}
              </strong>
              {' '}del proveedor{' '}
              <strong>{deleteTargetPurchase.supplierName || 'Sin proveedor'}</strong>, 
              escriba exactamente:
            </p>
            <p className="font-mono text-sm bg-slate-100 p-2 rounded mb-4 text-center">CONFIRMAR</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Escriba CONFIRMAR aquí"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeletePurchase}
                disabled={deleteConfirmText !== 'CONFIRMAR' || isDeleting}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}