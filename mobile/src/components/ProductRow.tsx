import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { fcfa } from '@/lib/format';
import type { Product } from '@/lib/types';
import { colors, radius } from '@/theme';

export function ProductImage({ product, size }: { product: Product; size: number }) {
  return product.image_url ? (
    <Image source={{ uri: product.image_url }} style={{ width: size, height: size, borderRadius: radius.sm }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="image-outline" size={size / 3} color={colors.primary} />
    </View>
  );
}

export function ProductRow({ product, onAdd }: { product: Product; onAdd: () => void }) {
  return (
    <Pressable style={styles.row} onPress={() => router.push(`/product/${product.id}`)}>
      <ProductImage product={product} size={56} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.price}>{fcfa(product.current_price)}</Text>
        {product.promo_price ? <Text style={styles.old}>{fcfa(product.price)}</Text> : null}
      </View>
      <Pressable style={[styles.add, !product.available && { opacity: 0.4 }]} disabled={!product.available} onPress={onAdd} accessibilityLabel={`Ajouter ${product.name}`}>
        <Ionicons name="add" size={20} color="#fff" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  name: { fontSize: 14, color: colors.text },
  price: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4 },
  old: { fontSize: 12, color: colors.textMuted, textDecorationLine: 'line-through' },
  add: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
