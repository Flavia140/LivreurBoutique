import { useEffect } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { ShopCard } from '@/components/ShopCard';
import { useCart } from '@/lib/cart';
import { useCity } from '@/lib/city';
import type { Shop } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

const CATEGORIES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'alimentaire', label: 'Alimentation', icon: 'restaurant-outline' },
  { key: 'sante', label: 'Pharmacies', icon: 'medkit-outline' },
  { key: 'beaute', label: 'Beauté', icon: 'sparkles-outline' },
  { key: 'electronique', label: 'Électronique', icon: 'phone-portrait-outline' },
  { key: 'maison', label: 'Maison', icon: 'home-outline' },
  { key: 'mode', label: 'Mode', icon: 'shirt-outline' },
  { key: 'autre', label: 'Plus', icon: 'grid-outline' },
];

/** Accueil client (maquette client 2). */
export default function ClientHome() {
  const { city, ready } = useCity();
  const cart = useCart();
  const featured = useApi<{ data: Shop[] }>(city ? `/shops?city=${encodeURIComponent(city)}&featured=1` : null);
  const all = useApi<{ data: Shop[] }>(city ? `/shops?city=${encodeURIComponent(city)}` : null);

  useEffect(() => {
    if (ready && !city) router.replace('/city');
  }, [ready, city]);

  const popular = featured.data?.data.length ? featured.data.data : all.data?.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.header}>
          <Pressable style={styles.cityBtn} onPress={() => router.push('/city')}>
            <Ionicons name="location-outline" size={18} color={colors.text} />
            <Text style={styles.city}>{city ?? '…'}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => router.push('/cart')} hitSlop={10} accessibilityLabel="Panier">
            <Ionicons name="bag-outline" size={24} color={colors.text} />
            {cart.count > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{cart.count}</Text></View> : null}
          </Pressable>
        </View>

        <Pressable style={styles.search} onPress={() => router.push('/search' as Href)}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={{ color: '#9AA0A6' }}>Rechercher un produit, une boutique…</Text>
        </Pressable>

        <View style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Livraison rapide et fiable avec des étudiants</Text>
            <Text style={styles.bannerSub}>7h00 – 21h00</Text>
          </View>
          <Image source={require('../../../assets/images/onboarding-2.png')} style={styles.bannerImg} resizeMode="contain" />
        </View>

        <View style={styles.grid}>
          {CATEGORIES.map((c) => (
            <Pressable key={c.key} style={styles.cat} onPress={() => router.push({ pathname: '/shops', params: { category: c.key, label: c.label } } as unknown as Href)}>
              <View style={styles.catIcon}><Ionicons name={c.icon} size={22} color={colors.primary} /></View>
              <Text style={styles.catLabel}>{c.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.cat} onPress={() => router.push('/client/send')}>
            <View style={styles.catIcon}><Ionicons name="cube-outline" size={22} color={colors.primary} /></View>
            <Text style={styles.catLabel}>Colis</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.section}>Boutiques populaires</Text>
          <Pressable onPress={() => router.push('/shops' as Href)}><Text style={styles.link}>Voir tout</Text></Pressable>
        </View>
        <FlatList horizontal data={popular} keyExtractor={(s) => String(s.id)} showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />} renderItem={({ item }) => <ShopCard shop={item} />}
          ListEmptyComponent={<Text style={{ color: colors.textMuted }}>{all.loading ? 'Chargement…' : 'Aucune boutique dans cette ville pour le moment.'}</Text>} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cityBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  city: { fontSize: 16, fontWeight: '600', color: colors.text },
  badge: { position: 'absolute', top: -6, right: -8, backgroundColor: colors.primary, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, height: 46, paddingHorizontal: 14, marginBottom: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.lg, padding: 16, height: 120, overflow: 'hidden', marginBottom: 20 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bannerSub: { color: '#fff', fontSize: 12, marginTop: 6 },
  bannerImg: { width: 110, height: 120, marginRight: -10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16, marginBottom: 20 },
  cat: { width: '25%', alignItems: 'center' },
  catIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 11, color: colors.text, marginTop: 6 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  section: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { color: colors.primary, fontSize: 13, fontWeight: '600' },
});
