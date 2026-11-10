import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

/** Onglets segmentés (Toutes / En cours / Terminées…). */
export function Segments<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.row}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.tab, o.value === value && styles.active]}>
          <Text style={[styles.text, o.value === value && { color: colors.primary, fontWeight: '700' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, marginBottom: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderColor: 'transparent' },
  active: { borderColor: colors.primary },
  text: { color: colors.textMuted, fontSize: 14 },
});
