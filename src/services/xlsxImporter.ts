import { 
  XLSXColumnMapping, XLSXImportRow, XLSXImportResult, XLSXImportError,
  CreatePurchaseDTO, UnitType, UOM
} from '@/lib/types/purchase';
import { PurchaseService } from './purchaseService';

export class XLSXImporterService {
  constructor(private purchaseService: PurchaseService) {}

  /**
   * Import XLSX data with dry-run or commit mode
   * @param data Raw XLSX data (array of row objects)
   * @param mapping Column mapping configuration
   * @param mode 'dry-run' for validation only, 'commit' to save data
   */
  async importData(
    data: Record<string, unknown>[],
    mapping: XLSXColumnMapping,
    mode: 'dry-run' | 'commit' = 'dry-run'
  ): Promise<XLSXImportResult> {
    const errors: XLSXImportError[] = [];
    const validRows: XLSXImportRow[] = [];
    
    // Process each row
    for (let i = 0; i < data.length; i++) {
      const rowNumber = i + 2; // Assuming row 1 is headers
      const rawRow = data[i];
      
      try {
        const processedRow = this.processRow(rawRow, mapping, rowNumber);
        
        // Validate the row
        const rowErrors = this.validateRow(processedRow, rowNumber);
        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
        } else {
          validRows.push(processedRow);
        }
      } catch (error) {
        errors.push({
          rowNumber,
          message: `Error procesando fila: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          severity: 'error'
        });
      }
    }

    const result: XLSXImportResult = {
      mode,
      totalRows: data.length,
      validRows,
      errors,
      warnings: []
    };

    // If in commit mode and there are valid rows, create purchases
    if (mode === 'commit' && validRows.length > 0 && errors.filter(e => e.severity === 'error').length === 0) {
      try {
        const summary = await this.commitData(validRows);
        result.summary = summary;
      } catch (error) {
        errors.push({
          rowNumber: 0,
          message: `Error guardando datos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          severity: 'error'
        });
      }
    }

    return result;
  }

  private processRow(rawRow: Record<string, unknown>, mapping: XLSXColumnMapping, rowNumber: number): XLSXImportRow {
    // Extract values using mapping
    const productSku = this.getValueFromRow(rawRow, mapping.productSku)?.toString()?.trim();
    const supplierName = this.getValueFromRow(rawRow, mapping.supplierName)?.toString()?.trim();
    const dateValue = this.getValueFromRow(rawRow, mapping.date);
    const unitTypeValue = this.getValueFromRow(rawRow, mapping.unitType)?.toString()?.trim().toLowerCase();
    const unitsValue = this.getValueFromRow(rawRow, mapping.units);
    const widthValue = mapping.width ? this.getValueFromRow(rawRow, mapping.width) : undefined;
    const heightValue = mapping.height ? this.getValueFromRow(rawRow, mapping.height) : undefined;
    const uomValue = this.getValueFromRow(rawRow, mapping.uom)?.toString()?.trim().toLowerCase();
    const unitCostValue = this.getValueFromRow(rawRow, mapping.unitCost);
    const currencyValue = this.getValueFromRow(rawRow, mapping.currency)?.toString()?.trim().toUpperCase() || 'USD';
    const invoiceNoValue = mapping.invoiceNo ? this.getValueFromRow(rawRow, mapping.invoiceNo)?.toString()?.trim() : undefined;

    // Parse and convert values
    const date = this.parseDate(dateValue);
    const unitType = this.parseUnitType(unitTypeValue);
    const units = this.parseNumber(unitsValue);
    const width = widthValue ? this.parseNumber(widthValue) : undefined;
    const height = heightValue ? this.parseNumber(heightValue) : undefined;
    const uom = this.parseUOM(uomValue);
    const unitCost = this.parseNumber(unitCostValue);

    const row: XLSXImportRow = {
      rowNumber,
      productSku,
      supplierName: supplierName!,
      date,
      unitType,
      units,
      width,
      height,
      uom,
      unitCost,
      currency: currencyValue,
      invoiceNo: invoiceNoValue
    };

    // Calculate derived fields for preview
    if (unitType && units && uom && unitCost) {
      row.areaFt2PerUnit = this.calculateAreaFt2PerUnit(unitType, width, height, uom);
      row.areaFt2Total = row.areaFt2PerUnit ? row.areaFt2PerUnit * units : undefined;
      row.totalCost = units * unitCost;
      row.costFt2Line = row.areaFt2Total && row.areaFt2Total > 0 ? row.totalCost / row.areaFt2Total : undefined;
    }

    return row;
  }

  private getValueFromRow(row: Record<string, unknown>, columnName: string): unknown {
    return row[columnName];
  }

  private parseDate(value: unknown): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) throw new Error(`Fecha inválida: ${value}`);
      return parsed;
    }
    if (typeof value === 'number') {
      // Excel date serial number
      const excelEpoch = new Date(1900, 0, 1);
      const days = value - 2; // Excel counts from 1900-01-01 as day 1, but there's an off-by-one error
      return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    }
    throw new Error(`Formato de fecha no reconocido: ${value}`);
  }

  private parseUnitType(value: string | undefined): UnitType {
    if (!value) throw new Error('Tipo de unidad es requerido');
    
    const normalized = value.toLowerCase();
    if (['sheet', 'hoja'].includes(normalized)) return 'sheet';
    if (['roll', 'rollo'].includes(normalized)) return 'roll';
    if (['sqft', 'ft2', 'pie2'].includes(normalized)) return 'sqft';
    
    throw new Error(`Tipo de unidad no válido: ${value}`);
  }

  private parseUOM(value: string | undefined): UOM {
    if (!value) throw new Error('Unidad de medida es requerida');
    
    const normalized = value.toLowerCase();
    if (['ft', 'pie', 'pies'].includes(normalized)) return 'ft';
    if (['in', 'inch', 'pulgada'].includes(normalized)) return 'in';
    if (['m', 'metro'].includes(normalized)) return 'm';
    if (['cm', 'centimetro'].includes(normalized)) return 'cm';
    
    throw new Error(`Unidad de medida no válida: ${value}`);
  }

  private parseNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[,$]/g, '').trim();
      const parsed = parseFloat(cleaned);
      if (isNaN(parsed)) throw new Error(`Número inválido: ${value}`);
      return parsed;
    }
    throw new Error(`Formato numérico no reconocido: ${value}`);
  }

  private calculateAreaFt2PerUnit(unitType: UnitType, width?: number, height?: number, uom?: UOM): number | undefined {
    if (unitType === 'sqft') {
      return 1;
    }
    
    if (unitType === 'sheet' && width && height && uom) {
      const widthFt = this.convertToFeet(width, uom);
      const heightFt = this.convertToFeet(height, uom);
      return widthFt * heightFt;
    }
    
    // For rolls, area calculation would depend on business rules
    return undefined;
  }

  private convertToFeet(value: number, uom: UOM): number {
    switch (uom) {
      case 'ft': return value;
      case 'in': return value / 12;
      case 'm': return value * 3.28084;
      case 'cm': return value * 0.0328084;
      default: return value;
    }
  }

  private validateRow(row: XLSXImportRow, rowNumber: number): XLSXImportError[] {
    const errors: XLSXImportError[] = [];

    if (!row.supplierName) {
      errors.push({
        rowNumber,
        field: 'supplierName',
        message: 'Nombre del proveedor es requerido',
        severity: 'error'
      });
    }

    if (!row.date) {
      errors.push({
        rowNumber,
        field: 'date',
        message: 'Fecha es requerida',
        severity: 'error'
      });
    } else if (row.date > new Date()) {
      errors.push({
        rowNumber,
        field: 'date',
        message: 'La fecha no puede ser futura',
        severity: 'error'
      });
    }

    if (!row.unitType) {
      errors.push({
        rowNumber,
        field: 'unitType',
        message: 'Tipo de unidad es requerido',
        severity: 'error'
      });
    }

    if (!row.units || row.units <= 0) {
      errors.push({
        rowNumber,
        field: 'units',
        message: 'Cantidad debe ser mayor a 0',
        severity: 'error'
      });
    }

    if (!row.uom) {
      errors.push({
        rowNumber,
        field: 'uom',
        message: 'Unidad de medida es requerida',
        severity: 'error'
      });
    }

    if (row.unitCost === undefined || row.unitCost < 0) {
      errors.push({
        rowNumber,
        field: 'unitCost',
        message: 'Costo unitario debe ser mayor o igual a 0',
        severity: 'error'
      });
    }

    // Validate dimensions for sheet items
    if (row.unitType === 'sheet') {
      if (!row.width || row.width <= 0) {
        errors.push({
          rowNumber,
          field: 'width',
          message: 'Ancho es requerido y debe ser mayor a 0 para items tipo hoja',
          severity: 'error'
        });
      }
      if (!row.height || row.height <= 0) {
        errors.push({
          rowNumber,
          field: 'height',
          message: 'Alto es requerido y debe ser mayor a 0 para items tipo hoja',
          severity: 'error'
        });
      }
    }

    return errors;
  }

  private async commitData(validRows: XLSXImportRow[]): Promise<{ purchasesCreated: number; itemsCreated: number; priceEntriesCreated: number }> {
    // Group rows by supplier and invoice
    const grouped = this.groupRowsForPurchases(validRows);
    
    let purchasesCreated = 0;
    let itemsCreated = 0;
    let priceEntriesCreated = 0;

    for (const group of grouped) {
      try {
        const dto: CreatePurchaseDTO = {
          invoiceNo: group.invoiceNo,
          supplierId: group.supplierId, // This would need to be resolved from supplier name
          date: group.date,
          currency: group.currency,
          subtotal: group.items.reduce((sum, item) => sum + (item.units * item.unitCost), 0),
          tax: 0, // Default values - could be configurable
          shipping: 0,
          notes: `Importado desde XLSX - ${group.items.length} items`,
          items: group.items.map(item => ({
            productId: item.productSku,
            unitType: item.unitType,
            units: item.units,
            width: item.width,
            height: item.height,
            uom: item.uom,
            unitCost: item.unitCost,
            generatePrice: true // Always generate price entries for imported items
          }))
        };

        const purchase = await this.purchaseService.savePurchase(dto);
        purchasesCreated++;
        itemsCreated += purchase.items.length;
        
        // Count price entries that would be generated
        priceEntriesCreated += purchase.items.filter(item => 
          item.generatePrice && item.productId && item.costFt2Line
        ).length;

      } catch (error) {
        throw new Error(`Error creando compra para ${group.supplierName}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return { purchasesCreated, itemsCreated, priceEntriesCreated };
  }

  private groupRowsForPurchases(rows: XLSXImportRow[]): Array<{
    supplierName: string;
    supplierId: string;
    invoiceNo: string;
    date: Date;
    currency: string;
    items: XLSXImportRow[];
  }> {
    const groups = new Map<string, {
      supplierName: string;
      supplierId: string;
      invoiceNo: string;
      date: Date;
      currency: string;
      items: XLSXImportRow[];
    }>();

    for (const row of rows) {
      // Group by supplier + invoice + date
      const key = `${row.supplierName}|${row.invoiceNo || 'default'}|${row.date.toISOString().split('T')[0]}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          supplierName: row.supplierName,
          supplierId: row.supplierName, // TODO: This should resolve supplier name to ID
          invoiceNo: row.invoiceNo || `AUTO-${Date.now()}`,
          date: row.date,
          currency: row.currency,
          items: []
        });
      }

      groups.get(key)!.items.push(row);
    }

    return Array.from(groups.values());
  }
}