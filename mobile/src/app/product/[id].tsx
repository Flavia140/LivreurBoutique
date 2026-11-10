import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { useCart } from '@/lib/cart';
import { fcfa } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

/** Fiche produit (maquette client 4). */
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useApi<{ data: Product }>(`/products/${id}`);
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const p = data?.data;

  if (!p) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  const max = p.stock ?? 99;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={26} color={colors.text} /></Pressable>
        <View style={styles.imageBox}>
          {p.image_url ? <Image source={{ uri: p.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : <Ionicons name="image-outline" size={80} color={colors.primary} />}
        </View>
        <Text style={styles.name}>{p.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
          <Text style={styles.price}>{fcfa(p.current_price)}</Text>
          {p.promo_price ? <Text style={styles.old}>{fcfa(p.price)}</Text> : null}
        </View>
        {p.shop ? <Text style={styles.shop}>Vendu par {p.shop.name}</Text> : null}
        {p.description ? <Text style={styles.desc}>{p.description}</Text> : null}
        {!p.available ? <Text style={{ color: colors.danger, marginTop: 12 }}>Ce produit n'est plus disponible.</Text> : null}

        <View style={styles.qty}>
          <Pressable style={styles.qtyBtn} onPress={() => setQty(Math.max(1, qty - 1))}><Ionicons name="remove" size={20} color={colors.text} /></Pressable>
          <Text style={styles.qtyText}>{qty}</Text>
          <Pressable style={styles.qtyBtn} onPress={() => setQty(Math.min(max, qty + 1))}><Ionicons name="add" size={20} color={colors.text} /></Pressable>
        </View>
        <Button title="Ajouter au panier" disabled={!p.available || !p.shop} onPress={() => {
          cart.add({ id: p.shop!.id, name: p.shop!.name, color: p.shop!.color, zone: null }, p, qty);
          router.back();
        }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageBox: { height: 260, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginVertical: 16, overflow: 'hidden' },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  price: { fontSize: 20, fontWeight: '700', color: colors.text },
  old: { fontSize: 14, color: colors.textMuted, textDecorationLine: 'line-through' },
  shop: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  desc: { fontSize: 14, color: colors.textMuted, marginTop: 16, lineHeight: 20 },
  qty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginVertical: 28 },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 18, fontWeight: '600', minWidth: 24, textAlign: 'center' },
});
