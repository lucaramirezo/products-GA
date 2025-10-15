import React from 'react';
import { Button, Dropdown, DropdownItem } from './ui';

interface ExportDropdownProps {
  onQuickExport: () => void;
  onExportAll: () => void;
  onOpenModal: () => void;
  disabled?: boolean;
}

export function ExportDropdown({ 
  onQuickExport, 
  onExportAll, 
  onOpenModal, 
  disabled = false 
}: ExportDropdownProps) {
  const trigger = (
    <Button
      variant="secondary"
      size="sm"
      disabled={disabled}
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
    >
      <span className="hidden sm:inline">Exportar</span>
      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </Button>
  );

  return (
    <Dropdown trigger={trigger}>
      <DropdownItem
        onClick={onQuickExport}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      >
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-gray-700">Exportar vista actual</span>
          <span className="text-xs text-gray-500">Excel (.xlsx) · respeta filtros y columnas visibles</span>
        </div>
      </DropdownItem>
      
      <DropdownItem
        onClick={onExportAll}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      >
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-gray-700">Exportar todos los productos</span>
          <span className="text-xs text-gray-500">Excel (.xlsx) · catálogo completo</span>
        </div>
      </DropdownItem>
      
      <hr className="my-1 border-gray-200" />
      
      <DropdownItem
        onClick={onOpenModal}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        }
      >
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-gray-700">Exportación personalizada…</span>
          <span className="text-xs text-gray-500">Configura columnas, monedas y filtros avanzados</span>
        </div>
      </DropdownItem>
    </Dropdown>
  );
}