import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { api } from './api';

/** Envoie la position du livreur toutes les 30 s pendant une course (app ouverte). */
export function useShareLocation(active: boolean) {
  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 50 }, (pos) => {
        api('/courier/location', { method: 'PATCH', body: { lat: pos.coords.latitude, lng: pos.coords.longitude } }).catch(() => {});
      });
    })();
    return () => sub?.remove();
  }, [active]);
}
