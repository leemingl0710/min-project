// 조행기 입력값 검사
//
// 등록 API(POST /api/records)와 수정 API(PUT /api/records/[id])가 같이 쓴다.
// 두 API 가 받는 값의 모양이 같아서, 검사 규칙을 한 곳에 모아 두었다.
// (한쪽만 고치고 다른 쪽을 깜빡하는 일이 없게)
//
// 받은 값은 믿지 않는다. 화면을 거치지 않고 API 로 직접 보낸 값일 수도 있어서
// 칸마다 타입을 직접 확인한다. (그래서 타입을 TripInput 이 아니라 unknown 으로 받는다)

import type { TripInput } from '@/types/trip';

// 검사 결과: 통과하면 { value: 저장할 값 }, 실패하면 { error: 화면에 보여줄 문구 }
type ParseResult = { value: TripInput } | { error: string };

export function parseTripInput(input: unknown): ParseResult {
  // 객체가 아니면(null, 숫자, 배열 등) 칸을 꺼낼 수 없으니 바로 돌려보낸다.
  if (!isObject(input)) {
    return { error: '입력값 형식이 잘못됐습니다.' };
  }

  // 제목·날짜·위치는 목록 카드에 나오는 값이라 비어 있으면 저장하지 않는다.
  // (화면에서도 막지만, 서버에서도 한 번 더 확인한다)
  // text(): 글자가 아니면(숫자, 객체 등) 빈 글자로 바꾼다 → 아래에서 "비어 있음"으로 걸린다
  const title = text(input.title).trim();
  const date = text(input.date).trim();
  const place = text(input.place).trim();
  if (!title || !date || !place) {
    return { error: '제목, 날짜, 위치는 꼭 입력해야 합니다.' };
  }

  // 목록은 date 글자 순서로 정렬하므로 꼭 YYYY-MM-DD 모양이어야 한다.
  // ("9/28", "2026-9-8" 처럼 들어오면 정렬 순서가 틀어진다)
  // 정규식: 숫자 4개 - 숫자 2개 - 숫자 2개, 앞뒤에 다른 글자 없음
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: '날짜는 2026-09-28 처럼 YYYY-MM-DD 형식이어야 합니다.' };
  }

  // 시간은 선택 칸이라 비어 있어도 되지만, 적었다면 "05:30 ~ 11:00" 모양이어야 한다.
  // 정규식: (00~23):(00~59) ~ (00~23):(00~59)
  const time = text(input.time).trim();
  if (time && !TIME_PATTERN.test(time)) {
    return { error: '시간은 05:30 ~ 11:00 처럼 HH:MM ~ HH:MM 형식이어야 합니다.' };
  }

  // catches 는 배열이어야 .filter() 를 쓸 수 있다. 없으면 빈 배열(꽝)로 본다.
  if (input.catches !== undefined && !Array.isArray(input.catches)) {
    return { error: '조과 형식이 잘못됐습니다.' };
  }
  const gear = isObject(input.gear) ? input.gear : {};

  // 값을 하나씩 다시 적는 이유: 화면에서 이상한 칸이 더 와도
  // 여기 적은 칸만 저장되게 하려고.
  // 선택 칸도 text() 로 글자만 받는다. 숫자나 객체가 저장되면
  // 상세 화면의 orDash() 에서 .trim() 이 없어서 화면이 죽는다.
  return {
    value: {
      date,
      place,
      title,
      time,
      weather: text(input.weather),
      // 어종 이름이 빈 줄은 빼고, 마릿수는 0 이상의 숫자로 바꿔 둔다.
      catches: ((input.catches ?? []) as unknown[])
        .filter(isObject)
        .map((c) => ({ species: text(c.species).trim(), count: nonNegative(c.count) }))
        .filter((c) => c.species),
      maxSize: nonNegative(input.maxSize),
      gear: {
        rod: text(gear.rod),
        reel: text(gear.reel),
        line: text(gear.line),
        bait: text(gear.bait),
      },
      memo: text(input.memo),
    },
  };
}

// "05:30 ~ 11:00" 모양인지 확인하는 정규식.
// 수정 화면에서 저장된 시간을 시작·끝으로 나눌 때도 쓴다.
// ( ) 로 묶은 부분을 꺼낼 수 있다: [전체, "05:30", "11:00"]
export const TIME_PATTERN = /^((?:[01]\d|2[0-3]):[0-5]\d) ~ ((?:[01]\d|2[0-3]):[0-5]\d)$/;

// ── 검사 도우미 ──

// 칸을 꺼낼 수 있는 객체인지. (null 과 배열은 typeof 가 'object' 라서 따로 뺀다)
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 글자면 그대로, 글자가 아니면(없음, 숫자, 객체 등) 빈 글자로.
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// 숫자로 바꿔서 0 이상이면 그대로, 숫자가 아니거나 음수면 0.
function nonNegative(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
