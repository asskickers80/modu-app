/**
 * 주소 문자열 → 공공데이터 API용 지역코드(LAWD_CD) 변환
 *
 * LAWD_CD: 법정동코드 앞 5자리 (시군구 단위)
 * 실거래가 API(RTMSDataSvcSBInfo) 필수 파라미터
 */

const SEOUL = {
  종로구: '11110', 중구: '11140', 용산구: '11170', 성동구: '11200',
  광진구: '11215', 동대문구: '11230', 중랑구: '11260', 성북구: '11290',
  강북구: '11305', 도봉구: '11320', 노원구: '11350', 은평구: '11380',
  서대문구: '11410', 마포구: '11440', 양천구: '11470', 강서구: '11500',
  구로구: '11530', 금천구: '11545', 영등포구: '11560', 동작구: '11590',
  관악구: '11620', 서초구: '11650', 강남구: '11680', 송파구: '11710',
  강동구: '11740',
}

const BUSAN = {
  중구: '26110', 서구: '26140', 동구: '26170', 영도구: '26200',
  부산진구: '26230', 동래구: '26260', 남구: '26290', 북구: '26320',
  해운대구: '26350', 사하구: '26380', 금정구: '26410', 강서구: '26440',
  연제구: '26470', 수영구: '26500', 사상구: '26530',
}

const INCHEON = {
  중구: '28110', 동구: '28140', 미추홀구: '28177', 연수구: '28185',
  남동구: '28200', 부평구: '28237', 계양구: '28245', 서구: '28260',
}

const DAEGU = {
  중구: '27110', 동구: '27140', 서구: '27170', 남구: '27200',
  북구: '27230', 수성구: '27260', 달서구: '27290',
}

const GWANGJU = {
  동구: '29110', 서구: '29140', 남구: '29155', 북구: '29170', 광산구: '29200',
}

const DAEJEON = {
  동구: '30110', 중구: '30140', 서구: '30170', 유성구: '30200', 대덕구: '30230',
}

const ULSAN = {
  중구: '31110', 남구: '31140', 동구: '31170', 북구: '31200',
}

const GYEONGGI = {
  수원시: '41110', 성남시: '41130', 고양시: '41280', 용인시: '41460',
  부천시: '41190', 안산시: '41270', 안양시: '41170', 남양주시: '41360',
  화성시: '41590', 평택시: '41220', 의정부시: '41150', 시흥시: '41390',
  파주시: '41480', 광명시: '41210', 김포시: '41570',
}

const CITY_MAP = {
  서울: SEOUL, 서울특별시: SEOUL,
  부산: BUSAN, 부산광역시: BUSAN,
  인천: INCHEON, 인천광역시: INCHEON,
  대구: DAEGU, 대구광역시: DAEGU,
  광주: GWANGJU, 광주광역시: GWANGJU,
  대전: DAEJEON, 대전광역시: DAEJEON,
  울산: ULSAN, 울산광역시: ULSAN,
  경기: GYEONGGI, 경기도: GYEONGGI,
}

/**
 * "서울 마포구 서교동 332-4" → "11440"
 * 매칭 실패 시 null 반환
 */
export function addressToLawdCd(address) {
  if (!address) return null
  const parts = address.trim().split(/\s+/)

  for (let i = 0; i < parts.length - 1; i++) {
    const city = CITY_MAP[parts[i]]
    if (city) {
      const gu = parts[i + 1]
      return city[gu] ?? null
    }
  }
  return null
}

/**
 * YYYYMM 형태로 최근 N개월 목록 반환 (내림차순)
 */
export function recentMonths(n = 4) {
  const months = []
  const now = new Date()
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    months.push(`${y}${m}`)
  }
  return months
}
