import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useCity } from '@/lib/city';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

type City = { city: string; zones: number; available: boolean };

/** Choix de la ville (maquette client 1). */
export default function ChooseCity() {
  const { data, loading } = useApi<{ data: City[] }>('/cities');
  const { city, setCity } = useCity();
  const [selected, setSelected] = useState<string | null>(null);
  const current = selected ?? city;

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Ionicons name="location" size={48} color={colors.primary} />
        <Text style={styles.title}>Choisissez votre ville</Text>
        <Text style={styles.sub}>Nous livrons actuellement dans les villes suivantes</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {data?.data.map((c) => (
        <Pressable key={c.city} style={[styles.row, current === c.city && styles.rowActive]} onPress={() => setSelected(c.city)}>
          <Ionicons name="location-sharp" size={20} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.city}>{c.city}</Text>
            <Text style={styles.available}>Disponible</Text>
          </View>
          <Ionicons name={current === c.city ? 'checkmark-circle' : 'chevron-forward'} size={20} color={current === c.city ? colors.primary : colors.textMuted} />
        </Pressable>
      ))}
      <Button title="Continuer" disabled={!current} style={{ marginTop: 24 }} onPress={async () => { await setCity(current!); router.replace('/client'); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 12 },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, marginBottom: 10 },
  rowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  city: { fontSize: 15, fontWeight: '600', color: colors.text },
  available: { fontSize: 12, color: colors.success, marginTop: 2 },
});
