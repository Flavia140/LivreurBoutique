import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';

type Option<T extends string> = { value: T; label: string };

/** Sélecteur simple en pastilles (catégorie, véhicule…). */
export function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: Option<T>[]; value: T | null; onChange: (v: T) => void }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && { color: colors.primary, fontWeight: '600' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { color: colors.text, fontSize: 14 },
});
