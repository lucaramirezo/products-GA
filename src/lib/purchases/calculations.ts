import type { CreatePurchaseItemInput } from './types';

/**
 * Calculate cost per square foot for a purchase item
 * Formula: cost_ft2_line = unit_price / area_sqft_per_unit
 */
export function calculateCostPerSqft(
  item: CreatePurchaseItemInput,
  productAreaSqft?: number
): number | null {
  if (item.unitPrice <= 0) return null;

  // Use direct area from form (canonical field)
  if (item.areaSqft && item.areaSqft > 0) {
    return item.unitPrice / item.areaSqft;
  }

  // Fallback to legacy logic for backward compatibility with old data
  if (item.unit === 'sqft') {
    // For sqft unit, assume 1 sq ft per unit if no area specified
    return item.unitPrice;
  }

  if (item.unit === 'sheet') {
    let areaPerSheet: number;

    if (item.productId && productAreaSqft) {
      // Use linked product's area
      areaPerSheet = productAreaSqft;
    } else if (item.tempWidth && item.tempHeight && item.tempUom) {
      // Calculate from temporary dimensions (legacy)
      const width = item.tempWidth;
      const height = item.tempHeight;
      const uom = item.tempUom;

      let areaInSquareInches: number;
      if (uom === 'in') {
        areaInSquareInches = width * height;
      } else if (uom === 'cm') {
        // Convert cm to inches (1 inch = 2.54 cm)
        const widthInches = width / 2.54;
        const heightInches = height / 2.54;
        areaInSquareInches = widthInches * heightInches;
      } else {
        return null;
      }

      areaPerSheet = areaInSquareInches / 144; // Convert to square feet
    } else {
      return null; // Cannot calculate without dimensions
    }

    // cost_sqft = unit_price / area_per_sheet
    return item.unitPrice / areaPerSheet;
  }

  return null;
}