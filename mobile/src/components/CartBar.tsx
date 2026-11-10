import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useCart } from '@/lib/cart';
import { fcfa } from '@/lib/format';
import { colors, radius } from '@/theme';

/** Barre flottante « Voir le panier ». */
export function CartBar() {
  const cart = useCart();
  if (cart.count === 0) return null;
  return (
    <Pressable style={styles.bar} onPress={() => router.push('/cart')}>
      <Text style={styles.text}>Voir le panier ({cart.count})</Text>
      <Text style={styles.text}>{fcfa(cart.subtotal)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 20, right: 20, bottom: 24, height: 52, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  text: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
