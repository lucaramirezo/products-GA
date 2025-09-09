import { getInitialData } from '@/server/queries/getInitialData';
import ProductsAppClient from '@/components/ProductsAppClient';

export default async function ProductsApp() {
  const initialData = await getInitialData();

  return <ProductsAppClient initialData={initialData} />;
}
