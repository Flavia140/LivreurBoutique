import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { normalizeBeninPhone } from '@/lib/phone';
import { colors } from '@/theme';
import { Input } from './Input';

type Props = {
  purpose: 'register' | 'reset';
  phone: string;
  code: string;
  onPhone: (v: string) => void;
  onCode: (v: string) => void;
};

/** Numéro de téléphone + envoi et saisie du code SMS. */
export function PhoneOtpFields({ purpose, phone, code, onPhone, onCode }: Props) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    setError(undefined);
    setSending(true);
    try {
      await api('/auth/otp', { method: 'POST', body: { phone: normalizeBeninPhone(phone), purpose } });
      setSent(true);
      setWait(60);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <View>
      <Input label="Numéro de téléphone" placeholder="01 97 00 00 00" keyboardType="phone-pad" value={phone} onChangeText={onPhone} error={error} />
      <Pressable onPress={send} disabled={sending || wait > 0 || phone.replace(/\D/g, '').length < 8} style={styles.link}>
        <Text style={[styles.linkText, (sending || wait > 0) && { color: colors.textMuted }]}>
          {sending ? 'Envoi…' : wait > 0 ? `Renvoyer le code dans ${wait} s` : sent ? 'Renvoyer le code' : 'Recevoir le code par SMS'}
        </Text>
      </Pressable>
      {sent ? <Input label="Code reçu par SMS" placeholder="6 chiffres" keyboardType="number-pad" maxLength={6} value={code} onChangeText={onCode} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 14 },
  linkText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});
