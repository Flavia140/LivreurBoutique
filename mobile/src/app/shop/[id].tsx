import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { CartBar } from '@/components/CartBar';
import { ProductRow } from '@/components/ProductRow';
import { useCart } from '@/lib/cart';
import type { Product, Shop } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

const CATEGORY_LABEL: Record<string, string> = { alimentaire: 'Alimentation', mode: 'Mode', electronique: 'Électronique', sante: 'Santé', beaute: 'Beauté', maison: 'Maison', autre: 'Divers' };

/**
 * Boutique (maquette client 3). La mise en page suit le modèle choisi par le commerçant :
 * la couleur et la bannière viennent de sa personnalisation.
 */
export default function ShopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cart = useCart();
  const [category, setCategory] = useState<number | null>(null);
  const shop = useApi<{ data: Shop }>(`/shops/${id}`);
  const products = useApi<{ data: Product[] }>(`/shops/${id}/products${category ? `?category=${category}` : ''}`);
  const s = shop.data?.data;

  if (!s) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;

  const heroTitle = s.template === 'alimentation' ? 'Produits frais' : s.template === 'mode' ? 'Nouvelle collection' : s.template === 'electronique' ? 'High-tech' : 'Nos produits';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={26} color={colors.text} /></Pressable>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {s.logo_url ? <Image source={{ uri: s.logo_url }} style={styles.logo} /> : <View style={[styles.logo, { backgroundColor: s.color, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#fff', fontWeight: '800' }}>{s.name[0]}</Text></View>}
            <View>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.meta}>★ {s.rating_avg?.toFixed(1) ?? '–'} ({s.rating_count} avis) · {CATEGORY_LABEL[s.category] ?? s.category}</Text>
            </View>
          </View>
        </View>
        <View style={styles.info}>
          <Ionicons name="bicycle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.meta}>Livraison {s.delivery_estimate[0]}–{s.delivery_estimate[1]} min · tarif fixe selon votre zone</Text>
        </View>

        <View style={[styles.hero, { backgroundColor: s.color }]}>
          {s.banner_url ? <Image source={{ uri: s.banner_url }} style={StyleSheet.absoluteFill} /> : null}
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          {s.description ? <Text style={styles.heroSub} numberOfLines={2}>{s.description}</Text> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {[{ id: null, name: 'Tous' }, ...(s.categories ?? [])].map((c) => (
            <Pressable key={String(c.id)} onPress={() => setCategory(c.id)} style={[styles.tab, category === c.id && { borderBottomColor: s.color }]}>
              <Text style={[styles.tabText, category === c.id && { color: colors.text, fontWeight: '700' }]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 20 }}>
          <Text style={styles.section}>Produits populaires</Text>
          {products.data?.data.map((p) => (
            <ProductRow key={p.id} product={p} onAdd={() => cart.add({ id: s.id, name: s.name, color: s.color, zone: s.zone }, p)} />
          ))}
          {products.loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} /> : null}
        </View>
      </ScrollView>
      <CartBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8 },
  logo: { width: 40, height: 40, borderRadius: 20 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  info: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginTop: 12 },
  hero: { marginHorizontal: 20, marginTop: 16, height: 110, borderRadius: radius.lg, padding: 16, justifyContent: 'center', overflow: 'hidden' },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroSub: { color: '#fff', fontSize: 12, marginTop: 4, maxWidth: '75%' },
  tabs: { paddingHorizontal: 20, gap: 18, marginTop: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tab: { paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { color: colors.textMuted, fontSize: 13 },
  section: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 16 },
});
