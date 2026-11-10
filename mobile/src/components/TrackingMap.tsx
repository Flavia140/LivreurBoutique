import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors, radius } from '@/theme';

type Props = { courier?: { lat: number; lng: number } };

// Cotonou par défaut tant que la position du livreur n'est pas connue.
const COTONOU = { latitude: 6.3654, longitude: 2.4183 };

export function TrackingMap({ courier }: Props) {
  const center = courier ? { latitude: courier.lat, longitude: courier.lng } : COTONOU;
  return (
    <View style={styles.box}>
      <MapView style={StyleSheet.absoluteFill} region={{ ...center, latitudeDelta: 0.03, longitudeDelta: 0.03 }}>
        {courier ? <Marker coordinate={center} title="Votre livreur" pinColor={colors.primary} /> : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({ box: { height: 200, borderRadius: radius.lg, overflow: 'hidden', marginVertical: 16 } });
