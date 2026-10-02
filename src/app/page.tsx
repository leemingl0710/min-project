// 목록 화면: /  (예: /?page=2)
//
// 화면 구성
//  - 상단: 제목 "조행기"
//  - 중단: 조행기 카드 목록 (한 페이지에 10개). 카드를 누르면 상세(/records/[id])로 이동
//          카드 아래에 페이지 버튼 [이전] 1 2 3 [다음]
//  - 하단: 왼쪽 [종료], 오른쪽 [조행기 추가]
//
// 데이터가 지나가는 길:
// 1. 화면이 열리면(또는 페이지 번호가 바뀌면) useEffect 가 실행되고
// 2. fetch('/api/records?page=N') 으로 목록 API(route.ts 의 GET)에 요청
// 3. 받은 카드 10개와 전체 페이지 수를 useState 에 넣으면
// 4. 화면이 다시 그려지면서 카드와 페이지 버튼이 보인다
//
// 지금 몇 페이지인지는 주소의 ?page=2 부분에 적어 둔다.
// 그래야 상세 화면에 갔다가 [뒤로 가기]를 눌러도 보던 페이지로 돌아온다.

// useState, useEffect, onClick 을 쓰려면 브라우저에서 돌아가야 한다.
//파일이 브라우저에서 작동하는 컴포넌트라고 선언하는 지시어(선언 안 하면 서버 컴포넌트로 처리 됌)
'use client';

//API에서 조행기 목록 데이터를 받아와서 변수에 저장하기 위해
import { useEffect, useState } from 'react';
//조행기를 눌렀을 때 상세 페이지로 이동하기 위해
import Link from 'next/link';
//받아올 조행기 데이터 모양을 TypeScript로 안정하게 지정하기 위해
import type { TripListItem } from '@/types/trip';

// Next.js 는 주소의 ? 뒷부분을 searchParams 로 넘겨준다.
// 예: /?page=2 → searchParams = { page: '2' }
// Props 값 안에 url ? 뒤에 있는 쌍들이 하나의 묶음으로 들어가고 그 묶음 중 page에 묶음인 값을 page에 넣는 것
type Props = {
  searchParams: { page?: string };
};

// type Props에서 받은 값으로 사용할 페이지 컴포넌트(함수)를 만드는 것
export default function ListPage({ searchParams }: Props) {
  // 주소에서 페이지 번호 꺼내기. 없거나 이상한 값이면 1페이지.
  // (서버에서도 한 번 더 확인하지만, 버튼 표시에 쓰려고 여기서도 숫자로 바꾼다)
  const requested = Number(searchParams.page);
  //SearchParams.page값을 String -> Number 변환
  const page = Number.isInteger(requested) && requested >= 1 ? requested : 1;
  //알고리즘 계산 오류 방지를 위해서 isInteger로 requested 데이터변형
  //참일 때 왼쪽, 거짓일 때 오른쪽

  // ── 화면에 보여줄 값 보관 (useState) ──
  // 값을 넣고 사용할 배열 세팅 / useState에 있는 값을 api불러오면서 값을 넣는 것
  const [items, setItems] = useState<TripListItem[]>([]); // 이번 페이지의 카드들
  //types/trip.ts - TripListItem타입에 데이터를 가져온다.
  const [totalPages, setTotalPages] = useState(0); // 전체 페이지 수
  const [loading, setLoading] = useState(true); // 불러오는 중인지
  const [error, setError] = useState(''); // 불러오기 실패 메시지

  // ── 목록 불러오기 (useEffect) ──
  // useEffect(할 일, [page]) : 화면이 처음 열릴 때 + page 값이 바뀔 때마다 "할 일"을 실행한다.
  // 페이지 버튼을 누르면 주소가 바뀌고 → page 가 바뀌고 → 여기서 다시 불러온다.
  useEffect(() => {
    // 응답이 오기 전에 다른 페이지로 넘어가면, 늦게 온 옛날 응답은 무시하기 위한 표시
    // 재할당 할 수 있는 값, 시작은 false로
    let ignore = false;

    async function load() {
      //load함수가 시작됐을 때 setLoading true로 로딩중이라고 반환
      setLoading(true);
      // Error 상태변수 안에 내용을 초기화
      setError('');

      try {
        // fetch에서 page값을 받을 때까지 기다렸다 res에 넣음
        // 페이지가 열리면서 params.id 값을 먼저 확보하고 그 값으로 fetch를 실행하게 된다.
        const res = await fetch(`/api/records?page=${page}`);
        // 응답이 실패했을 때 오류를 던져서 catch로 넘어가게함
        if (!res.ok) throw new Error();
        //서버에서 JSON형태로된 데이터를 받을 때까지 기다렸다 변수에 저장
        const data = await res.json();
        //Race Condition(비동기 경쟁 상태) 버그를 막기 위한 코드 true일 때 return
        if (ignore) return;
        //서버로부터 받은 data에서 items에 들어있는 값을 넣는 코드(목록박스에 보여줄 데이터를 저장하는 것)
        setItems(data.items);
        //data에 있는 totalPages(조행기 수)를 가져와 저장(목록박스 개수를 위한 과정)
        setTotalPages(data.totalPages);
      } catch {
        // DB(Atlas)에 닿지 못했을 때. 보통 인터넷 연결이나 .env.local 설정 문제다.
        //!igonre가 ture일 때 setError를 text값을 넣어서 출력
        if (!ignore) setError('목록을 불러오지 못했습니다. 인터넷 연결과 DB 설정을 확인하세요.');
      } finally {
        // true일 때 setLoading(false) 로딩이 끝났다고 알려주는 코드
        if (!ignore) setLoading(false);
      }
    }

    //load() 이제 위에 있는 load()함수를 실행
    load();

    // 정리 함수: page 가 바뀌어서 useEffect 가 다시 실행되기 직전에 불린다.
    // ignore = true;로 반환하는 코드
    return () => {
      ignore = true;
    };
//다른 페이지로 넘어가고 싶어서 다른 버튼을 눌렀을 때, 새로운 페이지를 실행
  }, [page]);

  // ── [종료] 버튼 ──
  // 웹페이지는 보안 때문에 사용자가 직접 연 탭을 스스로 닫을 수 없다.
  // window.close() 를 시도해 보고, 브라우저가 막으면 안내 문구를 띄운다.
  // 종료 버튼 이벤트
  function handleExit() {
    if (!confirm('조행기를 종료할까요?')) return;
    window.close();
    // 탭이 닫혔다면 아래 줄은 실행되지 않는다. 여기까지 왔다면 브라우저가 막은 것.
    // text를 보여준다
    alert('브라우저가 창 닫기를 막았습니다. 탭을 직접 닫아 주세요.');
  }

  // 페이지 버튼에 쓸 번호 목록. totalPages 가 3 이면 [1, 2, 3]
  // Array.from({ length: 3 }, (_, i) => i + 1) → [1, 2, 3]
  // totalPages 값만큼 배열을 만들고 페이지만큼 페이지 번호 값을 넣는 것
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    // min-h-screen + flex-col: 화면 높이를 꽉 채워서 하단 버튼이 항상 맨 아래에 오게
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col p-4">
      {/* ───────── 상단 ───────── */}
      <h1 className="mb-6 text-2xl font-bold">조행기</h1>

      {/* ───────── 중단: 목록 ───────── */}
      {/* flex-1: 남는 공간을 전부 차지 → 하단 버튼을 아래로 밀어낸다 */}
      <section className="flex flex-1 flex-col gap-3">
        {/* 상황에 따라 하나만 보여준다: 불러오는 중 / 실패 / 기록 없음 / 카드 목록 */}
        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">
            {/* page가 0이면 실행 */}
            {page === 1 ? '아직 기록이 없습니다. [조행기 추가]로 첫 기록을 남겨 보세요.' : '이 페이지에는 기록이 없습니다.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {/* 카드 1개 = 기록 1건. key 는 React 가 카드를 구분하는 값이라 겹치지 않는 id 를 쓴다 */}
            {/* map 배열에 있는 값을 하나씩 차래대로 꺼내서 반복처리 */}
            {items.map((item) => (
              <li key={item.id}>
                {/* Link: 누르면 상세 화면으로 이동. 카드 전체가 눌리도록 Link 로 감쌌다 */}
                <Link
                  href={`/records/${item.id}`}
                  className="block rounded border border-gray-300 p-4 hover:border-blue-500 hover:bg-blue-50"
                >
                  {/* 첫 줄: 날짜 · 위치 · 날씨 (요구사항 순서대로) */}
                  <p className="text-sm text-gray-600">
                    {item.date} · {item.place}
                    {/* 날씨는 선택 입력이라, 적었을 때만 보여준다 */}
                    {item.weather && ` · ${item.weather}`}
                  </p>
                  {/* 둘째 줄: 제목 */}
                  <p className="mt-1 font-semibold">{item.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* ── 페이지 버튼: 페이지가 2개 이상일 때만 보여준다 ── */}
        {/* 1페이지 일때 이전 버튼을 흐리게 마지막 페이지일 때 다음 버튼을 흐리게 */}
        {totalPages > 1 && (
          <nav className="mt-4 flex items-center justify-center gap-1 text-sm">
            {/* [이전]: 1페이지면 갈 곳이 없으니 흐리게 표시만 */}
            {page > 1 ? (
              <Link href={`/?page=${page - 1}`} className="rounded px-3 py-1 hover:bg-gray-100">
                이전
              </Link>
            ) : (
              <span className="px-3 py-1 text-gray-300">이전</span>
            )}

            {/* 번호 버튼. 지금 페이지는 파란 배경으로 표시 */}
            {/* 현재 있는 버튼 색 파란색을 표시 */}
            {pageNumbers.map((n) => (
              <Link
                key={n}
                href={`/?page=${n}`}
                className={
                  n === page
                    ? 'rounded bg-blue-600 px-3 py-1 text-white'
                    : 'rounded px-3 py-1 hover:bg-gray-100'
                }
              >
                {n}
              </Link>
            ))}

            {/* [다음]: 마지막 페이지면 흐리게 */}
            {page < totalPages ? (
              <Link href={`/?page=${page + 1}`} className="rounded px-3 py-1 hover:bg-gray-100">
                다음
              </Link>
            ) : (
              <span className="px-3 py-1 text-gray-300">다음</span>
            )}
          </nav>
        )}
      </section>

      {/* ───────── 하단: 버튼 ───────── */}
      {/* justify-between: 첫 번째는 왼쪽 끝, 두 번째는 오른쪽 끝 */}
      <div className="mt-8 flex justify-between border-t pt-4">
        <button
          type="button"
          onClick={handleExit}
          className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
        >
          종료
        </button>
        {/* 등록 화면으로 이동. 페이지 이동이라 button 대신 Link 를 쓴다 */}
        <Link
          href="/records/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          조행기 추가
        </Link>
      </div>
    </main>
  );
}
