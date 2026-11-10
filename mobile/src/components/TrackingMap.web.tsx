import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/theme';

/** Version web (aperçu) : la carte native n'existe que sur téléphone. */
export function TrackingMap({ courier }: { courier?: { lat: number; lng: number } }) {
  return (
    <View style={styles.box}>
      <Ionicons name="map-outline" size={36} color={colors.primary} />
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
        {courier ? `Livreur : ${courier.lat.toFixed(4)}, ${courier.lng.toFixed(4)}` : 'La carte s\'affiche sur téléphone'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ box: { height: 200, borderRadius: radius.lg, backgroundColor: '#EEF1F4', alignItems: 'center', justifyContent: 'center', marginVertical: 16 } });
