import { useCallback } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Button } from '@/components/Button';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SHOP_STATUS, type MerchantState } from '@/lib/merchant';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

type Dashboard = {
  shop: { id: number; name: string; status: string } | null;
  subscription: { plan: string; label: string; ends_at: string } | null;
  month_sales: number; month_orders: number; month_items_sold: number; month_clients: number; pending_orders: number;
};

/** Tableau de bord commerçant (maquette commerçant 2), avec les étapes d'ouverture tant que la boutique n'est pas en ligne. */
export default function MerchantHome() {
  const { user, signOut } = useAuth();
  const dash = useApi<{ data: Dashboard }>('/merchant/dashboard');
  const state = useApi<{ data: MerchantState }>('/merchant/shop');
  useFocusEffect(useCallback(() => { dash.reload(); state.reload(); }, [dash.reload, state.reload]));
  const d = dash.data?.data;
  const s = state.data?.data;

  if (s && s.application_status !== 'approved') {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="hourglass-outline" size={48} color={colors.primary} />
        <Text style={styles.title}>Demande en cours d'examen</Text>
        <Text style={styles.text}>L'équipe YAKO vérifie les documents de « {user?.merchant?.business_name} ». Vous serez contacté pour finaliser le contrat.</Text>
        <Button title="Actualiser" variant="outline" onPress={() => state.reload()} style={{ alignSelf: 'stretch', marginTop: 24 }} />
        <Button title="Se déconnecter" variant="ghost" onPress={async () => { await signOut(); router.replace('/login'); }} style={{ alignSelf: 'stretch' }} />
      </SafeAreaView>
    );
  }

  const submit = async () => {
    try {
      await api('/merchant/shop/submit', { method: 'POST' });
      state.reload();
      Alert.alert('Demande envoyée', "L'équipe YAKO vérifie votre boutique avant la mise en ligne.");
    } catch (e) { Alert.alert('Pas encore', errorMessage(e)); }
  };

  const steps = [
    { done: !!s?.subscription, label: 'Choisir un abonnement', href: '/merchant/subscribe' },
    { done: !!s?.shop, label: 'Créer la boutique depuis un modèle', href: '/merchant/setup' },
    { done: (d?.shop && s?.shop?.status !== 'draft') || false, label: 'Ajouter des produits et demander la mise en ligne', href: '/merchant/products' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={dash.loading} onRefresh={() => { dash.reload(); state.reload(); }} />}>
        <Text style={styles.small}>Bonjour,</Text>
        <Text style={styles.hello}>{d?.shop?.name ?? user?.merchant?.business_name}</Text>
        {s?.shop ? <Text style={[styles.small, { color: s.shop.status === 'live' ? colors.success : colors.primary }]}>{SHOP_STATUS[s.shop.status]}</Text> : null}

        {d?.subscription ? (
          <Pressable style={styles.sub} onPress={() => router.push('/merchant/subscribe')}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Abonnement {d.subscription.label}</Text>
            <Text style={styles.small}>Expire le {new Date(d.subscription.ends_at).toLocaleDateString('fr-FR')}</Text>
          </Pressable>
        ) : null}

        {s?.shop?.status !== 'live' ? (
          <View style={styles.card}>
            <Text style={[styles.section, { marginTop: 0 }]}>Ouvrir ma boutique</Text>
            {steps.map((st) => (
              <Pressable key={st.label} style={styles.step} onPress={() => router.push(st.href as Href)}>
                <Ionicons name={st.done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={st.done ? colors.success : colors.textMuted} />
                <Text style={{ flex: 1, color: colors.text }}>{st.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
            {s?.shop?.status === 'draft' ? <Button title="Demander la mise en ligne" onPress={submit} style={{ marginTop: 12 }} /> : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.small}>Ventes du mois</Text>
          <Text style={styles.big}>{(d?.month_sales ?? 0).toLocaleString('fr-FR')} <Text style={{ fontSize: 14 }}>FCFA</Text></Text>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <Mini label="Commandes" value={d?.month_orders ?? 0} />
            <Mini label="Produits vendus" value={d?.month_items_sold ?? 0} />
            <Mini label="Clients" value={d?.month_clients ?? 0} />
          </View>
        </View>

        <Text style={styles.section}>Accès rapide</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Quick icon="receipt-outline" label="Commandes" badge={d?.pending_orders} onPress={() => router.push('/merchant/orders')} />
          <Quick icon="pricetags-outline" label="Produits" onPress={() => router.push('/merchant/products')} />
          <Quick icon="color-palette-outline" label="Ma boutique" onPress={() => router.push('/merchant/setup')} />
          <Quick icon="card-outline" label="Abonnement" onPress={() => router.push('/merchant/subscribe')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return <View style={{ flex: 1 }}><Text style={styles.small}>{label}</Text><Text style={{ fontSize: 18, fontWeight: '700', marginTop: 2 }}>{value.toLocaleString('fr-FR')}</Text></View>;
}

function Quick({ icon, label, onPress, badge }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable style={styles.quick} onPress={onPress}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      {badge ? <View style={styles.badge}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badge}</Text></View> : null}
      <Text style={{ fontSize: 11, marginTop: 6, color: colors.text }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  text: { color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  small: { fontSize: 12, color: colors.textMuted },
  hello: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 12, marginTop: 16 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, marginTop: 16 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  big: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  section: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  quick: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 14 },
  badge: { position: 'absolute', top: 6, right: 10, backgroundColor: colors.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
});
