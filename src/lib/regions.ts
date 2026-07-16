// 지역 선택 상수 — 시/도(대분류) → 구·군·시(소분류) 2단계
// A3 온보딩·탐색 필터 등에서 공용. 소분류는 선택 사항.

export interface RegionCategory {
  label: string
  subs: string[]
}

export const REGION_CATEGORIES: RegionCategory[] = [
  {
    label: '서울',
    subs: [
      '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구',
      '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구',
      '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구',
    ],
  },
  {
    label: '경기',
    subs: [
      '수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시',
      '화성시', '평택시', '의정부시', '시흥시', '파주시', '광명시', '김포시', '군포시',
      '광주시', '이천시', '양주시', '오산시', '구리시', '안성시', '포천시', '의왕시',
      '하남시', '여주시', '동두천시', '과천시', '가평군', '양평군', '연천군',
    ],
  },
  {
    label: '인천',
    subs: ['중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군'],
  },
  {
    label: '부산',
    subs: [
      '중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구',
      '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군',
    ],
  },
  {
    label: '대구',
    subs: ['중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군'],
  },
  {
    label: '광주',
    subs: ['동구', '서구', '남구', '북구', '광산구'],
  },
  {
    label: '대전',
    subs: ['동구', '중구', '서구', '유성구', '대덕구'],
  },
  {
    label: '울산',
    subs: ['중구', '남구', '동구', '북구', '울주군'],
  },
  {
    label: '기타',
    subs: [],
  },
]

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '')

export interface RegionSearchResult {
  main: string
  sub: string
}

/** 지역 직접 검색 — 전체 구·군·시 대상. 선택 시 시/도·구가 자동 세팅되도록 2값 반환. */
export function searchRegion(query: string): RegionSearchResult[] {
  const q = normalize(query)
  if (!q) return []
  const results: RegionSearchResult[] = []
  for (const main of REGION_CATEGORIES) {
    for (const sub of main.subs) {
      const t = normalize(sub)
      if (t.includes(q) || q.includes(t)) {
        results.push({ main: main.label, sub })
      }
    }
  }
  return results
}
