// 등록 API: POST /api/records
//
// 등록 화면(records/new/page.tsx)이 보낸 값을 받아서 MongoDB에 저장한다.
//
// 데이터가 지나가는 길:
// 1. 화면에서 [저장] → fetch('/api/records', { method: 'POST', body: formData })
// 2. 여기 POST 함수가 받아서
// 3. 사진 파일은 public/uploads 폴더에 저장하고, 그 주소만 모은다
// 4. 나머지 값 + 사진 주소를 trips 컬렉션에 insertOne() 으로 저장
// 5. 저장된 _id 를 화면에 돌려준다

import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getDb } from '@/lib/mongodb';
import type { TripInput } from '@/types/trip';

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
