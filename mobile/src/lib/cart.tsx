import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { storage } from './storage';
import type { Product, Shop } from './types';

export type CartLine = { product: Product; quantity: number };
type Cart = { shop: Pick<Shop, 'id' | 'name' | 'color' | 'zone'> | null; lines: CartLine[] };

type CartState = Cart & {
  count: number;
  subtotal: number;
  add: (shop: Cart['shop'] & {}, product: Product, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
};

const KEY = 'yako.cart';
const CartContext = createContext<CartState | null>(null);

/** Panier d'une seule boutique, conservé sur le téléphone. */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ shop: null, lines: [] });

  useEffect(() => {
    storage.get(KEY).then((raw) => raw && setCart(JSON.parse(raw))).catch(() => {});
  }, []);
  useEffect(() => {
    storage.set(KEY, JSON.stringify(cart)).catch(() => {});
  }, [cart]);

  const value = useMemo<CartState>(() => {
    const put = (shop: NonNullable<Cart['shop']>, product: Product, quantity: number) =>
      setCart((c) => {
        const base = c.shop?.id === shop.id ? c : { shop, lines: [] };
        const existing = base.lines.find((l) => l.product.id === product.id);
        const lines = existing
          ? base.lines.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + quantity } : l))
          : [...base.lines, { product, quantity }];
        return { shop, lines };
      });

    return {
      ...cart,
      count: cart.lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: cart.lines.reduce((n, l) => n + l.quantity * l.product.current_price, 0),
      add: (shop, product, quantity = 1) => {
        if (cart.shop && cart.shop.id !== shop.id && cart.lines.length > 0) {
          Alert.alert('Nouveau panier ?', `Votre panier contient des articles de ${cart.shop.name}. Une commande ne peut venir que d'une seule boutique.`, [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Vider et ajouter', style: 'destructive', onPress: () => { setCart({ shop: null, lines: [] }); put(shop, product, quantity); } },
          ]);
          return;
        }
        put(shop, product, quantity);
      },
      setQuantity: (productId, quantity) =>
        setCart((c) => {
          const lines = quantity <= 0 ? c.lines.filter((l) => l.product.id !== productId) : c.lines.map((l) => (l.product.id === productId ? { ...l, quantity } : l));
          return { shop: lines.length ? c.shop : null, lines };
        }),
      clear: () => setCart({ shop: null, lines: [] }),
    };
  }, [cart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart hors CartProvider');
  return ctx;
}
