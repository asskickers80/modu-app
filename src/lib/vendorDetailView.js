import { VENDOR_CATEGORIES } from '../../config/salesCardCategories'

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const text = value => typeof value === 'string' ? value.trim() : ''
const visible = (row, key) => row?.item_visibility?.[key] !== false && row?.review_choices?.[key] !== 'hide'

/** 저장된 업체 사실만 표시한다. 소재지와 서비스 가능 지역은 서로 대신하지 않는다. */
export function vendorDetailView(row) {
  const settings = object(row?.biz_settings)
  const edited = object(row?.edited_texts)
  const draft = object(row?.ai_draft)
  const areaValue = row?.biz_service_areas ?? settings.serviceAreas ?? row?.business_region
  const areas = Array.isArray(areaValue) ? areaValue : typeof areaValue === 'string' ? areaValue.split(/[,|]/) : areaValue ? [areaValue] : []
  return {
    category: visible(row, 'biz_category') ? VENDOR_CATEGORIES.find(c => c.key === row?.biz_category)?.label ?? '' : '',
    services: visible(row, 'biz_services') && Array.isArray(row?.biz_services) ? [...new Set(row.biz_services.map(text).filter(Boolean))] : [],
    address: visible(row, 'address') ? text(row?.address) : '',
    serviceAreas: visible(row, 'biz_service_areas') ? [...new Set(areas.map(area => typeof area === 'string' ? text(area) : [area?.province, area?.district, area?.neighborhood].map(text).filter(Boolean).join(' ')).filter(Boolean))] : [],
    nationwide: visible(row, 'biz_nationwide') && (row?.biz_nationwide ?? settings.nationwide) === true,
    remote: visible(row, 'biz_remote') && (row?.biz_remote ?? settings.remote) === true,
    description: visible(row, 'description') ? [edited.description, draft.description, draft.fact].find(value => typeof value === 'string') ?? '' : '',
  }
}
