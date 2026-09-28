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
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { TripListItem } from '@/types/trip';

// Next.js 는 주소의 ? 뒷부분을 searchParams 로 넘겨준다.
// 예: /?page=2 → searchParams = { page: '2' }
type Props = {
  searchParams: { page?: string };
};

export default function ListPage({ searchParams }: Props) {
  // 주소에서 페이지 번호 꺼내기. 없거나 이상한 값이면 1페이지.
  // (서버에서도 한 번 더 확인하지만, 버튼 표시에 쓰려고 여기서도 숫자로 바꾼다)
  const requested = Number(searchParams.page);
  const page = Number.isInteger(requested) && requested >= 1 ? requested : 1;

  // ── 화면에 보여줄 값 보관 (useState) ──
  const [items, setItems] = useState<TripListItem[]>([]); // 이번 페이지의 카드들
  const [totalPages, setTotalPages] = useState(0); // 전체 페이지 수
  const [loading, setLoading] = useState(true); // 불러오는 중인지
  const [error, setError] = useState(''); // 불러오기 실패 메시지

  // ── 목록 불러오기 (useEffect) ──
  // useEffect(할 일, [page]) : 화면이 처음 열릴 때 + page 값이 바뀔 때마다 "할 일"을 실행한다.
  // 페이지 버튼을 누르면 주소가 바뀌고 → page 가 바뀌고 → 여기서 다시 불러온다.
  useEffect(() => {
    // 응답이 오기 전에 다른 페이지로 넘어가면, 늦게 온 옛날 응답은 무시하기 위한 표시
    let ignore = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/records?page=${page}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (ignore) return;
        setItems(data.items);
        setTotalPages(data.totalPages);
      } catch {
        // DB(Atlas)에 닿지 못했을 때. 보통 인터넷 연결이나 .env.local 설정 문제다.
        if (!ignore) setError('목록을 불러오지 못했습니다. 인터넷 연결과 DB 설정을 확인하세요.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    // 정리 함수: page 가 바뀌어서 useEffect 가 다시 실행되기 직전에 불린다.
    return () => {
      ignore = true;
    };
  }, [page]);

  // ── [종료] 버튼 ──
  // 웹페이지는 보안 때문에 사용자가 직접 연 탭을 스스로 닫을 수 없다.
  // window.close() 를 시도해 보고, 브라우저가 막으면 안내 문구를 띄운다.
  function handleExit() {
    if (!confirm('조행기를 종료할까요?')) return;
    window.close();
    // 탭이 닫혔다면 아래 줄은 실행되지 않는다. 여기까지 왔다면 브라우저가 막은 것.
    alert('브라우저가 창 닫기를 막았습니다. 탭을 직접 닫아 주세요.');
  }

  // 페이지 버튼에 쓸 번호 목록. totalPages 가 3 이면 [1, 2, 3]
  // Array.from({ length: 3 }, (_, i) => i + 1) → [1, 2, 3]
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
            {page === 1 ? '아직 기록이 없습니다. [조행기 추가]로 첫 기록을 남겨 보세요.' : '이 페이지에는 기록이 없습니다.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {/* 카드 1개 = 기록 1건. key 는 React 가 카드를 구분하는 값이라 겹치지 않는 id 를 쓴다 */}
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
