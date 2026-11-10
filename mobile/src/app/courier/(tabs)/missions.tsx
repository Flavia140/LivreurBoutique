import { useCallback } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Button } from '@/components/Button';
import { api, errorMessage } from '@/lib/api';
import { PARCEL_TYPE, fcfa } from '@/lib/format';
import type { Delivery } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

/** Courses disponibles dans la zone du livreur : le premier qui accepte la prend. */
export default function Missions() {
  const { data, reload, loading, error } = useApi<{ data: Delivery[] }>('/courier/missions');
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const accept = async (d: Delivery) => {
    try {
      await api(`/courier/missions/${d.id}/accept`, { method: 'POST' });
      router.push(`/courier/mission/${d.id}`);
    } catch (e) {
      Alert.alert('Course indisponible', errorMessage(e));
      reload();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <Text style={styles.title}>Courses disponibles</Text>
      <FlatList data={data?.data ?? []} keyExtractor={(d) => String(d.id)} contentContainerStyle={{ padding: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListEmptyComponent={<Text style={{ color: colors.textMuted }}>{error ?? 'Aucune course pour le moment dans votre zone.'}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '700' }}>#{item.code}</Text>
              <Text style={{ fontWeight: '700', color: colors.success }}>+{fcfa(item.price)}</Text>
            </View>
            <Text style={styles.line}>Départ : {item.pickup.zone?.name} · {item.pickup.address}</Text>
            <Text style={styles.line}>Arrivée : {item.dropoff.zone?.name} · {item.dropoff.address}</Text>
            <Text style={styles.line}>Colis : {item.order_id ? 'Commande boutique' : PARCEL_TYPE[item.parcel_type] ?? item.parcel_type}{item.notes ? ` · ${item.notes}` : ''}</Text>
            {item.payment_method === 'cash' ? <Text style={[styles.line, { color: colors.primary }]}>Espèces à encaisser : {fcfa(item.total)}</Text> : null}
            <Button title="Accepter la course" onPress={() => accept(item)} style={{ marginTop: 12, height: 44 }} />
          </View>
        )} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', paddingHorizontal: 20, paddingTop: 12 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14 },
  line: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
});
