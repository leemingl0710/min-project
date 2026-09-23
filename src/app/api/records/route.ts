// 조행기 API: /api/records
//
// 한 주소에 두 가지 기능이 있다. 요청 방식(method)으로 구분한다.
//  - GET  /api/records?page=1 : 목록 가져오기 (10개씩)   → 아래 GET 함수
//  - POST /api/records        : 새 기록 저장하기          → 아래 POST 함수
//
// [POST] 데이터가 지나가는 길:
// 1. 화면에서 [저장] → fetch('/api/records', { method: 'POST', body: formData })
// 2. 여기 POST 함수가 받아서
// 3. 사진 파일은 public/uploads 폴더에 저장하고, 그 주소만 모은다
// 4. 나머지 값 + 사진 주소를 trips 컬렉션에 insertOne() 으로 저장
// 5. 저장된 _id 를 화면에 돌려준다

import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getDb } from '@/lib/mongodb';
import type { TripInput, TripListItem, TripListResponse } from '@/types/trip';

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
//   items: [{ id, date, place, weather, title, thumbnail }, ...],
//   page: 2, totalPages: 3, total: 25
// }
export async function GET(request: Request) {
  // ── 1. 주소에서 page 값 꺼내기 ──
  // "/api/records?page=2" 에서 ? 뒤의 page=2 부분을 읽는다.
  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get('page'));
  // page가 없거나(page=), 글자거나(page=abc), 소수거나(page=2.5), 0 이하면
  // 1페이지로 본다. Number.isInteger: 정수인지 확인하는 함수
  const page = Number.isInteger(requested) && requested >= 1 ? requested : 1;

  const collection = (await getDb()).collection('trips');

  // ── 2. 전체 개수 세기 ──
  // 페이지 버튼을 몇 개 그릴지 알려면 전체 기록 수가 필요하다.
  const total = await collection.countDocuments();
  // 올림(ceil): 기록 25개면 25 / 10 = 2.5 → 3페이지
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── 3. 이번 페이지 10개 가져오기 ──
  const docs = await collection
    .find(
      {}, // 조건 없음 = 전부
      {
        // projection: 목록 카드에 필요한 칸만 가져온다. (1 = 가져오기)
        // photos 는 첫 장만 필요해서 $slice: 1 로 한 장만 가져온다.
        projection: { date: 1, place: 1, weather: 1, title: 1, photos: { $slice: 1 } },
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

  // ── 4. 화면에 보내기 좋은 모양으로 바꾸기 ──
  // DB 문서 모양 → TripListItem 모양
  const items: TripListItem[] = docs.map((doc) => ({
    id: doc._id.toString(), // ObjectId → 글자
    date: doc.date,
    place: doc.place,
    weather: doc.weather,
    title: doc.title,
    // 사진이 한 장이라도 있으면 첫 장, 없으면 null
    thumbnail: doc.photos?.[0] ?? null,
  }));

  const body: TripListResponse = { items, page, totalPages, total };
  return NextResponse.json(body);
}

// ─────────────────────────────────────────────
// 등록 API: POST /api/records
// ─────────────────────────────────────────────

// 사진을 저장할 폴더. public 안에 있는 파일은 브라우저에서
// "/uploads/파일이름" 주소로 바로 열 수 있다.
// (로컬 npm run dev 에서만 쓰는 방식. 배포하려면 Vercel Blob 같은 저장소로 바꿔야 한다)
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(request: Request) {
  // 사진 파일이 섞여 있어서 JSON이 아니라 FormData로 받는다.
  //  - "data"   : 글자 칸들을 JSON 문자열 하나로 묶은 것
  //  - "photos" : 사진 파일들 (여러 장이면 같은 이름으로 여러 개)
  const formData = await request.formData();

  // ── 1. 글자 칸 꺼내기 ──
  const rawData = formData.get('data');
  if (typeof rawData !== 'string') {
    return NextResponse.json({ error: '입력값이 없습니다.' }, { status: 400 });
  }
  // 받은 값은 믿지 않고, Omit으로 photos만 뺀 모양이라고 "가정"만 한다.
  // 꼭 필요한 칸은 아래에서 직접 확인한다.
  let input: Omit<TripInput, 'photos'>;
  try {
    input = JSON.parse(rawData);
  } catch {
    // JSON 모양이 깨져 있으면 여기로 온다.
    return NextResponse.json({ error: '입력값 형식이 잘못됐습니다.' }, { status: 400 });
  }

  // 제목·날짜·위치는 목록 카드에 나오는 값이라 비어 있으면 저장하지 않는다.
  // (화면에서도 막지만, 서버에서도 한 번 더 확인한다)
  if (!input.title?.trim() || !input.date?.trim() || !input.place?.trim()) {
    return NextResponse.json(
      { error: '제목, 날짜, 위치는 꼭 입력해야 합니다.' },
      { status: 400 },
    );
  }

  // ── 2. 사진 저장하기 ──
  // getAll: 같은 이름("photos")으로 온 값을 전부 배열로 가져온다.
  const files = formData.getAll('photos');
  const photoUrls: string[] = [];

  if (files.length > 0) {
    // 폴더가 없으면 만든다. recursive: true 는 "이미 있으면 그냥 넘어가기"
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  for (const file of files) {
    // 파일이 아니거나 이미지가 아니면 건너뛴다.
    if (!(file instanceof File) || !file.type.startsWith('image/')) continue;

    // 파일 이름이 겹치지 않게 "지금 시각-랜덤값.확장자" 로 새 이름을 붙인다.
    const ext = path.extname(file.name) || '.jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    // 파일 내용을 Buffer(바이트 덩어리)로 바꿔서 디스크에 쓴다.
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, fileName), bytes);

    // DB에는 파일이 아니라 브라우저에서 열 수 있는 주소만 저장한다.
    photoUrls.push(`/uploads/${fileName}`);
  }

  // ── 3. DB에 넣을 문서 만들기 ──
  // 값을 하나씩 다시 적는 이유: 화면에서 이상한 칸이 더 와도
  // 여기 적은 칸만 저장되게 하려고.
  const doc = {
    date: input.date.trim(),
    place: input.place.trim(),
    title: input.title.trim(),
    time: input.time ?? '',
    weather: input.weather ?? '',
    // 어종 이름이 빈 줄은 빼고, 마릿수는 숫자로 바꿔 둔다.
    catches: (input.catches ?? [])
      .filter((c) => c.species?.trim())
      .map((c) => ({ species: c.species.trim(), count: Number(c.count) || 0 })),
    maxSize: Number(input.maxSize) || 0,
    gear: {
      rod: input.gear?.rod ?? '',
      reel: input.gear?.reel ?? '',
      line: input.gear?.line ?? '',
      bait: input.gear?.bait ?? '',
    },
    memo: input.memo ?? '',
    photos: photoUrls,
    createdAt: new Date(), // 저장한 시각은 서버가 넣는다
  };

  // ── 4. 저장 ──
  // insertOne: 문서 1개 저장. MongoDB가 _id 를 자동으로 만들어 준다.
  const db = await getDb();
  const result = await db.collection('trips').insertOne(doc);

  // ── 5. 결과 돌려주기 ──
  // _id 는 ObjectId 라서 toString() 으로 글자로 바꿔 보낸다.
  // 201 = "새로 만들어졌음" 이라는 뜻의 상태 코드
  return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
}
