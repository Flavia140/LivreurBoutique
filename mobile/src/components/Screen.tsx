import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { colors } from '@/theme';

/** Écran blanc avec retour, titre et contenu défilant (formulaires). */
export function Screen({ title, subtitle, back = true, children }: { title?: string; subtitle?: string; back?: boolean; children: ReactNode }) {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {back && navigation.canGoBack() ? (
            <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 16 }} accessibilityLabel="Retour">
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
          ) : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 24 },
});
