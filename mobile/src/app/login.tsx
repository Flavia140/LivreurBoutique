import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { api, errorMessage, type User } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { homeFor } from '@/lib/routes';
import { normalizeBeninPhone } from '@/lib/phone';
import { colors, radius } from '@/theme';

/** Connexion (maquette 3). */
export default function Login() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    setError(undefined);
    setLoading(true);
    try {
      const res = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { phone: normalizeBeninPhone(phone), password } });
      await signIn(res.token, res.user);
      router.replace(homeFor(res.user));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const soon = () => Alert.alert('Bientôt disponible', 'La connexion avec Google et Facebook arrive dans une prochaine version.');

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <Logo size={64} />
        <Text style={styles.welcome}>Bienvenue !</Text>
        <Text style={styles.sub}>Connectez-vous pour continuer</Text>
      </View>
      <Input placeholder="Numéro de téléphone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} autoComplete="tel" />
      <Input placeholder="Mot de passe" secure value={password} onChangeText={setPassword} error={error} />
      <Pressable onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
        <Text style={styles.link}>Mot de passe oublié ?</Text>
      </Pressable>
      <Button title="Se connecter" onPress={submit} loading={loading} disabled={!phone || !password} />

      <View style={styles.separator}>
        <View style={styles.line} /><Text style={styles.or}>ou continuer avec</Text><View style={styles.line} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable style={styles.social} onPress={soon}><FontAwesome name="google" size={18} color="#EA4335" /><Text style={styles.socialText}>Google</Text></Pressable>
        <Pressable style={styles.social} onPress={soon}><FontAwesome name="facebook" size={18} color="#1877F2" /><Text style={styles.socialText}>Facebook</Text></Pressable>
      </View>

      <View style={{ alignItems: 'center', marginTop: 40 }}>
        <Text style={styles.sub}>Vous n'avez pas de compte ?</Text>
        <Pressable onPress={() => router.push('/register')}><Text style={[styles.link, { fontSize: 15, marginTop: 4 }]}>S'inscrire</Text></Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcome: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 24 },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  link: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { color: colors.textMuted, fontSize: 13 },
  social: { flex: 1, height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  socialText: { fontSize: 14, color: colors.text, fontWeight: '500' },
});
