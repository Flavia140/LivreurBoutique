import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/theme';

type Props = TextInputProps & { label?: string; secure?: boolean; error?: string };

export function Input({ label, secure, error, style, ...rest }: Props) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, rest.multiline ? { height: undefined, minHeight: 52, alignItems: 'stretch' } : null, error ? { borderColor: colors.danger } : null]}>
        <TextInput
          placeholderTextColor="#9AA0A6"
          secureTextEntry={secure && hidden}
          style={[styles.input, style]}
          {...rest}
        />
        {secure ? (
          <Pressable onPress={() => setHidden(!hidden)} hitSlop={12} accessibilityLabel={hidden ? 'Afficher le mot de passe' : 'Masquer le mot de passe'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, height: 52, backgroundColor: '#fff',
  },
  input: { flex: 1, fontSize: 15, color: colors.text },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
