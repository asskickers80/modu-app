// 모두 전역 공통 업종 분류 — docs/INDUSTRY-CATEGORY-MAP.md 기준 (단일 소스)
// 온보딩·매물 등록·검색 필터·시세 데이터 조인에 동일하게 사용한다.
//
// 저장 구조: category_main + category_sub + ksic_code 3필드.
// - 대분류만 선택하고 넘어가기 허용 (category_sub = null)
// - 직접입력 시 category_sub = 입력값, ksic_code = null
//
// KSIC: 한국표준산업분류 10차 세세분류 대표코드.
// 통계분류포털(kssc.kostat.go.kr) 10차 기준 대조 완료(2026-07-16) — 확정치 못한 항목은 null.

export interface SubCategory {
  label: string
  ksic: string | null
  synonyms: string[]
}

export interface MainCategory {
  label: string
  subs: SubCategory[]
}

export interface IndustrySelection {
  category_main: string
  category_sub: string | null
  ksic_code: string | null
}

export const INDUSTRY_CATEGORIES: MainCategory[] = [
  {
    label: '요식업',
    subs: [
      { label: '한식',               ksic: '56111', synonyms: ['한식당', '백반', '국밥', '찌개', '한정식'] },
      { label: '고깃집',             ksic: '56113', synonyms: ['삼겹살', '갈비', '구이', '정육식당', '소고기', '돼지고기'] },
      { label: '횟집·해물',          ksic: '56114', synonyms: ['횟집', '회', '해산물', '조개구이', '수산물'] },
      { label: '중식',               ksic: '56121', synonyms: ['중국집', '중화요리', '짜장면', '짬뽕'] },
      { label: '일식',               ksic: '56122', synonyms: ['초밥', '스시', '일식당', '라멘', '돈부리'] },
      { label: '양식·레스토랑',      ksic: '56123', synonyms: ['레스토랑', '파스타', '스테이크', '이탈리안', '브런치'] },
      { label: '분식',               ksic: '56194', synonyms: ['떡볶이', '튀김', '순대', '라면'] },
      { label: '김밥·돈까스·우동',   ksic: '56194', synonyms: ['김밥', '돈까스', '우동', '국수', '만두'] },
      { label: '치킨',               ksic: '56193', synonyms: ['통닭', '치킨집', '닭강정', '후라이드'] },
      { label: '피자·버거·샌드위치', ksic: '56192', synonyms: ['피자', '햄버거', '버거', '샌드위치', '토스트'] },
      { label: '뷔페',               ksic: null,    synonyms: ['부페', '샐러드바', '고기뷔페'] },
      { label: '배달·포장 전문',     ksic: '56199', synonyms: ['배달전문', '포장전문', '공유주방', '딜리버리'] },
      { label: '기타 음식점',        ksic: null,    synonyms: ['음식점', '식당'] },
    ],
  },
  {
    label: '카페·베이커리',
    subs: [
      { label: '카페·커피전문점',      ksic: '56221', synonyms: ['카페', '커피숍', '커피전문점', '커피점', '로스터리'] },
      { label: '제과·베이커리',        ksic: '56191', synonyms: ['빵집', '베이커리', '제과점', '케이크'] },
      { label: '아이스크림·빙수',      ksic: '56229', synonyms: ['아이스크림', '빙수', '젤라또', '요거트'] },
      { label: '도넛·디저트',          ksic: '56191', synonyms: ['도넛', '도너츠', '디저트', '마카롱', '와플'] },
      { label: '주스·음료 테이크아웃', ksic: '56229', synonyms: ['주스', '스무디', '버블티', '밀크티', '테이크아웃'] },
      { label: '기타 카페·간식',       ksic: '56229', synonyms: ['간식', '디저트카페'] },
    ],
  },
  {
    label: '주점',
    subs: [
      { label: '호프·맥주',        ksic: '56213', synonyms: ['호프', '호프집', '맥주집', '생맥주', '펍'] },
      { label: '이자카야',         ksic: '56219', synonyms: ['일본식주점', '사케'] },
      { label: '바(Bar)·와인바',   ksic: '56219', synonyms: ['바', '와인바', '칵테일바', '루프탑바'] },
      { label: '실내포차',         ksic: '56219', synonyms: ['포차', '포장마차'] },
      { label: '노래주점',         ksic: '56211', synonyms: ['단란주점', '가라오케'] },
      { label: '막걸리·전통주점',  ksic: '56219', synonyms: ['막걸리', '전통주', '민속주점', '전집'] },
      { label: '기타 주점',        ksic: '56219', synonyms: ['주점', '술집'] },
    ],
  },
  {
    label: '도소매·판매',
    subs: [
      { label: '편의점',           ksic: '47122', synonyms: ['CU', 'GS25', '세븐일레븐', '이마트24'] },
      { label: '슈퍼마켓·마트',    ksic: '47121', synonyms: ['마트', '슈퍼', '식자재마트', '할인마트'] },
      { label: '의류·패션',        ksic: null,    synonyms: ['옷가게', '의류매장', '보세', '패션잡화', '신발'] },
      { label: '화장품',           ksic: '47813', synonyms: ['코스메틱', '화장품점'] },
      { label: '휴대폰·통신기기',  ksic: '47312', synonyms: ['휴대폰', '핸드폰', '폰가게', '통신사대리점'] },
      { label: '문구·팬시',        ksic: '47612', synonyms: ['문방구', '문구점', '팬시'] },
      { label: '정육점',           ksic: '47212', synonyms: ['정육', '축산물', '고기판매'] },
      { label: '청과·식자재',      ksic: '47211', synonyms: ['청과물', '과일가게', '야채가게', '식자재'] },
      { label: '꽃집',             ksic: '47851', synonyms: ['화원', '플라워샵', '꽃가게'] },
      { label: '안경점',           ksic: null,    synonyms: ['안경', '안경원', '렌즈', '콘택트렌즈', '선글라스'] },
      { label: '무인점포',         ksic: '47129', synonyms: ['무인', '무인아이스크림', '무인문방구', '셀프매장'] },
      { label: '기타 판매점',      ksic: null,    synonyms: ['판매점', '소매점', '잡화점'] },
    ],
  },
  {
    label: '미용·뷰티',
    subs: [
      { label: '미용실',             ksic: '96112', synonyms: ['헤어샵', '헤어살롱', '미장원', '헤어'] },
      { label: '이발소',             ksic: '96111', synonyms: ['바버샵', '이용원'] },
      { label: '네일아트',           ksic: '96119', synonyms: ['네일샵', '네일'] },
      { label: '피부관리·에스테틱',  ksic: '96113', synonyms: ['피부관리실', '에스테틱', '피부샵'] },
      { label: '마사지·스파',        ksic: '96122', synonyms: ['마사지샵', '스파', '타이마사지', '발마사지'] },
      { label: '속눈썹·왁싱',        ksic: '96119', synonyms: ['속눈썹연장', '왁싱샵', '반영구'] },
      { label: '기타 미용',          ksic: '96119', synonyms: ['뷰티샵', '미용'] },
    ],
  },
  {
    label: '오락·레저',
    subs: [
      { label: '노래방',          ksic: '91223', synonyms: ['코인노래방', '노래연습장'] },
      { label: 'PC방',            ksic: '91222', synonyms: ['피시방', '피씨방', '게임방'] },
      { label: '스크린골프',      ksic: '91136', synonyms: ['스크린골프장', '골프시뮬레이터'] },
      { label: '골프연습장',      ksic: '91136', synonyms: ['골프연습', '인도어골프'] },
      { label: '당구장',          ksic: '91135', synonyms: ['당구', '포켓볼', '빌리어드'] },
      { label: '볼링장',          ksic: '91134', synonyms: ['볼링'] },
      { label: '헬스장',          ksic: '91132', synonyms: ['헬스클럽', '피트니스', '짐', '체육관'] },
      { label: '요가·필라테스',   ksic: null,    synonyms: ['요가원', '필라테스', '요가스튜디오'] },
      { label: '만화방·멀티방',   ksic: '91229', synonyms: ['만화카페', '멀티방'] },
      { label: '키즈카페',        ksic: '91229', synonyms: ['키카', '놀이카페', '실내놀이터'] },
      { label: '게임장',          ksic: '91221', synonyms: ['오락실', '아케이드', '인형뽑기'] },
      { label: '기타 오락·레저',  ksic: '91299', synonyms: ['오락', '레저'] },
    ],
  },
  {
    label: '교육·서비스',
    subs: [
      { label: '학원·교습소',        ksic: '85501', synonyms: ['학원', '교습소', '공부방', '보습학원', '입시학원'] },
      { label: '독서실·스터디카페',  ksic: '90212', synonyms: ['독서실', '스터디카페', '스카'] },
      { label: '세탁소·빨래방',      ksic: '96911', synonyms: ['세탁소', '빨래방', '코인세탁', '런드리'] },
      { label: '카센터·세차장',      ksic: '95212', synonyms: ['카센터', '세차장', '정비소', '자동차정비', '손세차'] },
      { label: '부동산중개',         ksic: '68221', synonyms: ['부동산', '공인중개사', '중개사무소'] },
      { label: '사진관',             ksic: '73301', synonyms: ['사진스튜디오', '셀프사진관', '증명사진', '포토부스'] },
      { label: '동물병원·펫샵',      ksic: '73100', synonyms: ['동물병원', '펫샵', '애견샵', '반려동물', '애견미용'] },
      { label: '약국',               ksic: null,    synonyms: ['약국', '약사', '조제', '한약국'] },
      { label: '병원·약국 임대',     ksic: null,    synonyms: ['병원', '의원', '메디컬'] },
      { label: '기타 서비스',        ksic: '96999', synonyms: ['서비스'] },
    ],
  },
  {
    label: '숙박·사무·기타',
    subs: [
      { label: '모텔·호텔',          ksic: '55101', synonyms: ['모텔', '호텔', '숙박업소'] },
      { label: '펜션·게스트하우스',  ksic: null,    synonyms: ['펜션', '게스트하우스', '민박', '풀빌라'] },
      { label: '사무실',             ksic: null,    synonyms: ['오피스', '사무공간', '공유오피스'] },
      { label: '공장·창고',          ksic: null,    synonyms: ['공장', '창고', '물류창고'] },
      { label: '상가 매매',          ksic: null,    synonyms: ['상가', '건물매매'] },
      { label: '다용도 점포',        ksic: null,    synonyms: ['다용도', '공실', '빈점포'] },
      { label: '기타 (직접입력)',    ksic: null,    synonyms: [] },
    ],
  },
]

// 직접입력 폴백이 소속되는 대분류
export const FALLBACK_MAIN = '숙박·사무·기타'

/**
 * 화면 표시용 업종 라벨 — "대분류 > 소분류", 소분류가 없으면 대분류만.
 * 신규 3필드가 비어 있는 옛 매물은 호출부에서 biz_type으로 폴백한다.
 */
export function industryLabel(
  row?: { category_main?: string | null; category_sub?: string | null } | null,
): string | null {
  const main = row?.category_main ?? null
  const sub = row?.category_sub ?? null
  if (!main) return sub || null
  return sub ? `${main} > ${sub}` : main
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '')

export interface SearchResult {
  main: string
  sub: string
  ksic: string | null
}

/**
 * 업종 직접 검색 — 전체 소분류 + 동의어 대상.
 * 결과 선택 시 대분류·소분류·KSIC가 자동 세팅되도록 3값을 함께 반환한다.
 */
export function searchIndustry(query: string): SearchResult[] {
  const q = normalize(query)
  if (!q) return []
  const results: SearchResult[] = []
  for (const main of INDUSTRY_CATEGORIES) {
    for (const sub of main.subs) {
      const targets = [sub.label, ...sub.synonyms].map(normalize)
      // 검색어가 항목에 포함되거나(카페 → 카페·커피전문점),
      // 항목이 검색어에 포함되면(통닭집 → 통닭) 매치
      if (targets.some((t) => t.includes(q) || q.includes(t))) {
        results.push({ main: main.label, sub: sub.label, ksic: sub.ksic })
      }
    }
  }
  return results
}
