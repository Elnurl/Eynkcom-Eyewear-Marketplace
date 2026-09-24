import { useQueryClient } from '@tanstack/react-query';
import {
  getGetSellerStoreQueryKey,
  getListProductsQueryKey,
  getListSellerProductsQueryKey,
  getListStoresQueryKey,
  useCreateSellerProduct,
  useDeleteSellerProduct,
  useGetSellerStore,
  useListSellerProducts,
  useUpdateSellerProduct,
  useUpdateSellerStore,
  type SellerProduct,
  type SellerProductInput,
  type SellerProductUpdate,
  type SellerStoreUpdate,
} from '@workspace/api-client-react';
import { useAuth } from '@workspace/replit-auth-web';

export type { SellerProduct, SellerProductInput, SellerProductUpdate };

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  return 'Serverlə əlaqə zamanı xəta baş verdi. Yenidən cəhd edin.';
}

export function useSellerWorkspace() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const storeQuery = useGetSellerStore({
    query: { queryKey: getGetSellerStoreQueryKey(), enabled: auth.isAuthenticated, retry: false },
  });
  const productsQuery = useListSellerProducts({
    query: { queryKey: getListSellerProductsQueryKey(), enabled: auth.isAuthenticated && storeQuery.isSuccess },
  });
  const createMutation = useCreateSellerProduct();
  const updateMutation = useUpdateSellerProduct();
  const deleteMutation = useDeleteSellerProduct();
  const updateStoreMutation = useUpdateSellerStore();

  const refreshCatalog = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListSellerProductsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetSellerStoreQueryKey() }),
    ]);
  };

  const addProduct = async (product: SellerProductInput) => {
    await createMutation.mutateAsync({ data: product });
    await refreshCatalog();
  };

  const updateProduct = async (id: string, updates: SellerProductUpdate) => {
    await updateMutation.mutateAsync({ id, data: updates });
    await refreshCatalog();
  };

  const deleteProduct = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
    await refreshCatalog();
  };

  const updateStore = async (updates: SellerStoreUpdate) => {
    await updateStoreMutation.mutateAsync({ data: updates });
    await refreshCatalog();
  };

  const error = storeQuery.error ?? productsQuery.error ?? createMutation.error ?? updateMutation.error ?? deleteMutation.error ?? updateStoreMutation.error;
  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isAuthLoading: auth.isLoading,
    login: auth.login,
    logout: auth.logout,
    store: storeQuery.data,
    storeError: storeQuery.error ? getErrorMessage(storeQuery.error) : '',
    products: productsQuery.data ?? [],
    addProduct,
    updateProduct,
    deleteProduct,
    updateStore,
    isLoading: auth.isLoading || (auth.isAuthenticated && storeQuery.isLoading) || (storeQuery.isSuccess && productsQuery.isLoading),
    isSaving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || updateStoreMutation.isPending,
    errorMessage: error ? getErrorMessage(error) : '',
  };
}