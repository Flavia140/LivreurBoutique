import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/theme';

export type Network = 'MTN' | 'MOOV';
export type Method = Network | 'CASH';

const METHODS: { value: Network; label: string; bg: string; fg: string }[] = [
  { value: 'MTN', label: 'MTN Mobile Money', bg: '#FFCB05', fg: '#000' },
  { value: 'MOOV', label: 'Moov Money', bg: '#0B5BAA', fg: '#fff' },
];

export function PaymentMethods({ value, onChange, cashAllowed, cashLimit, hideCash }: { value: Method; onChange: (n: Method) => void; cashAllowed?: boolean; cashLimit?: number; hideCash?: boolean }) {
  return (
    <View>
      <Text style={styles.title}>Mobile Money</Text>
      {METHODS.map((m) => (
        <Pressable key={m.value} style={[styles.row, value === m.value && styles.active]} onPress={() => onChange(m.value)}>
          <View style={[styles.logo, { backgroundColor: m.bg }]}><Text style={{ color: m.fg, fontWeight: '800', fontSize: 11 }}>{m.value}</Text></View>
          <Text style={styles.label}>{m.label}</Text>
          <Ionicons name={value === m.value ? 'radio-button-on' : 'radio-button-off'} size={20} color={value === m.value ? colors.primary : colors.textMuted} />
        </Pressable>
      ))}
      {hideCash ? null : <>
      <Text style={[styles.title, { marginTop: 12 }]}>Autre option</Text>
      <Pressable style={[styles.row, value === 'CASH' && styles.active, !cashAllowed && { opacity: 0.5 }]} disabled={!cashAllowed} onPress={() => onChange('CASH')}>
        <View style={[styles.logo, { backgroundColor: '#E8F5E9' }]}><Ionicons name="cash-outline" size={20} color="#1E8E3E" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Paiement à la livraison</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{cashAllowed ? 'En espèces, au livreur' : `Disponible jusqu'à ${cashLimit?.toLocaleString('fr-FR') ?? '…'} FCFA`}</Text>
        </View>
        <Ionicons name={value === 'CASH' ? 'radio-button-on' : 'radio-button-off'} size={20} color={value === 'CASH' ? colors.primary : colors.textMuted} />
      </Pressable>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  active: { borderColor: colors.primary },
  logo: { width: 44, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 14, color: colors.text },
});
