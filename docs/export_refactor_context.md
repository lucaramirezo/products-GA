# Export System Refactor - Documentation

## Overview

This document describes the comprehensive refactor of the export functionality for the Products GA pricing engine application. The refactor transforms the basic CSV export into a flexible, user-friendly system that supports multiple formats, smart filtering, and customizable templates.

## Architecture

### Core Components

#### 1. Export Types (`src/lib/export/types.ts`)
Defines all TypeScript interfaces and types for the export system:

- **ExportConfig**: Main configuration interface containing scope, columns, filters, format, and options
- **ExportPreset**: Template definitions for quick exports
- **ExportColumn**: Column metadata with type information and grouping
- **TableState**: Current table state (filters, sorting, selection) passed to export functions
- **Column Groups**: Organized column sets (Basic, Pricing, Details, Metadata)

#### 2. Export Service (`src/lib/export/service.ts`)
Core business logic for processing and exporting data:

- **Data Preparation**: Filters and sorts products based on configuration
- **Format Support**: CSV (implemented), Excel and PDF (stubbed for future enhancement)
- **Smart Filtering**: Respects table state, scope selection, and additional filters
- **Currency Formatting**: Supports EUR and USD formatting

#### 3. UI Components

##### ExportModal (`src/components/ExportModal.tsx`)
Full-featured modal with:
- **Preset Tab**: Quick selection from predefined templates
- **Custom Tab**: Granular control over all export options
- **Scope Selection**: Filtered, Selected, All, or Active-only products
- **Column Chooser**: Grouped column selection with select all/none
- **Live Preview**: Shows row count, columns, and estimated file size
- **Format Selection**: CSV, Excel (coming soon), PDF (coming soon)

##### ExportDropdown (`src/components/ExportDropdown.tsx`)
Clean dropdown interface replacing multiple export buttons:
- **Quick Export**: Current view with visible columns
- **Export All**: All products with basic columns
- **Custom Export**: Opens the full modal

#### 4. Multi-Select System
Enhanced ProductsTable with checkbox selection:
- **Individual Selection**: Checkbox per product row
- **Bulk Actions**: Select all filtered, select all, clear selection
- **Visual Feedback**: Selected rows highlighted, selection counter
- **Export Integration**: Selected products available as export scope

## Export Presets

### 1. Basic Price List 📋
- **Purpose**: Simple price list for clients
- **Columns**: SKU, Product, Category, Supplier, Final Price
- **Scope**: Active products only
- **Format**: Excel (fallback to CSV)

### 2. Full Catalog 📚
- **Purpose**: Complete product information
- **Columns**: All available columns
- **Scope**: All products (including inactive)
- **Format**: Excel (fallback to CSV)

### 3. Cost Analysis 💰
- **Purpose**: Internal cost and margin analysis
- **Columns**: SKU, Product, Category, Cost/ft², Final Price, Margin, Tier
- **Scope**: Active products only
- **Format**: Excel (fallback to CSV)

### 4. Client Price List 🏷️
- **Purpose**: Clean price list without internal costs
- **Columns**: SKU, Product, Category, Final Price, Area
- **Scope**: Active products only
- **Format**: PDF (fallback to CSV)

## Column Organization

### Basic Information
- SKU (required)
- Product Name (required)
- Category
- Supplier

### Pricing & Costs
- Cost/ft²
- Tier
- Base Total
- Final Price (PVP)
- Margin

### Calculation Details
- Ink Add-on
- Lamination Add-on
- Cut Add-on
- Total Add-ons

### Metadata
- Area ft²
- Active Status
- Sell Mode
- Created Date
- Updated Date

## User Experience Improvements

### 1. Unified Export Interface
- **Before**: Multiple separate export buttons
- **After**: Single dropdown with organized options
- **Benefit**: Cleaner interface, progressive disclosure

### 2. Smart Defaults
- **Current View Export**: Automatically uses visible columns and applied filters
- **Preset Templates**: Pre-configured for common use cases
- **Context Awareness**: Adapts to current table state

### 3. Multi-Select Functionality
- **Checkbox Selection**: Individual and bulk selection
- **Visual Feedback**: Clear indication of selected items
- **Flexible Scope**: Export selected, filtered, or all products

### 4. Preview and Confirmation
- **Live Preview**: Shows exactly what will be exported
- **Row Count**: Prevents accidental large exports
- **Estimated Size**: Helps users understand export scope

### 5. Progressive Enhancement
- **Quick Actions**: Fast export for common scenarios
- **Advanced Options**: Full control when needed
- **Fallback Support**: Graceful degradation for unsupported formats


## Technical Implementation

### State Management
```typescript
// Table state passed to export functions
interface TableState {
  query: string;                    // Current search/filter
  visibleColumns: Record<string, boolean>; // Column visibility
  sortConfig: SortConfig;           // Current sorting
  selectedProducts: string[];       // Selected product SKUs
}
```

### Export Flow
1. **User Action**: Clicks export option
2. **Configuration**: Modal or preset defines export config
3. **Data Preparation**: Service filters and sorts products
4. **Format Processing**: Converts to requested format
5. **Download**: Browser downloads the file

### Extensibility
The system is designed for easy extension:
- **New Formats**: Add handlers in ExportService
- **New Presets**: Add to EXPORT_PRESETS array
- **New Columns**: Add to EXPORT_COLUMNS with type information
- **Custom Filters**: Extend ExportConfig interface

## Future Enhancements

### Phase 2: Excel Support
- Install `xlsx` library
- Implement proper Excel formatting
- Add styled headers and currency formatting
- Support for multiple worksheets

### Phase 3: PDF Support
- Install `jspdf` and `jspdf-autotable`
- Implement professional PDF layouts
- Add company branding
- Support for page breaks and headers

### Phase 4: Advanced Features
- **Custom Presets**: User-defined export templates
- **Scheduled Exports**: Automated export generation
- **Email Integration**: Direct email delivery
- **API Exports**: Programmatic access to export functionality

## Migration from Legacy System

### Backward Compatibility
- Old `onExportCSV` prop maintained for compatibility
- Existing export logic preserved as fallback
- Gradual migration path for existing users

### Breaking Changes
- None - fully backward compatible
- New features are additive

### Testing Strategy
- **Unit Tests**: Export service logic
- **Integration Tests**: Full export workflows
- **User Testing**: Validate UX improvements

## Performance Considerations

### Optimization Techniques
- **Lazy Loading**: Export libraries loaded on demand
- **Data Streaming**: Large exports processed in chunks
- **Memory Management**: Efficient data transformation
- **Caching**: Column metadata cached for performance

### Scalability
- **Large Datasets**: Handles thousands of products efficiently
- **Concurrent Exports**: Multiple exports don't block UI
- **Error Handling**: Graceful failure with user feedback

## Security & Data Protection

### Data Handling
- **Client-Side Processing**: No server-side data exposure
- **Temporary Files**: No permanent storage of exported data
- **Access Control**: Respects application permissions

### Privacy Compliance
- **No External Services**: All processing done client-side
- **Data Minimization**: Only requested columns exported
- **User Control**: Full control over data inclusion

## Conclusion

The export system refactor delivers significant improvements in functionality, user experience, and maintainability while maintaining full backward compatibility. The modular architecture enables future enhancements and provides a solid foundation for the application's export needs.

The system successfully transforms a basic CSV export into a comprehensive, user-friendly export solution that scales with the application's growing requirements.