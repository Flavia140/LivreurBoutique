import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Shop } from '@/lib/types';
import { colors, radius } from '@/theme';

export function ShopCard({ shop, width = 140 }: { shop: Shop; width?: number }) {
  return (
    <Pressable style={{ width }} onPress={() => router.push(`/shop/${shop.id}`)}>
      <View style={[styles.cover, { backgroundColor: shop.color }]}>
        {shop.banner_url ? <Image source={{ uri: shop.banner_url }} style={StyleSheet.absoluteFill} /> : (
          <Text style={styles.initial}>{shop.name.slice(0, 1)}</Text>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>{shop.name}</Text>
      <View style={styles.meta}>
        <Ionicons name="star" size={12} color="#F5A623" />
        <Text style={styles.metaText}>{shop.rating_avg?.toFixed(1) ?? 'Nouveau'}</Text>
      </View>
      <Text style={styles.metaText}>{shop.delivery_estimate[0]}–{shop.delivery_estimate[1]} min</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cover: { height: 90, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontSize: 36, fontWeight: '800' },
  name: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 11, color: colors.textMuted },
});
