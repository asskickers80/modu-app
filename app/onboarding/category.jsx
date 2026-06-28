// A2 — 카테고리 선택 (인수인계 v16 5절)
// 6개 칩, 중복 선택 가능. 카테고리별 고유 컬러. 타이핑 0, 탭만.
// 다음 → A3 카테고리별 핵심 질문 (다음 작업으로 구현 예정).
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORIES } from '../../src/data/categories';
import { palette, radius, spacing } from '../../src/theme/colors';

export default function CategorySelect() {
  const router = useRouter();
  const [selected, setSelected] = useState([]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onNext = () => {
    if (selected.length === 0) return;
    // A3 미구현 — 선택값 확인용. 다음 작업에서 카테고리별 질문 화면으로 연결.
    const labels = CATEGORIES.filter((c) => selected.includes(c.id))
      .map((c) => c.sub)
      .join(', ');
    Alert.alert('선택 완료', `${labels}\n\n다음: A3 카테고리별 핵심 질문 (구현 예정)`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>어떤 분으로{'\n'}모두를 시작하시나요?</Text>
        <Text style={styles.subtitle}>여러 개 골라도 괜찮아요</Text>

        <View style={styles.list}>
          {CATEGORIES.map((c) => {
            const on = selected.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => toggle(c.id)}
                style={[
                  styles.chip,
                  on && { borderColor: c.color, backgroundColor: c.color + '12' },
                ]}
              >
                <Text style={styles.emoji}>{c.emoji}</Text>
                <View style={styles.chipText}>
                  <Text style={[styles.chipLabel, on && { color: c.color }]}>{c.label}</Text>
                  <Text style={styles.chipSub}>{c.sub}</Text>
                </View>
                <View
                  style={[
                    styles.check,
                    on ? { borderColor: c.color, backgroundColor: c.color } : null,
                  ]}
                >
                  {on ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          disabled={selected.length === 0}
          onPress={onNext}
          style={({ pressed }) => [
            styles.cta,
            selected.length === 0 && styles.ctaDisabled,
            pressed && selected.length > 0 && styles.ctaPressed,
          ]}
        >
          <Text style={styles.ctaText}>
            다음{selected.length > 0 ? ` (${selected.length})` : ''}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '800', color: palette.text, lineHeight: 34 },
  subtitle: { marginTop: spacing.sm, fontSize: 15, color: palette.textMuted },
  list: { marginTop: spacing.xl, gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.bg,
  },
  emoji: { fontSize: 26, marginRight: spacing.md },
  chipText: { flex: 1 },
  chipLabel: { fontSize: 16, fontWeight: '600', color: palette.text },
  chipSub: { marginTop: 2, fontSize: 13, color: palette.textMuted },
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: palette.textInverse, fontSize: 14, fontWeight: '800' },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  cta: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: palette.border },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: palette.textInverse, fontSize: 17, fontWeight: '700' },
});
