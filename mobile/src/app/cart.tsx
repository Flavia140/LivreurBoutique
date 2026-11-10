import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { ProductImage } from '@/components/ProductRow';
import { Screen } from '@/components/Screen';
import { useCart } from '@/lib/cart';
import { fcfa } from '@/lib/format';
import { colors } from '@/theme';

/** Panier (maquette client 5). Les frais de livraison s'affichent après le choix de la zone. */
export default function Cart() {
  const cart = useCart();

  if (cart.count === 0) {
    return (
      <Screen title="Mon panier">
        <Text style={{ color: colors.textMuted, marginBottom: 24 }}>Votre panier est vide.</Text>
        <Button title="Découvrir les boutiques" onPress={() => router.replace('/client')} />
      </Screen>
    );
  }

  return (
    <Screen title="Mon panier" subtitle={cart.shop?.name}>
      {cart.lines.map(({ product, quantity }) => (
        <View key={product.id} style={styles.line}>
          <ProductImage product={product} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.price}>{fcfa(product.current_price)}</Text>
            <View style={styles.qty}>
              <Pressable onPress={() => cart.setQuantity(product.id, quantity - 1)} hitSlop={8}><Ionicons name="remove-circle-outline" size={24} color={colors.text} /></Pressable>
              <Text style={{ minWidth: 20, textAlign: 'center' }}>{quantity}</Text>
              <Pressable onPress={() => cart.setQuantity(product.id, quantity + 1)} hitSlop={8}><Ionicons name="add-circle-outline" size={24} color={colors.text} /></Pressable>
            </View>
          </View>
          <Pressable onPress={() => cart.setQuantity(product.id, 0)} hitSlop={10} accessibilityLabel="Retirer"><Ionicons name="trash-outline" size={20} color={colors.textMuted} /></Pressable>
        </View>
      ))}
      <View style={styles.total}>
        <Text style={styles.label}>Sous-total</Text>
        <Text style={styles.value}>{fcfa(cart.subtotal)}</Text>
      </View>
      <Text style={styles.note}>Les frais de livraison (tarif fixe selon votre zone) sont ajoutés à l'étape suivante.</Text>
      <Button title="Passer la commande" onPress={() => router.push('/checkout/address')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  name: { fontSize: 14, color: colors.text },
  price: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  total: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  label: { fontSize: 15, color: colors.textMuted },
  value: { fontSize: 15, fontWeight: '700', color: colors.text },
  note: { fontSize: 12, color: colors.textMuted, marginVertical: 16 },
});
