import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ProductImage } from '@/components/ProductRow';
import { Segments } from '@/components/Tabs';
import { fcfa } from '@/lib/format';
import type { Paginated, Product } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

type Filter = 'all' | 'active' | 'inactive';

/** Catalogue de la boutique (maquette commerçant 4). */
export default function MerchantProducts() {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const list = useApi<Paginated<Product>>(`/merchant/products?status=${filter}&q=${encodeURIComponent(q)}`);
  useFocusEffect(useCallback(() => { list.reload(); }, [list.reload]));
  const noShop = list.error?.includes('boutique');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Produits</Text>
        {!noShop ? (
          <Pressable style={styles.add} onPress={() => router.push('/merchant/product/new')} accessibilityLabel="Ajouter un produit">
            <Ionicons name="add" size={20} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>Ajouter</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher un produit" style={{ flex: 1, fontSize: 15 }} placeholderTextColor="#9AA0A6" />
        </View>
        <Segments value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Tous' }, { value: 'active', label: 'Actifs' }, { value: 'inactive', label: 'Inactifs' }]} />
      </View>
      <FlatList
        data={list.data?.data ?? []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={list.loading} onRefresh={list.reload} />}
        ListEmptyComponent={list.loading ? undefined : (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={styles.empty}>{noShop ? "Créez d'abord votre boutique." : 'Aucun produit. Ajoutez votre premier article.'}</Text>
            {noShop ? <Pressable onPress={() => router.push('/merchant/setup')}><Text style={styles.link}>Créer ma boutique</Text></Pressable> : null}
          </View>
        )}
        renderItem={({ item: p }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/merchant/product/${p.id}`)}>
            <ProductImage product={p} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{fcfa(p.current_price)}{p.promo_price ? <Text style={styles.strike}>  {fcfa(p.price)}</Text> : null}</Text>
              <Text style={styles.small}>{p.stock === null ? 'Stock illimité' : `Stock : ${p.stock}`} · {p.sold_count} vendu(s)</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: p.active ? '#E8F5E9' : '#F1F3F4' }]}>
              <Text style={{ fontSize: 11, color: p.active ? colors.success : colors.textMuted }}>{p.active ? 'Actif' : 'Inactif'}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, height: 44, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
  name: { fontWeight: '600', color: colors.text },
  strike: { color: colors.textMuted, textDecorationLine: 'line-through', fontWeight: '400', fontSize: 12 },
  small: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  empty: { color: colors.textMuted, textAlign: 'center' },
  link: { color: colors.primary, fontWeight: '600', marginTop: 10 },
});
