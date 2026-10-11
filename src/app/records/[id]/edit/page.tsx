// 수정 화면: /records/[id]/edit  (예: /records/66f1a2b3c4d5e6f7a8b9c0d1/edit)
//
// 데이터가 지나가는 길:
// 1. 상세 화면에서 [수정]을 누르면 /records/아이디/edit 로 이동하고
// 2. 화면이 열리면 useEffect 가 fetch('/api/records/아이디') 로 저장된 기록을 불러온다 (상세 화면과 같은 API)
// 3. 불러온 값을 RecordForm 에 initial 로 넘겨, 입력칸이 채워진 채로 보여준다
// 4. [저장]을 누르면 PUT /api/records/아이디 로 바뀐 값을 보내고, 끝나면 상세 화면으로 돌아간다
//
// 입력칸과 [저장] 동작은 등록 화면과 같아서 RecordForm(src/components/RecordForm.tsx)을 같이 쓴다.

// useState, useEffect 를 쓰려면 브라우저에서 돌아가야 한다.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RecordForm from '@/components/RecordForm';
import type { TripDetail } from '@/types/trip';

// Next.js 는 주소의 [id] 자리 글자를 params 로 넘겨준다. (상세 화면과 같은 방식)
type Props = {
  params: { id: string };
};

// export default: Next.js 가 이 주소(/records/[id]/edit)에서 그릴 페이지 컴포넌트
export default function EditRecordPage({ params }: Props) {
  const router = useRouter();

  const [trip, setTrip] = useState<TripDetail | null>(null); // 불러온 기록
  const [loading, setLoading] = useState(true); // 불러오는 중인지
  const [error, setError] = useState(''); // 불러오기 실패 메시지

  // ── 기록 1건 불러오기 ── (상세 화면의 useEffect 와 같은 방식)
  useEffect(() => {
    // 늦게 도착한 옛날 응답은 무시하기 위한 표시
    let ignore = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/records/${params.id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? '기록을 불러오지 못했습니다.');
        }
        const data: TripDetail = await res.json();
        if (ignore) return;
        setTrip(data);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : '기록을 불러오지 못했습니다.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [params.id]);

  // 기록을 다 불러온 뒤에만 폼을 그린다.
  // RecordForm 은 처음 그려질 때의 initial 값으로 입력칸을 채우기 때문에,
  // 불러오기 전에 그리면 빈 칸으로 시작해 버린다.
  if (loading || error || !trip) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <h1 className="mb-6 text-2xl font-bold">조행기 수정</h1>
        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : (
          <>
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-4 rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
            >
              목록으로
            </button>
          </>
        )}
      </main>
    );
  }

  return (
    <RecordForm
      heading="조행기 수정"
      initial={trip}
      method="PUT"
      url={`/api/records/${params.id}`}
      doneHref={`/records/${params.id}`}
    />
  );
}
