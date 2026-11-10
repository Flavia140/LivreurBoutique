import { useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

type Slide = { key: string; before: string; accent: string; after: string; accentFirst?: boolean; text: string; image: ImageSourcePropType };

const SLIDES: Slide[] = [
  { key: '1', before: 'Achetez\ntout ce que\nvous ', accent: 'aimez', after: '', text: 'Des milliers de produits et de boutiques locales à portée de main.', image: require('../../assets/images/onboarding-1.png') },
  { key: '2', before: '', accent: 'Livrez', after: '\nrapidement\net en sécurité', accentFirst: true, text: 'Nos livreurs étudiants sont disponibles tous les jours de 7h à 21h.', image: require('../../assets/images/onboarding-2.png') },
  { key: '3', before: '', accent: 'Vivez', after: '\nsereinement,\nnous faisons\nle reste', accentFirst: true, text: 'Suivez votre commande en temps réel et profitez de chaque instant.', image: require('../../assets/images/onboarding-3.png') },
];

/** Présentation en 3 écrans (maquette 2). */
export default function Onboarding() {
  const { width } = useWindowDimensions();
  const { finishOnboarding } = useAuth();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<Slide>>(null);

  const done = async () => {
    await finishOnboarding();
    router.replace('/login');
  };

  const next = () => {
    if (index < SLIDES.length - 1) list.current?.scrollToIndex({ index: index + 1 });
    else done();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={done} style={styles.skip} hitSlop={12}><Text style={styles.skipText}>Passer</Text></Pressable>
      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: 24 }}>
            <Text style={styles.title}>
              {item.before}<Text style={{ color: colors.primary }}>{item.accent}</Text>{item.after}
            </Text>
            <Text style={styles.text}>{item.text}</Text>
            <Image source={item.image} style={styles.image} resizeMode="contain" />
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((s, i) => <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />)}
      </View>
      <Button title={index === SLIDES.length - 1 ? 'Commencer' : 'Suivant'} onPress={next} style={{ marginHorizontal: 24, marginBottom: 16 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  skip: { alignSelf: 'flex-end', padding: 16 },
  skipText: { color: colors.text, fontSize: 14 },
  title: { fontSize: 30, fontWeight: '700', color: colors.text, lineHeight: 38, marginTop: 8 },
  text: { fontSize: 14, color: colors.textMuted, marginTop: 16, lineHeight: 21, maxWidth: 260 },
  image: { flex: 1, width: '100%', marginTop: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D0D0D0' },
  dotActive: { backgroundColor: colors.primary },
});
