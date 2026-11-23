import { useMemo, useState } from 'react';
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
import { signOutAndGo, useAuthSession } from '@/lib/auth-client';
import {
  getSellerPreviewProducts,
  getSellerPreviewStore,
  sellerPanelPreviewEnabled,
  sellerPreviewUser,
} from '@/lib/seller-dev-preview';

export type { SellerProduct, SellerProductInput, SellerProductUpdate };

const PREVIEW_SAVE_MSG = 'Lokal preview rejimi — API işləmir, dəyişiklik yadda saxlanmır.';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  return 'Serverlə əlaqə zamanı xəta baş verdi. Yenidən cəhd edin.';
}

function useSellerWorkspaceLive(apiEnabled: boolean) {
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn, user } = useAuthSession();
  const storeQuery = useGetSellerStore({
    query: { queryKey: getGetSellerStoreQueryKey(), enabled: apiEnabled && isLoaded && Boolean(isSignedIn), retry: false },
  });
  const productsQuery = useListSellerProducts({
    query: { queryKey: getListSellerProductsQueryKey(), enabled: apiEnabled && isLoaded && Boolean(isSignedIn) && storeQuery.isSuccess },
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
    user,
    isAuthenticated: Boolean(isSignedIn),
    isAuthLoading: !isLoaded,
    isPreview: false,
    signOut: signOutAndGo,
    store: storeQuery.data,
    storeError: storeQuery.error ? getErrorMessage(storeQuery.error) : '',
    products: productsQuery.data ?? [],
    addProduct,
    updateProduct,
    deleteProduct,
    updateStore,
    isLoading: !isLoaded || (isSignedIn && storeQuery.isLoading) || (storeQuery.isSuccess && productsQuery.isLoading),
    isSaving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || updateStoreMutation.isPending,
    errorMessage: error ? getErrorMessage(error) : '',
    refreshCatalog,
  };
}

function useSellerWorkspacePreview() {
  const [products] = useState(() => getSellerPreviewProducts());
  const store = useMemo(() => getSellerPreviewStore(), []);
  const noop = async () => {
    throw new Error(PREVIEW_SAVE_MSG);
  };
  return {
    user: sellerPreviewUser,
    isAuthenticated: true,
    isAuthLoading: false,
    isPreview: true,
    signOut: async () => {
      window.location.assign(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/`);
    },
    store,
    storeError: '',
    products,
    addProduct: noop,
    updateProduct: noop,
    deleteProduct: noop,
    updateStore: noop,
    isLoading: false,
    isSaving: false,
    errorMessage: '',
    refreshCatalog: async () => {},
  };
}

export function useSellerWorkspace() {
  const { isSignedIn, isLoaded } = useAuthSession();
  const usePreview = sellerPanelPreviewEnabled && isLoaded && !isSignedIn;
  const live = useSellerWorkspaceLive(!usePreview);
  const preview = useSellerWorkspacePreview();
  return usePreview ? preview : live;
}