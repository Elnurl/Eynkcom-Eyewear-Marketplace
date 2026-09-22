import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  createSellerProduct,
  getListProductsQueryKey,
  getListSellerProductsQueryKey,
  useCreateSellerProduct,
  useDeleteSellerProduct,
  useListSellerProducts,
  useUpdateSellerProduct,
  type SellerProduct,
  type SellerProductInput,
  type SellerProductUpdate,
} from '@workspace/api-client-react';

export type { SellerProduct, SellerProductInput };

export type DemoSellerSession = {
  authenticated: boolean;
  email: string;
  storeName: string;
};

const SESSION_KEY = 'eynek_demo_seller_session';
const PRODUCTS_KEY = 'eynek_demo_seller_products';
const MIGRATION_KEY = 'eynek_demo_seller_products_migrated_v1';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  return 'Serverlə əlaqə zamanı xəta baş verdi. Yenidən cəhd edin.';
}

export function useDemoSeller() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<DemoSellerSession>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : { authenticated: false, email: '', storeName: '' };
    } catch {
      return { authenticated: false, email: '', storeName: '' };
    }
  });

  const productsQuery = useListSellerProducts({
    query: {
      enabled: session.authenticated,
      queryKey: getListSellerProductsQueryKey(),
    },
  });
  const createMutation = useCreateSellerProduct();
  const updateMutation = useUpdateSellerProduct();
  const deleteMutation = useDeleteSellerProduct();

  const refreshProducts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListSellerProductsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }),
    ]);
  };

  useEffect(() => {
    if (!session.authenticated || !productsQuery.isSuccess || localStorage.getItem(MIGRATION_KEY)) return;

    let cancelled = false;
    const migrateLegacyProducts = async () => {
      try {
        const stored = localStorage.getItem(PRODUCTS_KEY);
        const parsed: unknown = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(parsed)) {
          localStorage.setItem(MIGRATION_KEY, 'done');
          return;
        }

        const existing = productsQuery.data ?? [];
        for (const item of parsed) {
          if (!item || typeof item !== 'object') continue;
          const legacy = item as Record<string, unknown>;
          const frontImage = String(legacy.frontImage || legacy.image || '');
          const sideImage = String(legacy.sideImage || legacy.image || '');
          const alreadyExists = existing.some(
            (product) => product.name === legacy.name && product.color === legacy.color,
          );
          if (
            alreadyExists ||
            !frontImage ||
            !sideImage ||
            frontImage.startsWith('data:') ||
            sideImage.startsWith('data:')
          ) {
            continue;
          }

          await createSellerProduct({
            name: String(legacy.name || ''),
            category: legacy.category === 'Gün eynəyi' ? 'Gün eynəyi' : 'Optik çərçivə',
            price: Number(legacy.price) || 0,
            stock: Number(legacy.stock) || 0,
            color: String(legacy.color || 'Təyin edilməyib'),
            material: String(legacy.material || 'Təyin edilməyib'),
            status: legacy.status === 'Aktiv' ? 'Aktiv' : 'Qaralama',
            frontImage,
            sideImage,
          });
        }
        localStorage.setItem(MIGRATION_KEY, 'done');
        if (!cancelled) await refreshProducts();
      } catch {
        // Keep legacy data untouched so migration can be retried later.
      }
    };

    void migrateLegacyProducts();
    return () => {
      cancelled = true;
    };
  }, [productsQuery.data, productsQuery.isSuccess, session.authenticated]);

  const login = (email: string, storeName: string) => {
    const nextSession = { authenticated: true, email, storeName };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const logout = () => {
    const nextSession = { authenticated: false, email: '', storeName: '' };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const addProduct = async (product: SellerProductInput) => {
    await createMutation.mutateAsync({ data: product });
    await refreshProducts();
  };

  const updateProduct = async (id: string, updates: SellerProductUpdate) => {
    await updateMutation.mutateAsync({ id, data: updates });
    await refreshProducts();
  };

  const deleteProduct = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
    await refreshProducts();
  };

  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;

  return {
    session,
    login,
    logout,
    products: productsQuery.data ?? [],
    addProduct,
    updateProduct,
    deleteProduct,
    isLoading: productsQuery.isLoading,
    isSaving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    errorMessage: productsQuery.error
      ? getErrorMessage(productsQuery.error)
      : mutationError
        ? getErrorMessage(mutationError)
        : '',
  };
}
