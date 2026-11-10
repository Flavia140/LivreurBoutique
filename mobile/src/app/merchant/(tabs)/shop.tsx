import { useCallback } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { SHOP_STATUS, TEMPLATES, type MerchantState } from '@/lib/merchant';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

/** Vitrine de la boutique telle que la voient les clients, et réglages du compte. */
export default function MerchantShop() {
  const { user, signOut } = useAuth();
  const state = useApi<{ data: MerchantState }>('/merchant/shop');
  useFocusEffect(useCallback(() => { state.reload(); }, [state.reload]));
  const shop = state.data?.data.shop;
  const sub = state.data?.data.subscription;

  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; href?: Href; onPress?: () => void }[] = [
    { icon: 'color-palette-outline', label: shop ? 'Modifier la boutique (modèle, logo, couleur)' : 'Créer ma boutique', href: '/merchant/setup' },
    { icon: 'card-outline', label: sub ? `Abonnement jusqu'au ${new Date(sub.ends_at).toLocaleDateString('fr-FR')}` : 'Choisir un abonnement', href: '/merchant/subscribe' },
    { icon: 'log-out-outline', label: 'Se déconnecter', onPress: async () => { await signOut(); router.replace('/login'); } },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.banner, { backgroundColor: shop?.color ?? colors.primary }]}>
          {shop?.banner_url ? <Image source={{ uri: shop.banner_url }} style={StyleSheet.absoluteFill} /> : null}
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <View style={[styles.logo, { borderColor: shop?.color ?? colors.primary }]}>
            {shop?.logo_url ? <Image source={{ uri: shop.logo_url }} style={StyleSheet.absoluteFill} /> : <Ionicons name="storefront" size={28} color={shop?.color ?? colors.primary} />}
          </View>
          <Text style={styles.name}>{shop?.name ?? user?.merchant?.business_name}</Text>
          {shop ? (
            <>
              <Text style={styles.small}>{TEMPLATES.find((t) => t.key === shop.template)?.label} · {shop.zone?.name ?? ''} · {shop.address}</Text>
              <View style={[styles.status, { backgroundColor: shop.status === 'live' ? '#E8F5E9' : colors.primarySoft }]}>
                <Text style={{ color: shop.status === 'live' ? colors.success : colors.primary, fontWeight: '600', fontSize: 12 }}>{SHOP_STATUS[shop.status]}</Text>
              </View>
              {shop.description ? <Text style={styles.desc}>{shop.description}</Text> : null}
              {shop.rating_count ? <Text style={styles.small}>★ {shop.rating_avg?.toFixed(1)} ({shop.rating_count} avis)</Text> : null}
            </>
          ) : <Text style={styles.small}>Vous n'avez pas encore créé votre boutique.</Text>}

          <View style={{ marginTop: 20 }}>
            {rows.map((r) => (
              <Pressable key={r.label} style={styles.row} onPress={r.onPress ?? (() => router.push(r.href!))}>
                <Ionicons name={r.icon} size={20} color={colors.primary} />
                <Text style={{ flex: 1, color: colors.text }}>{r.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
          <Text style={[styles.small, { marginTop: 16 }]}>Compte : {user?.first_name} {user?.last_name} · {user?.phone}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: { height: 120 },
  logo: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: -36 },
  name: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  small: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  status: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  desc: { color: colors.text, marginTop: 10, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border },
});
