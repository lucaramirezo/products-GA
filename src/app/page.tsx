import { getInitialData } from '@/server/queries/getInitialData';
import ProductsAppClient from '@/components/ProductsAppClient';

export const runtime = 'nodejs';

export default async function ProductsApp() {
  const initialData = await getInitialData();

  return <ProductsAppClient initialData={initialData} />;
}
