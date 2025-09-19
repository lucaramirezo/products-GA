import type { CreatePurchaseItemInput } from './types';

/**
 * Calculate cost per square foot for a purchase item
 */
export function calculateCostPerSqft(
  item: CreatePurchaseItemInput,
  productAreaSqft?: number
): number | null {
  if (item.qty <= 0) return null;

  if (item.unit === 'sqft') {
    return item.amount / item.qty;
  }

  if (item.unit === 'sheet') {
    let areaPerSheet: number;

    if (item.productId && productAreaSqft) {
      // Use linked product's area
      areaPerSheet = productAreaSqft;
    } else if (item.tempWidth && item.tempHeight && item.tempUom) {
      // Calculate from temporary dimensions
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

    return item.amount / (item.qty * areaPerSheet);
  }

  return null;
}