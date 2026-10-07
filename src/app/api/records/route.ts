// 조행기 API: /api/records
//
// 한 주소에 두 가지 기능이 있다. 요청 방식(method)으로 구분한다.
//  - GET  /api/records?page=1 : 목록 가져오기 (10개씩)   → 아래 GET 함수
//  - POST /api/records        : 새 기록 저장하기          → 아래 POST 함수
//
// [POST] 데이터가 지나가는 길:
// 1. 화면에서 [저장] → fetch('/api/records', { method: 'POST', body: JSON 글자 })
// 2. 여기 POST 함수가 받아서
// 3. 꼭 필요한 칸(제목·날짜·위치)이 있는지, 날짜가 YYYY-MM-DD 모양인지, 각 칸의 타입이 맞는지 확인하고
// 4. trips 컬렉션에 insertOne() 으로 저장
// 5. 저장된 _id 를 화면에 돌려준다

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { TripListItem, TripListResponse } from '@/types/trip';

// 한 페이지에 보여줄 카드 수
const PAGE_SIZE = 10;

// ─────────────────────────────────────────────
// 목록 API: GET /api/records?page=2
// ─────────────────────────────────────────────
// 날짜 최신순으로 정렬한 뒤, 요청한 페이지의 10개만 돌려준다.
//
// 페이지 계산 예 (PAGE_SIZE = 10):
//   page=1 → 앞에서 0개 건너뛰고 10개  (1~10번째)
//   page=2 → 앞에서 10개 건너뛰고 10개 (11~20번째)
//   page=3 → 앞에서 20개 건너뛰고 10개 (21~30번째)
//   즉, 건너뛸 개수 = (page - 1) × 10
//
// 돌려주는 값 예:
// {
//   items: [{ id, date, place, weather, title }, ...],
//   page: 2, totalPages: 3, total: 25
// }

// page 번호를 받아 그 페이지의 기록 10개와 전체 페이지 수를 돌려준다
export async function GET(request: Request) {
  // ── 1. 주소에서 page 값 꺼내기 ──
  // "/api/records?page=2" 에서 ? 뒤의 page=2 부분을 읽는다.
  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get('page'));
  // page가 없거나(page=), 글자거나(page=abc), 소수거나(page=2.5), 0 이하면
  // 1페이지로 본다. Number.isInteger: 정수인지 확인하는 함수
  const page = Number.isInteger(requested) && requested >= 1 ? requested : 1;

  // try { ... } catch { ... }: DB 작업 중 오류가 나면 catch 로 넘어가서
  // 화면에 원인을 알려 준다. (없으면 Next.js 가 설명 없는 500 오류만 보낸다)
  let total: number;
  let docs;
  try {
    const collection = (await getDb()).collection('trips');

    // ── 2. 전체 개수 세기 ──
    // 페이지 버튼을 몇 개 그릴지 알려면 전체 기록 수가 필요하다.
    total = await collection.countDocuments();

    // ── 3. 이번 페이지 10개 가져오기 ──
    docs = await collection
      .find(
        {}, // 조건 없음 = 전부
        {
          // projection: 목록 카드에 필요한 칸만 가져온다. (1 = 가져오기)
          projection: { date: 1, place: 1, weather: 1, title: 1 },
        },
      )
      // 정렬: -1 = 큰 값 먼저(내림차순).
      // date 가 "2026-09-28" 모양의 글자라서 글자 순서 = 날짜 순서가 된다.
      // (그래서 날짜는 꼭 YYYY-MM-DD 모양으로 입력해야 한다. "9/28" 처럼 쓰면 순서가 틀어진다)
      // 날짜가 같으면 나중에 저장한 것(createdAt 큰 것)을 먼저.
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE) // 앞 페이지들 건너뛰기
      .limit(PAGE_SIZE) // 10개만
      .toArray();
  } catch (err) {
    return dbErrorResponse(err);
  }

  // 올림(ceil): 기록 25개면 25 / 10 = 2.5 → 3페이지
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── 4. 화면에 보내기 좋은 모양으로 바꾸기 ──
  // DB 문서 모양 → TripListItem 모양
  const items: TripListItem[] = docs.map((doc) => ({
    id: doc._id.toString(), // ObjectId → 글자
    date: doc.date,
    place: doc.place,
    weather: doc.weather,
    title: doc.title,
  }));

  const body: TripListResponse = { items, page, totalPages, total };
  return NextResponse.json(body);
}

// ─────────────────────────────────────────────
// 등록 API: POST /api/records
// ─────────────────────────────────────────────

export async function POST(request: Request) {
  // ── 1. 보낸 값 꺼내기 ──
  // 화면이 JSON 글자로 보낸 값을 request.json() 으로 객체로 바꾼다.
  // 받은 값은 믿지 않는다. 화면을 거치지 않고 API 로 직접 보낸 값일 수도 있어서
  // 칸마다 타입을 직접 확인한다. (그래서 타입을 TripInput 이 아니라 unknown 으로 받는다)
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    // JSON 모양이 깨져 있으면 여기로 온다.
    return NextResponse.json({ error: '입력값 형식이 잘못됐습니다.' }, { status: 400 });
  }

  // 객체가 아니면(null, 숫자, 배열 등) 칸을 꺼낼 수 없으니 바로 돌려보낸다.
  if (!isObject(input)) {
    return NextResponse.json({ error: '입력값 형식이 잘못됐습니다.' }, { status: 400 });
  }

  // 제목·날짜·위치는 목록 카드에 나오는 값이라 비어 있으면 저장하지 않는다.
  // (화면에서도 막지만, 서버에서도 한 번 더 확인한다)
  // text(): 글자가 아니면(숫자, 객체 등) 빈 글자로 바꾼다 → 아래에서 "비어 있음"으로 걸린다
  const title = text(input.title).trim();
  const date = text(input.date).trim();
  const place = text(input.place).trim();
  if (!title || !date || !place) {
    return NextResponse.json(
      { error: '제목, 날짜, 위치는 꼭 입력해야 합니다.' },
      { status: 400 },
    );
  }

  // 목록은 date 글자 순서로 정렬하므로 꼭 YYYY-MM-DD 모양이어야 한다.
  // ("9/28", "2026-9-8" 처럼 들어오면 정렬 순서가 틀어진다)
  // 정규식: 숫자 4개 - 숫자 2개 - 숫자 2개, 앞뒤에 다른 글자 없음
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: '날짜는 2026-09-28 처럼 YYYY-MM-DD 형식이어야 합니다.' },
      { status: 400 },
    );
  }

  // catches 는 배열이어야 .filter() 를 쓸 수 있다. 없으면 빈 배열(꽝)로 본다.
  if (input.catches !== undefined && !Array.isArray(input.catches)) {
    return NextResponse.json({ error: '조과 형식이 잘못됐습니다.' }, { status: 400 });
  }
  const gear = isObject(input.gear) ? input.gear : {};

  // ── 2. DB에 넣을 문서 만들기 ──
  // 값을 하나씩 다시 적는 이유: 화면에서 이상한 칸이 더 와도
  // 여기 적은 칸만 저장되게 하려고.
  // 선택 칸도 text() 로 글자만 받는다. 숫자나 객체가 저장되면
  // 상세 화면의 orDash() 에서 .trim() 이 없어서 화면이 죽는다.
  const doc = {
    date,
    place,
    title,
    time: text(input.time),
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
    createdAt: new Date(), // 저장한 시각은 서버가 넣는다
  };

  // ── 3. 저장 ──
  // insertOne: 문서 1개 저장. MongoDB가 _id 를 자동으로 만들어 준다.
  try {
    const db = await getDb();
    const result = await db.collection('trips').insertOne(doc);

    // ── 4. 결과 돌려주기 ──
    // _id 는 ObjectId 라서 toString() 으로 글자로 바꿔 보낸다.
    // 201 = "새로 만들어졌음" 이라는 뜻의 상태 코드
    return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
  } catch (err) {
    // DB 접속/저장 실패. 화면에 원인을 보여 주도록 error 문구를 담아 보낸다.
    return dbErrorResponse(err);
  }
}

// ─────────────────────────────────────────────
// DB 오류 응답 (GET, POST 가 같이 쓴다)
// ─────────────────────────────────────────────
// 1) 터미널(npm run dev 창)에는 자세한 원래 오류를 찍어서 개발자가 원인을 볼 수 있게 하고
// 2) 화면에는 사람이 알아볼 수 있는 한국어 문구를 보낸다.
// 503 = "서버가 지금 일을 할 수 없음" (여기서는 DB에 닿지 못함) 이라는 뜻의 상태 코드
//
// DB 는 MongoDB Atlas(클라우드)라서, 실패하면 보통 인터넷 연결이나
// .env.local 의 접속 주소(비밀번호)가 문제다. 자세한 이유는 src/lib/mongodb.ts 주석 참고.
function dbErrorResponse(err: unknown) {
  console.error('[api/records] DB 오류:', err);
  return NextResponse.json(
    { error: 'DB에 연결할 수 없습니다. 인터넷 연결과 .env.local 의 MONGODB_URI 를 확인하세요.' },
    { status: 503 },
  );
}

// ─────────────────────────────────────────────
// 입력값 검사 도우미 (POST 가 쓴다)
// ─────────────────────────────────────────────

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
