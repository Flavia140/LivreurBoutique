import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, type Zone } from '@/lib/api';
import { colors, radius } from '@/theme';

/** Choix du quartier dans la liste officielle : garantit qu'un tarif existe. */
export function ZonePicker({ label, value, onChange }: { label: string; value: Zone | null; onChange: (z: Zone) => void }) {
  const [open, setOpen] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (open && zones.length === 0) api<{ data: Zone[] }>('/zones').then((r) => setZones(r.data)).catch(() => {});
  }, [open, zones.length]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? zones.filter((z) => `${z.name} ${z.city}`.toLowerCase().includes(s)) : zones;
  }, [q, zones]);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={{ flex: 1, color: value ? colors.text : '#9AA0A6', fontSize: 15 }}>
          {value ? `${value.name}, ${value.city}` : 'Choisir un quartier'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
            <Text style={styles.title}>{label}</Text>
          </View>
          <TextInput placeholder="Rechercher un quartier ou une ville" value={q} onChangeText={setQ} style={styles.search} />
          <FlatList
            data={filtered}
            keyExtractor={(z) => String(z.id)}
            renderItem={({ item }) => (
              <Pressable style={styles.item} onPress={() => { onChange(item); setOpen(false); }}>
                <Text style={{ fontSize: 15, color: colors.text }}>{item.name}</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>{item.city}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, height: 52 },
  sheet: { flex: 1, paddingTop: 48, paddingHorizontal: 20, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  search: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, height: 48, marginBottom: 8 },
  item: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
