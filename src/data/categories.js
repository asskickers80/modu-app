// 모두 — A2 카테고리 정의 (인수인계 v16 3-2 / 5절 기준)
// 6개 B2C/B2B 카테고리. 중복 선택 가능. id는 A3 분기·테마의 단일 출처.
import { categoryColors } from '../theme/colors';

export const CATEGORIES = [
  {
    id: 'operating',
    emoji: '🍳',
    label: '지금 장사하고 있어요',
    sub: '운영 중',
    color: categoryColors.operating,
  },
  {
    id: 'seller',
    emoji: '✌️',
    label: '이제 그만할 때가 됐나봐요',
    sub: '양도자',
    color: categoryColors.seller,
  },
  {
    id: 'landlord',
    emoji: '🏢',
    label: '상가가 있는데 함께 할 사람을 찾아요',
    sub: '임대인',
    color: categoryColors.landlord,
  },
  {
    id: 'startup',
    emoji: '🚀',
    label: '창업을 준비하고 있어요',
    sub: '창업 준비',
    color: categoryColors.startup,
  },
  {
    id: 'business',
    emoji: '💼',
    label: '기업회원으로 활동할래요!',
    sub: '기업회원',
    color: categoryColors.business,
  },
  {
    id: 'browsing',
    emoji: '👀',
    label: '그냥 구경 왔어요',
    sub: '구경',
    color: categoryColors.browsing,
  },
];
