// A1 — 스플래시·진입 (인수인계 v16 5절)
// 상태: ⏸️ 보류(로고 확정 후 애니메이션). 지금은 임시 워드마크 + 시작 버튼.
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radius, spacing } from '../src/theme/colors';

export default function Splash() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.wordmark}>모두</Text>
        <Text style={styles.tagline}>자영업자의 생애를 함께하는 곳</Text>
      </View>

      <View style={styles.bottom}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => router.push('/onboarding/category')}
        >
          <Text style={styles.ctaText}>시작하기</Text>
        </Pressable>
        <Text style={styles.note}>임시 스플래시 · 로고 확정 후 애니메이션 교체</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 64,
    fontWeight: '800',
    color: palette.primary,
    letterSpacing: -1,
  },
  tagline: {
    marginTop: spacing.md,
    fontSize: 15,
    color: palette.textMuted,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  cta: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    color: palette.textInverse,
    fontSize: 17,
    fontWeight: '700',
  },
  note: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: 12,
    color: palette.textMuted,
  },
});
