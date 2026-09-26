// Cook mode: get ready -> one step per screen -> done. Screen stays awake; timers auto-start and ring via notifications.
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Btn, Chip } from '@/components/ui';
import { fmtClock, remaining, stepIngredients } from '@/lib/cook';
import { prefs } from '@/lib/prefs';
import type { Ingredient, Recipe } from '@/lib/recipeSchema';
import { formatQty, scaleQty } from '@/lib/scale';
import { supabase } from '@/lib/supabase';
import { color, size } from '@/lib/theme';
import { cancel, schedule } from '@/lib/timers';

type Timer = { endAt: number; notifId: string | null };

// Opened from a link/notification there's no screen to go back to -> go home instead of doing nothing.
const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function Cook() {
  // suppressDeactivateWarnings: leaving fast (web) or a dead Activity (Android) otherwise throws an unhandled rejection.
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });
  const { id, servings: servingsParam } = useLocalSearchParams<{ id: string; servings?: string }>();
  const [recipe, setRecipe] = useState<(Recipe & { notes: string | null }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0); // 0 = get ready, 1..n = steps, n+1 = done
  const [prepDone, setPrepDone] = useState<Set<number>>(new Set());
  const [timers, setTimers] = useState<Record<number, Timer>>({});
  const [now, setNow] = useState(() => Date.now());
  const [readAloud, setReadAloud] = useState(prefs.readAloud());
  const [notes, setNotes] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const started = useRef(new Set<number>()); // steps whose timer already auto-started (don't restart on Back)
  // Source of truth for scheduled alarms (state updates are async): step -> { endAt, notifId }.
  const alarms = useRef(new Map<number, Timer>());

  // Leaving cook mode cancels every alarm; no ghost alarms that can't be stopped.
  useEffect(() => {
    const map = alarms.current;
    return () => map.forEach((t) => cancel(t.notifId));
  }, []);

  useEffect(() => {
    supabase
      .from('recipes')
      .select('title, category, is_veg, base_servings, language, ingredients, prep, steps, notes')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        setRecipe(data as Recipe & { notes: string | null });
        setNotes(data.notes ?? '');
      });
  }, [id]);

  const n = recipe?.steps.length ?? 0;
  const stepIdx = page >= 1 && page <= n ? page - 1 : null;
  const asked = Math.round(Number(servingsParam));
  const servings = asked >= 1 && asked <= 100 ? asked : recipe?.base_servings || 2; // URL param is user-editable on web
  const factor = recipe ? servings / recipe.base_servings : 1;

  const startTimer = useCallback(
    async (idx: number, sec: number) => {
      const endAt = Date.now() + sec * 1000;
      cancel(alarms.current.get(idx)?.notifId ?? null);
      alarms.current.set(idx, { endAt, notifId: null });
      setTimers((t) => ({ ...t, [idx]: { endAt, notifId: null } }));
      const notifId = await schedule(`Step ${idx + 1} is done ⏰`, recipe?.steps[idx].text ?? '', sec);
      // Stopped, +1 min'd or unmounted while scheduling -> this alarm is stale.
      if (alarms.current.get(idx)?.endAt !== endAt) return cancel(notifId);
      alarms.current.set(idx, { endAt, notifId });
    },
    [recipe],
  );

  function stopTimer(idx: number) {
    cancel(alarms.current.get(idx)?.notifId ?? null);
    alarms.current.delete(idx);
    setTimers(({ [idx]: _, ...rest }) => rest);
  }

  function addMinute(idx: number) {
    const t = alarms.current.get(idx);
    if (t) startTimer(idx, remaining(t.endAt, Date.now()) + 60);
  }

  // Auto-start the step's timer the first time you reach it.
  useEffect(() => {
    if (stepIdx == null || !recipe) return;
    const sec = recipe.steps[stepIdx].duration_sec;
    if (sec && !started.current.has(stepIdx)) {
      started.current.add(stepIdx);
      startTimer(stepIdx, sec);
    }
  }, [stepIdx, recipe, startTimer]);

  // Tick once a second while any timer is still counting down (stops once all have rung).
  const running = Object.values(timers).some((t) => t.endAt > now);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Read the step aloud on each new step (when turned on).
  useEffect(() => {
    Speech.stop();
    if (readAloud && stepIdx != null && recipe) Speech.speak(recipe.steps[stepIdx].text, { language: recipe.language });
    return () => {
      Speech.stop();
    };
  }, [readAloud, stepIdx, recipe]);

  function toggleReadAloud() {
    prefs.setReadAloud(!readAloud);
    setReadAloud(!readAloud);
  }

  async function finish() {
    setSaveError(null);
    const { error } = await supabase.from('recipes').update({ notes: notes.trim() || null, last_cooked_at: new Date().toISOString() }).eq('id', id);
    if (error) return setSaveError('Could not save your note. Check your internet and tap Finish again.'); // don't lose the note
    leave();
  }

  // No header in cook mode, so loading/error states need their own way out.
  if (error || !recipe)
    return (
      <SafeAreaView style={[s.screen, { padding: size.pad, gap: 16 }]}>
        {error ? <Text style={{ color: color.danger, fontSize: 18 }}>{error}</Text> : <ActivityIndicator size="large" color={color.accent} style={{ marginTop: 80 }} />}
        <Btn label="Go back" onPress={leave} secondary />
      </SafeAreaView>
    );

  const amount = (i: Ingredient) => {
    const q = formatQty(scaleQty(i.qty, i.scale, factor, i.unit));
    if (!q) return i.scale === 'to_taste' ? 'to taste' : '';
    return `${q} ${i.unit}`.trim() + (i.scale === 'to_taste' && factor !== 1 ? ' (to taste)' : '');
  };
  const step = stepIdx != null ? recipe.steps[stepIdx] : null;
  const otherTimers = Object.entries(timers).filter(([k]) => Number(k) !== stepIdx);

  return (
    <SafeAreaView style={s.screen}>
      {/* Top bar: exit, progress, read aloud */}
      <View style={s.top}>
        <Pressable onPress={leave} hitSlop={12} accessibilityLabel="Exit cook mode" style={s.iconBtn}>
          <MaterialCommunityIcons name="close" size={30} color={color.text} />
        </Pressable>
        <Text style={s.progressText}>{page === 0 ? 'Get ready' : page > n ? 'Done!' : `Step ${page} of ${n}`}</Text>
        <Pressable onPress={toggleReadAloud} hitSlop={12} accessibilityLabel={readAloud ? 'Stop reading aloud' : 'Read steps aloud'} style={s.iconBtn}>
          <MaterialCommunityIcons name={readAloud ? 'volume-high' : 'volume-off'} size={30} color={readAloud ? color.accent : color.muted} />
        </Pressable>
      </View>
      <View style={s.bar}>
        <View style={[s.barFill, { width: `${(page / (n + 1)) * 100}%` }]} />
      </View>

      {/* Timers running on other steps stay visible */}
      {otherTimers.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.timerRow}>
          {otherTimers.map(([k, t]) => {
            const left = remaining(t.endAt, now);
            return (
              <Pressable key={k} onPress={() => setPage(Number(k) + 1)} style={[s.timerChip, left === 0 && s.timerChipDone]}>
                <MaterialCommunityIcons name="timer-outline" size={18} color={left === 0 ? color.accentText : color.softText} />
                <Text style={[s.timerChipText, left === 0 && { color: color.accentText }]}>
                  Step {Number(k) + 1} · {left === 0 ? 'Done ✓' : fmtClock(left)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {page === 0 && (
          <>
            <Text style={s.title}>{recipe.title}</Text>
            <Chip label={`${servings} ${servings === 1 ? 'person' : 'people'}`} />
            {!!recipe.notes && (
              <View style={s.notesBox}>
                <Text style={s.notesLabel}>Your note from last time</Text>
                <Text style={s.item}>{recipe.notes}</Text>
              </View>
            )}
            <Text style={s.h2}>Keep these ready</Text>
            {recipe.ingredients.map((i, k) => (
              <Text key={k} style={s.item}>
                <Text style={s.qty}>{amount(i)} </Text>
                {i.name}
              </Text>
            ))}
            {recipe.prep.length > 0 && (
              <>
                <Text style={s.h2}>Before you start</Text>
                {recipe.prep.map((p, k) => {
                  const done = prepDone.has(k);
                  return (
                    <Pressable
                      key={k}
                      style={s.check}
                      onPress={() => setPrepDone((d) => (d.has(k) ? new Set([...d].filter((x) => x !== k)) : new Set(d).add(k)))}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: done }}>
                      <MaterialCommunityIcons name={done ? 'checkbox-marked' : 'checkbox-blank-outline'} size={30} color={color.accent} />
                      <Text style={[s.item, { flex: 1 }, done && s.doneText]}>{p.text}</Text>
                    </Pressable>
                  );
                })}
              </>
            )}
          </>
        )}

        {step && stepIdx != null && (
          <>
            <Text style={s.stepText}>{step.text}</Text>
            <View style={s.chips}>
              {step.heat && <Chip label={`🔥 ${step.heat} heat`} />}
              {stepIngredients(step, recipe.ingredients).map((i, k) => (
                <Chip key={k} label={`${amount(i)} ${i.name}`.trim()} />
              ))}
            </View>
            {timers[stepIdx] ? (
              <TimerCard left={remaining(timers[stepIdx].endAt, now)} onAdd={() => addMinute(stepIdx)} onStop={() => stopTimer(stepIdx)} />
            ) : (
              step.duration_sec && <Btn label={`Start ${fmtClock(step.duration_sec)} timer`} onPress={() => startTimer(stepIdx, step.duration_sec!)} secondary />
            )}
          </>
        )}

        {page > n && (
          <>
            <Text style={s.title}>Well done! 🎉</Text>
            <Text style={s.item}>Anything to change next time? (less salt, more time…)</Text>
            <TextInput
              style={s.notesInput}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Add a little less chilli"
              placeholderTextColor={color.muted}
              textAlignVertical="top"
              maxLength={5000}
            />
            {saveError && <Text style={{ color: color.danger, fontSize: 16 }}>{saveError}</Text>}
          </>
        )}
      </ScrollView>

      {/* Big buttons for messy hands */}
      <View style={s.nav}>
        {page > 0 && (
          <View style={{ flex: 1 }}>
            <Btn label="Back" onPress={() => setPage((p) => p - 1)} secondary />
          </View>
        )}
        <View style={{ flex: 2 }}>
          {page > n ? <Btn label="Finish" onPress={finish} /> : <Btn label={page === 0 ? "Let's cook" : page === n ? 'Done' : 'Next'} onPress={() => setPage((p) => p + 1)} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

function TimerCard({ left, onAdd, onStop }: { left: number; onAdd: () => void; onStop: () => void }) {
  const done = left === 0;
  return (
    <View style={[s.timerCard, done && s.timerCardDone]}>
      <Text style={[s.clock, done && { color: color.accentText }]}>{done ? 'Time! ⏰' : fmtClock(left)}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Btn label="+1 min" onPress={onAdd} secondary={!done} />
        </View>
        <View style={{ flex: 1 }}>
          <Btn label={done ? 'OK' : 'Stop'} onPress={onStop} secondary={!done} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  iconBtn: { width: size.tap, height: size.tap, alignItems: 'center', justifyContent: 'center' },
  progressText: { fontSize: 20, fontWeight: '700', color: color.text },
  bar: { height: 6, backgroundColor: color.border, marginHorizontal: size.pad, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: color.accent },
  timerRow: { gap: 8, paddingHorizontal: size.pad, paddingTop: 10 },
  timerChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: color.soft, borderRadius: 20, paddingHorizontal: 14, minHeight: 40 },
  timerChipDone: { backgroundColor: color.accent },
  timerChipText: { fontSize: 16, fontWeight: '700', color: color.softText },
  body: { padding: size.pad, gap: 14, paddingBottom: 32 },
  title: { fontSize: 30, fontWeight: '800', color: color.text },
  h2: { fontSize: 22, fontWeight: '700', color: color.text, marginTop: 8 },
  item: { fontSize: 20, color: color.text, lineHeight: 28 },
  qty: { fontWeight: '700', color: color.accent },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  doneText: { color: color.muted, textDecorationLine: 'line-through' },
  stepText: { fontSize: 30, lineHeight: 42, fontWeight: '600', color: color.text, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timerCard: { backgroundColor: color.soft, borderRadius: size.radius, padding: size.pad, gap: 12, alignItems: 'stretch' },
  timerCardDone: { backgroundColor: color.accent },
  clock: { fontSize: 64, fontWeight: '800', color: color.softText, textAlign: 'center', fontVariant: ['tabular-nums'] },
  notesBox: { backgroundColor: color.soft, borderRadius: size.radius, padding: size.pad, gap: 4 },
  notesLabel: { fontSize: 15, fontWeight: '700', color: color.softText },
  notesInput: { minHeight: 140, backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: size.radius, padding: size.pad, fontSize: 20, color: color.text },
  nav: { flexDirection: 'row', gap: 10, padding: size.pad, borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.bg },
});
