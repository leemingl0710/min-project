// 상세 화면: /records/[id]  (예: /records/66f1a2b3c4d5e6f7a8b9c0d1)
//
// 화면 구성 (3분할)
//  - 상단: 날짜 · 위치 · 날씨, 제목 (목록 카드와 같은 내용)
//  - 중단: 등록 화면에서 입력한 내용을 정리해서 보여준다
//      첫 줄     - 시간, 날씨
//      두번째 줄 - 어종 + 마릿수 (잡은 종류 수만큼 늘어남), 최대어 크기
//      세번째 줄 - 장비 (로드, 릴, 라인, 미끼)
//      네번째    - 박스 안에 자유 텍스트(memo)
//  - 하단: [뒤로 가기]
//
// 데이터가 지나가는 길:
// 1. 목록에서 카드를 누르면 /records/아이디 로 이동하고
// 2. 화면이 열리면 useEffect 가 fetch('/api/records/아이디') 로 상세 API(api/records/[id]/route.ts)에 요청
// 3. 받은 기록 1건을 useState 에 넣으면
// 4. 화면이 다시 그려지면서 내용이 보인다

// useState, useEffect, onClick 을 쓰려면 브라우저에서 돌아가야 한다.
// 파일 브라우저에서 작동하는 컴포넌트라고 선언하는 지시어
'use client';

//react에서 useEffect, useState를 가져와 사용
import { useEffect, useState } from 'react';
// 공식 라이브러리 모듈에서 페이지 경로를 조종하는 useRouter을 가져옴
import { useRouter } from 'next/navigation';
// 파일에 있는 TripDetail의 type형태 데이터만 가져옴
import type { TripDetail } from '@/types/trip';

// Next.js 는 주소의 [id] 자리 글자를 params 로 넘겨준다.
// 예: /records/66f1... → params = { id: '66f1...' }
type Props = {
  params: { id: string };
};

// 값이 비어 있으면 "-" 를 보여주기 위한 작은 함수.
// (입력을 안 한 칸이 그냥 빈칸으로 보이면 화면이 깨진 것처럼 보여서)
// 프론트에서 호출 받아 값이 들어오면 실행
function orDash(value: string) {
  // .trim() 앞뒤 공백을 없애주는 함수
  return value.trim() ? value : '-';
}

// export default - 이 화면이 메인화면이라는 것을 알려주는 코드, 라우터에 id값이 들어옴
// 라우터로부터 받은 Props타입 데이터 중에 params데이터만 사용한다.
export default function DetailPage({ params }: Props) {
  // 페이지 이동(뒤로 가기)에 쓰는 도구
  const router = useRouter();

  // ── 화면에 보여줄 값 보관 (useState) ──
  // 처음에는 아직 받아온 게 없으니 null
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true); // 불러오는 중인지
  const [error, setError] = useState(''); // 불러오기 실패 메시지

  // ── 기록 1건 불러오기 (useEffect) ──
  // 화면이 처음 열릴 때 + 주소의 id 가 바뀔 때 실행된다. (목록 화면의 [page] 와 같은 원리)
  useEffect(() => {
    // 응답이 오기 전에 다른 기록으로 넘어가면, 늦게 온 옛날 응답은 무시하기 위한 표시
    let ignore = false;

    async function load() {
      setLoading(true);
      setError('');

      try {
        //주소에 있는 params.id값을 fetch에 들어올 때까지 기다림
        const res = await fetch(`/api/records/${params.id}`);
        if (!res.ok) { //응답을 참거짓으로 판단
          // 서버가 보낸 에러 문구(예: "없는 기록입니다.")를 꺼내서 catch 로 넘긴다.
          // 응답이 비어있거나 json형태가 아닐때 빈 객체로 대신 처리
          const body = await res.json().catch(() => ({}));
          //왼쪽 값이 없을 때 오른쪽 값을 내보낸다.
          throw new Error(body.error ?? '기록을 불러오지 못했습니다.');
        }
        // 서버 응답을 기다렸다 TripDetail타입 형식으로 data에 넣어라
        const data: TripDetail = await res.json();
        if (ignore) return;
        setTrip(data);
      } catch (err) {
        //잡힌 에러(err)가 자바스크립트의 진짜 Error 클래스로 만들어진 표준 에러 객체인지 확인하고 맞으면 표준 메시지
        //아닐 경우 text 메시지
        if (!ignore) setError(err instanceof Error ? err.message : '기록을 불러오지 못했습니다.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    // 정리 함수: id 가 바뀌어서 다시 실행되기 직전(또는 화면을 떠날 때) 불린다.
    return () => {
      ignore = true;
    };
  }, [params.id]);

  return (
    // min-h-screen + flex-col: 화면 높이를 꽉 채워서 하단 버튼이 항상 맨 아래에 오게 (목록 화면과 같은 방식)
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col p-4">
      {/* 상황에 따라 하나만 보여준다: 불러오는 중 / 실패 / 내용 */}
      {loading ? (
        <p className="flex-1 text-sm text-gray-500">불러오는 중...</p>
      ) : error || !trip ? (
        <p className="flex-1 text-sm text-red-600">{error}</p>
      ) : (
        // <>...</> : 여러 태그를 하나로 묶기만 하는 빈 껍데기 (화면에는 아무것도 안 그려진다)
        <>
          {/* ───────── 상단: 제목 영역 ───────── */}
          {/* 목록 카드와 같은 내용(날짜 · 위치 · 날씨 + 제목)을 크게 보여준다 */}
          <header className="mb-6 border-b pb-4">
            <p className="text-sm text-gray-600">
              {trip.date} · {trip.place}
              {/* 날씨는 선택 입력이라, 적었을 때만 보여준다 */}
              {trip.weather && ` · ${trip.weather}`}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{trip.title}</h1>
          </header>

          {/* ───────── 중단: 내용 ───────── */}
          {/* flex-1: 남는 공간을 전부 차지 → 하단 버튼을 아래로 밀어낸다 */}
          <section className="flex flex-1 flex-col gap-6">
            {/* ── 첫 줄: 시간, 날씨 ── */}
            {/* dl/dt/dd: "이름 - 값" 짝을 나열할 때 쓰는 태그 (dt = 이름, dd = 값) */}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">시간</dt>
                <dd className="mt-1">{orDash(trip.time)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">날씨</dt>
                <dd className="mt-1">{orDash(trip.weather)}</dd>
              </div>
            </dl>

            {/* ── 두번째 줄: 어종 + 마릿수, 최대어 크기 ── */}
            <div className="text-sm">
              <h2 className="mb-2 font-semibold">조과</h2>
              {trip.catches.length === 0 ? (
                // 어종을 하나도 안 적었으면 꽝으로 본다
                <p className="text-gray-500">꽝</p>
              ) : (
                // 등록할 때 [어종 추가]로 늘린 만큼 뱃지가 늘어난다.
                // flex-wrap: 한 줄에 다 안 들어가면 다음 줄로 넘긴다
                <ul className="flex flex-wrap gap-2">
                  {trip.catches.map((c, index) => (
                    <li key={index} className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                      {c.species} {c.count}마리
                    </li>
                  ))}
                </ul>
              )}
              {/* maxSize 가 0 이면 입력을 안 한 것이라 "-" 로 보여준다 */}
              <p className="mt-3">
                <span className="text-gray-500">최대어 </span>
                {trip.maxSize > 0 ? `${trip.maxSize}cm` : '-'}
              </p>
            </div>

            {/* ── 세번째 줄: 장비 ── */}
            <div className="text-sm">
              <h2 className="mb-2 font-semibold">장비</h2>
              {/* 좁은 화면(휴대폰)에서는 2칸, 넓은 화면(sm 이상)에서는 4칸 한 줄로 */}
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <dt className="text-gray-500">로드</dt>
                  <dd className="mt-1">{orDash(trip.gear.rod)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">릴</dt>
                  <dd className="mt-1">{orDash(trip.gear.reel)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">라인</dt>
                  <dd className="mt-1">{orDash(trip.gear.line)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">미끼</dt>
                  <dd className="mt-1">{orDash(trip.gear.bait)}</dd>
                </div>
              </dl>
            </div>

            {/* ── 네번째: 박스형 텍스트 ── */}
            <div className="text-sm">
              <h2 className="mb-2 font-semibold">내용</h2>
              {/* whitespace-pre-wrap: 입력할 때 누른 줄바꿈(Enter)을 화면에서도 그대로 보여준다.
                  이게 없으면 여러 줄로 쓴 memo 가 한 줄로 붙어서 나온다 */}
              <div className="min-h-32 whitespace-pre-wrap rounded border border-gray-300 bg-gray-50 p-4">
                {orDash(trip.memo)}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ───────── 하단: 버튼 ───────── */}
      {/* 불러오기에 실패해도 돌아갈 수 있게, 버튼은 항상 보여준다 */}
      <div className="mt-8 flex border-t pt-4">
        {/* router.back(): 브라우저의 뒤로 가기와 같다.
            그래서 목록 2페이지에서 들어왔으면 2페이지(/?page=2)로 돌아간다 */}
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
        >
          뒤로 가기
        </button>
      </div>
    </main>
  );
}
