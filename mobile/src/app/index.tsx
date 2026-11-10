import { useEffect } from 'react';
import { ActivityIndicator, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth';
import { homeFor } from '@/lib/routes';
import { colors } from '@/theme';

/** Écran de démarrage (maquette 1), puis redirection selon l'état du compte. */
export default function Splash() {
  const { ready, user, onboarded } = useAuth();

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      if (user) router.replace(homeFor(user));
      else router.replace(onboarded ? '/login' : '/onboarding');
    }, 1200);
    return () => clearTimeout(t);
  }, [ready, user, onboarded]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <Logo size={96} light />
      </View>
      <ImageBackground source={require('../../assets/images/splash-skyline.png')} style={styles.skyline} imageStyle={{ opacity: 0.35 }} resizeMode="cover">
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.loading}>Chargement…</Text>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  center: { flex: 1, justifyContent: 'center' },
  skyline: { height: 260, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 56 },
  loading: { color: '#fff', marginTop: 12, fontSize: 14 },
});
