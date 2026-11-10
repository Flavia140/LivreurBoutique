import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Input } from '@/components/Input';
import { ProductRow } from '@/components/ProductRow';
import { Screen } from '@/components/Screen';
import { ShopCard } from '@/components/ShopCard';
import { api } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useCity } from '@/lib/city';
import type { Product, Shop } from '@/lib/types';
import { colors } from '@/theme';

export default function Search() {
  const { city } = useCity();
  const cart = useCart();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ shops: Shop[]; products: Product[] } | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const t = setTimeout(() => {
      api<{ data: { shops: Shop[]; products: Product[] } }>(`/search?q=${encodeURIComponent(q.trim())}${city ? `&city=${encodeURIComponent(city)}` : ''}`)
        .then((r) => setRes(r.data)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q, city]);

  return (
    <Screen title="Rechercher">
      <Input placeholder="Produit ou boutique" value={q} onChangeText={setQ} autoFocus />
      {res?.shops.length ? <Text style={{ fontWeight: '700', marginVertical: 8 }}>Boutiques</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {res?.shops.map((s) => <ShopCard key={s.id} shop={s} />)}
      </View>
      {res?.products.length ? <Text style={{ fontWeight: '700', marginTop: 16 }}>Produits</Text> : null}
      {res?.products.map((p) => (
        <ProductRow key={p.id} product={p} onAdd={() => p.shop && cart.add({ id: p.shop.id, name: p.shop.name, color: p.shop.color, zone: null }, p)} />
      ))}
      {res && !res.shops.length && !res.products.length ? <Text style={{ color: colors.textMuted }}>Aucun résultat.</Text> : null}
    </Screen>
  );
}
