import { useState, useEffect } from 'react';

export type DemoSellerSession = {
  authenticated: boolean;
  email: string;
  storeName: string;
};

export type SellerProduct = {
  id: string;
  name: string;
  category: 'Optik çərçivə' | 'Gün eynəyi';
  price: number;
  stock: number;
  color: string;
  material: string;
  status: 'Aktiv' | 'Qaralama';
  frontImage: string;
  sideImage: string;
  createdAt: string;
};

const SESSION_KEY = 'eynek_demo_seller_session';
const PRODUCTS_KEY = 'eynek_demo_seller_products';

const DEFAULT_PRODUCTS: SellerProduct[] = [
  {
    id: 'prod_1',
    name: 'Mimoza 02',
    category: 'Optik çərçivə',
    price: 118,
    stock: 12,
    color: 'Kərpic / şampan',
    material: 'Asetat',
    status: 'Aktiv',
    frontImage: 'product-images/mimoza-02.jpg',
    sideImage: 'product-images/mimoza-02.jpg',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_2',
    name: 'Sahil 11',
    category: 'Gün eynəyi',
    price: 145,
    stock: 5,
    color: 'Zeytun',
    material: 'Asetat',
    status: 'Aktiv',
    frontImage: 'product-images/sahil-11.jpg',
    sideImage: 'product-images/sahil-11.jpg',
    createdAt: new Date().toISOString(),
  }
];

export function useDemoSeller() {
  const [session, setSession] = useState<DemoSellerSession>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : { authenticated: false, email: '', storeName: '' };
    } catch {
      return { authenticated: false, email: '', storeName: '' };
    }
  });

  const [products, setProducts] = useState<SellerProduct[]>(() => {
    try {
      const stored = localStorage.getItem(PRODUCTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((p: any) => ({
            ...p,
            frontImage: p.frontImage || p.image || '',
            sideImage: p.sideImage || p.image || '',
          }));
        }
      }
      return DEFAULT_PRODUCTS;
    } catch {
      return DEFAULT_PRODUCTS;
    }
  });

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    window.dispatchEvent(new Event('eynek-demo-products-updated'));
  }, [products]);

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

  const addProduct = (product: Omit<SellerProduct, 'id' | 'createdAt'>) => {
    const newProduct: SellerProduct = {
      ...product,
      id: `prod_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);
  };

  const updateProduct = (id: string, updates: Partial<SellerProduct>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    session,
    login,
    logout,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
