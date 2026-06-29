const STORAGE_KEY = 'modu_review_logs'

/**
 * 검수 로그 1건 저장 (localStorage에 누적)
 * 나중에 서버 연동 시 이 함수만 POST 로직으로 교체하면 됨
 */
export function saveReviewLog({ listing, blocks, choices, editedTexts }) {
  const items = blocks.map(block => ({
    blockId: block.id,
    blockTitle: block.title,
    tone: block.tone,
    aiOriginal: block.body,
    userChoice: choices[block.id] ?? 'keep',
    // 수정한 경우에만 수정 후 텍스트 저장
    userText: choices[block.id] === 'edit' ? (editedTexts[block.id] ?? null) : null,
  }))

  const entry = {
    id: `rl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    listing: {
      shopName: listing.shopName || '',
      address: listing.address || '',
      floor: listing.floor || '',
      area: listing.area || '',
      transferType: listing.transferType || '',
      transferFee: listing.transferFee || '',
      monthlyRent: listing.monthlyRent || '',
      monthlySales: listing.monthlySales || null,
    },
    items,
    // 요약 통계 (나중에 대시보드에서 빠르게 집계 가능하게)
    summary: {
      total: items.length,
      kept: items.filter(i => i.userChoice === 'keep').length,
      edited: items.filter(i => i.userChoice === 'edit').length,
      hidden: items.filter(i => i.userChoice === 'hide').length,
    },
  }

  const logs = getReviewLogs()
  logs.push(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  return entry
}

export function getReviewLogs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function clearReviewLogs() {
  localStorage.removeItem(STORAGE_KEY)
}
