/**
 * /business/* 하위 페이지 정리 검증
 *
 * 1. 성과 페이지: 더미 수치(주간 1240·차트·퍼널·키워드) 부재 + 준비중, CTA(/e1b/1) 유지
 * 2. Push 페이지: 가짜 인원수·잔여 발신 부재, 3단계 폼 실동작 + 가짜 "발신 완료" 없이 준비중 토스트
 */
import { test, expect } from '@playwright/test'

test('성과 페이지: 더미 수치 부재 + 준비중 + CTA 유지', async ({ page }) => {
  await page.goto('/business/performance')
  await expect(page.getByText('내 노출 성과')).toBeVisible()

  // 옛 더미 부재
  await expect(page.getByText('1,240')).toHaveCount(0)
  await expect(page.getByText('최고 금요일 280회')).toHaveCount(0)
  await expect(page.getByText('홍대 인테리어')).toHaveCount(0)
  await expect(page.getByText('업종 평균 전환율 3.2% · 내 전환율 1.1%')).toHaveCount(0)

  // 준비중: 일별조회·퍼널·AI해석·키워드 4곳 + 헤더 요약 2칸
  await expect(page.getByText('서비스 준비중')).toHaveCount(4)
  await expect(page.getByText('준비중', { exact: true })).toHaveCount(2)

  // 실기능 유지
  await expect(page.getByRole('button', { name: /페이지 다듬어 전환율 올리기/ })).toBeVisible()
})

test('Push 페이지: 가짜 인원수 부재 + 발신은 준비중 토스트 (가짜 완료 화면 없음)', async ({ page }) => {
  await page.goto('/business/push')
  await expect(page.getByText('Push 발신')).toBeVisible()

  // 옛 가짜 수치 부재
  await expect(page.getByText('127')).toHaveCount(0)
  await expect(page.getByText('47회')).toHaveCount(0)
  await expect(page.getByText(/명에게 발신하기/)).toHaveCount(0)

  // 폼 실동작: 미확인 발신 → 검증 토스트
  await page.getByRole('button', { name: '🚀 발신하기' }).click()
  await expect(page.getByText('발신 전 확인을 체크해주세요')).toBeVisible()

  // 템플릿 적용 + 확인 체크 후 발신 → 가짜 성공 대신 준비중 토스트
  await page.getByText('첫 인사 & 소개').click()
  await page.getByText('이중 게이트를 통과한 수요자에게만 발신되며').click()
  await page.getByRole('button', { name: '🚀 발신하기' }).click()
  await expect(page.getByText('발신 기능 준비 중이에요 🚧')).toBeVisible()
  await expect(page.getByText('발신 완료!')).toHaveCount(0)
})
