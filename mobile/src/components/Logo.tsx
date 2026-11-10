import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

export function Logo({ size = 64, light = false }: { size?: number; light?: boolean }) {
  const ink = light ? '#fff' : colors.text;
  return (
    <View style={{ alignItems: 'center' }}>
      <Image source={require('../../assets/images/logo.png')} style={{ width: size, height: size, borderRadius: size * 0.2 }} />
      <Text style={[styles.name, { color: ink, fontSize: size * 0.45 }]}>YAKO</Text>
      <Text style={[styles.tagline, { color: light ? '#fff' : colors.textMuted }]}>
        Achetez <Text style={{ color: light ? '#fff' : colors.primary }}>|</Text> Livrez <Text style={{ color: light ? '#fff' : colors.primary }}>|</Text> Vivez
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontWeight: '800', letterSpacing: 1, marginTop: 8 },
  tagline: { fontSize: 12, marginTop: 2 },
});
