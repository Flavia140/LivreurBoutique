import { FlatList, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { ShopCard } from '@/components/ShopCard';
import { useCity } from '@/lib/city';
import type { Shop } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { colors } from '@/theme';

/** Liste des boutiques de la ville, éventuellement filtrée par catégorie. */
export default function Shops() {
  const { category, label } = useLocalSearchParams<{ category?: string; label?: string }>();
  const { city } = useCity();
  const query = city ? `/shops?city=${encodeURIComponent(city)}${category ? `&category=${category}` : ''}` : null;
  const { data, loading } = useApi<{ data: Shop[] }>(query);

  return (
    <Screen title={label ?? 'Boutiques'} subtitle={city ? `À ${city}` : undefined}>
      <FlatList scrollEnabled={false} data={data?.data ?? []} numColumns={2} keyExtractor={(s) => String(s.id)}
        columnWrapperStyle={{ gap: 12 }} ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        renderItem={({ item }) => <View style={{ flex: 1 }}><ShopCard shop={item} width={undefined as unknown as number} /></View>}
        ListEmptyComponent={<Text style={{ color: colors.textMuted }}>{loading ? 'Chargement…' : 'Aucune boutique pour le moment.'}</Text>} />
    </Screen>
  );
}
