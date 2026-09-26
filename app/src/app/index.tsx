import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, VegDot } from '@/components/ui';
import { CATEGORY_LABEL, timeAgo, totalMinutes } from '@/lib/labels';
import { prefs } from '@/lib/prefs';
import type { Recipe } from '@/lib/recipeSchema';
import { supabase } from '@/lib/supabase';
import { color, size } from '@/lib/theme';

type Row = Pick<Recipe, 'title' | 'base_servings' | 'category' | 'is_veg' | 'steps' | 'ingredients'> & {
  id: string;
  taught_by: string | null;
  is_favorite: boolean;
  last_cooked_at: string | null;
};

const COLUMNS = 'id, title, base_servings, category, is_veg, steps, ingredients, taught_by, is_favorite, last_cooked_at';

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('recipes')
        .select(COLUMNS)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          setError(error?.message ?? null);
          setRows((data as Row[]) ?? []);
        });
    }, []),
  );

  // Filters are built from what the user actually has: favorites, who taught it, dish types.
  const filters = useMemo(() => {
    const teachers = [...new Set(rows.map((r) => r.taught_by).filter(Boolean))] as string[];
    const cats = [...new Set(rows.map((r) => r.category).filter(Boolean))].map((c) => CATEGORY_LABEL[c] ?? c);
    return ['All', 'Favorites', ...teachers, ...cats];
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'Favorites' && !r.is_favorite) return false;
      if (filter !== 'All' && filter !== 'Favorites' && r.taught_by !== filter && CATEGORY_LABEL[r.category] !== filter) return false;
      if (!q) return true;
      return r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q));
    });
  }, [rows, query, filter]);

  const recent = useMemo(
    () => rows.filter((r) => r.last_cooked_at).sort((a, b) => b.last_cooked_at!.localeCompare(a.last_cooked_at!)).slice(0, 6),
    [rows],
  );

  async function toggleFavorite(r: Row) {
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, is_favorite: !x.is_favorite } : x)));
    const { error } = await supabase.from('recipes').update({ is_favorite: !r.is_favorite }).eq('id', r.id);
    if (error) {
      setError(error.message);
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, is_favorite: r.is_favorite } : x)));
    }
  }

  if (!prefs.onboarded()) return <Redirect href="/welcome" />;

  const browsing = !query && filter === 'All';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }} edges={['top']}>
      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: size.pad, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 4 }}>
            <View>
              <Text style={s.hello}>
                {'Maa ke haath ka swaad,\nab kabhi nahi bhoolenge '}
                <Text style={{ color: color.accent }}>♥</Text>
              </Text>
              <Text style={s.tagline}>{"Nuskha · Mom's recipes, saved forever"}</Text>
            </View>

            <View style={s.addRow}>
              <AddTile icon="keyboard-outline" label="Type" onPress={() => router.push('/add')} />
              <AddTile icon="microphone-outline" label="Voice" soon />
              <AddTile icon="youtube" label="Video" soon />
            </View>

            {rows.length > 0 && (
              <>
                <View style={s.search}>
                  <MaterialCommunityIcons name="magnify" size={22} color={color.muted} />
                  <TextInput
                    style={s.searchInput}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search dish or ingredient"
                    placeholderTextColor={color.muted}
                    returnKeyType="search"
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {filters.map((f) => (
                    <Chip key={f} label={f === 'Favorites' ? '♥ Favorites' : f} on={f === filter} onPress={() => setFilter(f)} />
                  ))}
                </ScrollView>
              </>
            )}

            {browsing && recent.length > 0 && (
              <>
                <Text style={s.h2}>Recently cooked</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {recent.map((r) => (
                    <Pressable key={r.id} style={s.recent} onPress={() => router.push(`/recipe/${r.id}`)}>
                      <Text style={s.recentTitle} numberOfLines={2}>{r.title}</Text>
                      <Text style={s.meta}>{timeAgo(r.last_cooked_at!)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {rows.length > 0 && <Text style={s.h2}>{browsing ? 'All recipes' : `${shown.length} found`}</Text>}
            {error && <Text style={{ color: color.danger }}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          <Text style={s.empty}>
            {rows.length ? 'Nothing matches. Try another word or filter.' : 'Every recipe here is a memory.\nStart with the one you miss most.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => router.push(`/recipe/${item.id}`)}>
            <View style={s.cardTop}>
              <View style={s.cardTitleRow}>
                <VegDot veg={item.is_veg} />
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>
              </View>
              <Pressable onPress={() => toggleFavorite(item)} hitSlop={12} accessibilityLabel={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}>
                <MaterialCommunityIcons name={item.is_favorite ? 'heart' : 'heart-outline'} size={26} color={color.accent} />
              </Pressable>
            </View>
            <Text style={s.meta}>{cardMeta(item)}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function cardMeta(r: Row) {
  const mins = totalMinutes(r.steps);
  return [r.taught_by && `From ${r.taught_by}`, CATEGORY_LABEL[r.category], mins && `${mins} min`, `serves ${r.base_servings}`]
    .filter(Boolean)
    .join(' · ');
}

function AddTile({ icon, label, soon, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; soon?: boolean; onPress?: () => void }) {
  return (
    <Pressable style={[s.tile, soon && { opacity: 0.5 }]} onPress={onPress} disabled={soon} accessibilityLabel={soon ? `${label}, coming soon` : `Add by ${label}`}>
      <MaterialCommunityIcons name={icon} size={30} color={color.accent} />
      <Text style={s.tileText}>{label}</Text>
      {soon && <Text style={s.soon}>soon</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  hello: { fontSize: size.title, fontWeight: '800', color: color.text, lineHeight: 34 },
  tagline: { fontSize: size.body, color: color.softText, marginTop: 4 },
  h2: { fontSize: 20, fontWeight: '700', color: color.text },
  addRow: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, minHeight: 92, backgroundColor: color.card, borderRadius: size.radius, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tileText: { fontSize: 16, fontWeight: '700', color: color.text },
  soon: { fontSize: 12, color: color.muted },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.card, borderRadius: size.radius, borderWidth: 1, borderColor: color.border, paddingHorizontal: 12, minHeight: 50 },
  searchInput: { flex: 1, fontSize: size.body, color: color.text, paddingVertical: 10 },
  recent: { width: 150, backgroundColor: color.soft, borderRadius: size.radius, padding: 12, gap: 4 },
  recentTitle: { fontSize: 16, fontWeight: '700', color: color.softText },
  card: { backgroundColor: color.card, borderRadius: size.radius, borderWidth: 1, borderColor: color.border, padding: size.pad, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: color.text, flexShrink: 1 },
  meta: { fontSize: 15, color: color.muted },
  empty: { fontSize: size.body, color: color.muted, textAlign: 'center', marginTop: 40, lineHeight: 26 },
});
