// 조행기 상세 API: GET /api/records/[id]
//
// [id] 폴더 이름은 "주소의 이 자리에 오는 글자를 id 로 받겠다"는 뜻이다.
//   예) /api/records/66f1a2b3c4d5e6f7a8b9c0d1 → id = "66f1a2b3c4d5e6f7a8b9c0d1"
//
// 데이터가 지나가는 길:
// 1. 상세 화면(records/[id]/page.tsx)이 fetch('/api/records/아이디') 로 요청
// 2. 여기 GET 함수가 주소에서 id 를 꺼내고
// 3. trips 컬렉션에서 findOne() 으로 그 id 의 기록 1건을 찾아서
// 4. 화면에 보내기 좋은 모양(TripDetail)으로 바꿔 돌려준다

import { NextResponse } from 'next/server';
// ObjectId: MongoDB 의 _id 타입. 글자로 받은 id 를 이 타입으로 바꿔야 DB 에서 찾을 수 있다.
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import type { TripDetail } from '@/types/trip';

// 두 번째 값({ params })에 Next.js 가 주소의 [id] 자리 글자를 넣어 준다.
// 첫 번째 값(request)은 여기서는 안 쓰지만, 순서 때문에 자리는 비워 둘 수 없어서 _request 로 받는다.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  // ── 1. id 확인 ──
  // ObjectId 는 정해진 모양(24글자 16진수)이 있다.
  // 모양이 틀린 id 로 new ObjectId() 를 하면 오류가 나서, 먼저 확인하고 404(없음)로 돌려보낸다.
  if (!ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: '없는 기록입니다.' }, { status: 404 });
  }

  // ── 2. DB 에서 1건 찾기 ──
  let doc;
  try {
    const collection = (await getDb()).collection('trips');
    // findOne: 조건에 맞는 문서 1개만 찾는다. 없으면 null
    doc = await collection.findOne({ _id: new ObjectId(params.id) });
  } catch (err) {
    // DB 접속 실패. 터미널에 원래 오류를 찍고, 화면에는 한국어 문구를 보낸다. (목록 API 와 같은 방식)
    console.error('[api/records/[id]] DB 오류:', err);
    return NextResponse.json(
      { error: 'DB에 연결할 수 없습니다. 인터넷 연결과 .env.local 의 MONGODB_URI 를 확인하세요.' },
      { status: 503 },
    );
  }

  // 모양은 맞지만 DB 에 없는 id (예: 이미 지운 기록)
  if (!doc) {
    return NextResponse.json({ error: '없는 기록입니다.' }, { status: 404 });
  }

  // ── 3. 화면에 보내기 좋은 모양으로 바꾸기 ──
  // DB 문서 모양 → TripDetail 모양.
  // ?? '' / ?? [] : 예전에 저장해서 그 칸이 없는 기록이어도 화면이 깨지지 않게 기본값을 넣는다.
  const body: TripDetail = {
    id: doc._id.toString(), // ObjectId → 글자
    date: doc.date,
    place: doc.place,
    title: doc.title,
    time: doc.time ?? '',
    weather: doc.weather ?? '',
    catches: doc.catches ?? [],
    maxSize: doc.maxSize ?? 0,
    gear: doc.gear ?? { rod: '', reel: '', line: '', bait: '' },
    memo: doc.memo ?? '',
  };

  return NextResponse.json(body);
}
