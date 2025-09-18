import { InMemoryProductsRepo } from '@/repositories/memory/productsRepo';
import { InMemoryTiersRepo } from '@/repositories/memory/tiersRepo';
import { InMemoryCategoryRulesRepo } from '@/repositories/memory/categoryRulesRepo';
import { InMemoryParamsRepo } from '@/repositories/memory/paramsRepo';
import { InMemoryProvidersRepo } from '@/repositories/memory/providersRepo';
import { InMemoryAuditRepo } from '@/repositories/memory/auditRepo';
import { MemoryPurchasesRepository } from '@/repositories/memory/purchasesRepo';
import { MemoryPriceBookRepository } from '@/repositories/memory/priceBookRepo';
import { PricingService } from './pricingService';
import { PurchaseService } from './purchaseService';
import { PriceBookService } from './priceBookService';
import { XLSXImporterService } from './xlsxImporter';
import { Product, Tier, CategoryRule, PriceParams } from '@/lib/pricing/types';
import { Purchase, PurchaseItem, PriceEntry, Supplier } from '@/lib/types/purchase';

export interface SeedData { 
  products: Product[]; 
  tiers: Tier[]; 
  categoryRules: CategoryRule[]; 
  params: PriceParams; 
  providers: {id:string;name:string;lastUpdate?:string}[];
  // New data for Phase 2
  purchases?: Purchase[];
  purchaseItems?: PurchaseItem[];
  priceEntries?: PriceEntry[];
  suppliers?: Supplier[];
}

export function buildInMemoryServices(seed: SeedData) {
  // Existing repos
  const products = new InMemoryProductsRepo([...seed.products]);
  const tiers = new InMemoryTiersRepo([...seed.tiers]);
  const categories = new InMemoryCategoryRulesRepo([...seed.categoryRules]);
  const params = new InMemoryParamsRepo({ ...seed.params });
  const providers = new InMemoryProvidersRepo([...seed.providers]);
  const audit = new InMemoryAuditRepo();
  
  // New repos for Phase 2
  const purchases = new MemoryPurchasesRepository(
    seed.purchases ? [...seed.purchases] : [],
    seed.purchaseItems ? [...seed.purchaseItems] : [],
    seed.suppliers ? [...seed.suppliers] : []
  );
  const priceBook = new MemoryPriceBookRepository(
    seed.priceEntries ? [...seed.priceEntries] : []
  );
  
  // Services
  const pricing = new PricingService({ products, tiers, categories, params });
  const purchaseService = new PurchaseService(purchases, priceBook);
  const priceBookService = new PriceBookService(priceBook, products);
  const xlsxImporter = new XLSXImporterService(purchaseService);
  
  return { 
    repos: { 
      products, 
      tiers, 
      categories, 
      params, 
      providers, 
      audit,
      purchases,
      priceBook
    }, 
    services: { 
      pricing,
      purchases: purchaseService,
      priceBook: priceBookService,
      xlsxImporter
    } 
  };
}
