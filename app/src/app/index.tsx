import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { color, size } from '@/lib/theme';

type Row = { id: string; title: string; base_servings: number };

export default function RecipeList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('recipes')
        .select('id, title, base_servings')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          setError(error?.message ?? null);
          setRows(data ?? []);
        });
    }, []),
  );

  return (
    <View style={{ flex: 1, padding: size.pad, gap: 12 }}>
      <Link href="/add" asChild>
        <Pressable style={s.addBtn}>
          <Text style={s.addText}>+ Add a recipe</Text>
        </Pressable>
      </Link>
      {error && <Text style={{ color: color.danger }}>{error}</Text>}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ gap: 10 }}
        ListEmptyComponent={<Text style={s.empty}>{"No recipes yet. Paste what Mom told you and we'll turn it into steps."}</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => router.push(`/recipe/${item.id}`)}>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.muted}>for {item.base_servings}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  addBtn: { minHeight: size.tap, borderRadius: size.radius, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  addText: { color: color.accentText, fontSize: 20, fontWeight: '700' },
  card: { backgroundColor: color.card, borderRadius: size.radius, borderWidth: 1, borderColor: color.border, padding: size.pad, minHeight: size.tap },
  title: { fontSize: 20, fontWeight: '700', color: color.text },
  muted: { fontSize: 15, color: color.muted, marginTop: 2 },
  empty: { fontSize: size.body, color: color.muted, textAlign: 'center', marginTop: 40, lineHeight: 26 },
});
