// 조행기 상세 API: GET /api/records/[id]
// 조행기 수정 API: PUT /api/records/[id]
// 조행기 삭제 API: DELETE /api/records/[id]
//
// [id] 폴더 이름은 "주소의 이 자리에 오는 글자를 id 로 받겠다"는 뜻이다.
//   예) /api/records/66f1a2b3c4d5e6f7a8b9c0d1 → id = "66f1a2b3c4d5e6f7a8b9c0d1"
//
// 데이터가 지나가는 길:
// 1. 상세 화면(records/[id]/page.tsx)이 fetch('/api/records/아이디') 로 요청
// 2. 여기 GET 함수가 주소에서 id 를 꺼내고
// 3. trips 컬렉션에서 findOne() 으로 그 id 의 기록 1건을 찾아서
// 4. 화면에 보내기 좋은 모양(TripDetail)으로 바꿔 돌려준다

//서버에서 작동하는 코드 내에서 클라이언트(브라우저)로 응답을 전달할 때 사용
import { NextResponse } from 'next/server';
// ObjectId: MongoDB 의 _id 타입. 글자로 받은 id 를 이 타입으로 바꿔야 DB 에서 찾을 수 있다.
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { parseTripInput } from '@/lib/tripInput';
// 루트에 있는 TripDetail을 type형태로 받아옴
import type { TripDetail } from '@/types/trip';

// 두 번째 값({ params })에 Next.js 가 주소의 [id] 자리 글자를 넣어 준다.
// 첫 번째 값(request)은 여기서는 안 쓰지만, 순서 때문에 자리는 비워 둘 수 없어서 _request 로 받는다.
//HTTP 요청이 들어왔을 때 실행되는 함수, params(상자) : params(문자열 id를 가진 객체)
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  // ── 1. id 확인 ──
  // ObjectId 는 정해진 모양(24글자 16진수)이 있다.
  // 모양이 틀린 id 로 new ObjectId() 를 하면 오류가 나서, 먼저 확인하고 404(없음)로 돌려보낸다.
  // isValid는 params.id가 Mongodb ID 규칙에 맞는지 확인해주는 함수(boolean)
  if (!ObjectId.isValid(params.id)) { // false일 때
    //클라이언트에게 보내주기 위해 NextResponse를 사용하고 json형태로 text를 보냄
    return NextResponse.json({ error: '없는 기록입니다.' }, { status: 404 });
  }

  // ── 2. DB 에서 1건 찾기 ──
  let doc; // 재할당 할 수 있는 변수 선언
  try {
    //db에 있는 trips에 접근할 때까지 기다렸다 collection에 넣는 코드
    const collection = (await getDb()).collection('trips');
    // findOne: 조건에 맞는 문서 1개만 찾는다. 없으면 null
    //trips 컬렉션에서 이 id 를 가진 문서를 조회(읽기)해서 doc 에 담는다. 저장하는 게 아니다
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
  // ?? == 값이 없을 때를 대비한 안전장치
  // 읽어온 값을 TripDetail type에 맞추고 body 객체에 담는 코드
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
  //json형태로 클라이언트에게 보여줌
  return NextResponse.json(body);
}

// ── 수정: PUT /api/records/[id] ──
// 데이터가 지나가는 길:
// 1. 수정 화면(records/[id]/edit/page.tsx)에서 [저장]을 누르면
// 2. fetch('/api/records/아이디', { method: 'PUT', body: JSON 글자 }) 로 여기에 요청
// 3. 등록 API 와 같은 규칙(parseTripInput)으로 검사하고
// 4. trips 컬렉션에서 updateOne() 으로 그 id 의 기록을 새 값으로 바꾼다
// PUT = "이 자리의 데이터를 보낸 값으로 통째로 바꿔 줘" 라는 뜻의 요청 방식
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  // ── 1. id 확인 ── (GET 과 같은 이유로 먼저 모양을 확인한다)
  if (!ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: '없는 기록입니다.' }, { status: 404 });
  }

  // ── 2. 보낸 값 꺼내서 검사하기 ── (등록 API 와 같은 규칙)
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: '입력값 형식이 잘못됐습니다.' }, { status: 400 });
  }
  const parsed = parseTripInput(input);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // ── 3. DB 에서 1건 바꾸기 ──
  let result;
  try {
    const collection = (await getDb()).collection('trips');
    // updateOne(찾을 조건, 바꿀 내용)
    // $set: 적은 칸만 새 값으로 바꾸고, 안 적은 칸(createdAt)은 그대로 둔다.
    // createdAt 을 그대로 두는 이유: 같은 날짜끼리의 목록 순서가 수정할 때마다 바뀌지 않게
    result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { ...parsed.value, updatedAt: new Date() } },
    );
  } catch (err) {
    console.error('[api/records/[id]] DB 오류:', err);
    return NextResponse.json(
      { error: 'DB에 연결할 수 없습니다. 인터넷 연결과 .env.local 의 MONGODB_URI 를 확인하세요.' },
      { status: 503 },
    );
  }

  // 조건에 맞는 문서가 0개면 이미 없는 기록 (예: 다른 탭에서 먼저 지움)
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: '없는 기록입니다.' }, { status: 404 });
  }

  return NextResponse.json({ id: params.id });
}

// ── 삭제: DELETE /api/records/[id] ──
// 데이터가 지나가는 길:
// 1. 상세 화면의 [삭제] 버튼 → 확인창에서 [확인]을 누르면
// 2. fetch('/api/records/아이디', { method: 'DELETE' }) 로 여기에 요청
// 3. trips 컬렉션에서 deleteOne() 으로 그 id 의 기록 1건을 지운다
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  // ── 1. id 확인 ── (GET 과 같은 이유로 먼저 모양을 확인한다)
  if (!ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: '없는 기록입니다.' }, { status: 404 });
  }

  // ── 2. DB 에서 1건 지우기 ──
  let result;
  try {
    const collection = (await getDb()).collection('trips');
    // deleteOne: 조건에 맞는 문서 1개를 지운다. 몇 개를 지웠는지 deletedCount 로 알려준다
    result = await collection.deleteOne({ _id: new ObjectId(params.id) });
  } catch (err) {
    console.error('[api/records/[id]] DB 오류:', err);
    return NextResponse.json(
      { error: 'DB에 연결할 수 없습니다. 인터넷 연결과 .env.local 의 MONGODB_URI 를 확인하세요.' },
      { status: 503 },
    );
  }

  // 지운 게 0개면 이미 없는 기록 (예: 다른 탭에서 먼저 지움)
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: '없는 기록입니다.' }, { status: 404 });
  }

  // 지우기 성공. 돌려줄 내용은 없어서 ok 만 보낸다
  return NextResponse.json({ ok: true });
}
