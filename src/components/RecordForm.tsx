// 조행기 입력 폼 (등록 화면과 수정 화면이 같이 쓰는 부품)
//
//  - 등록 화면(records/new/page.tsx)  : 빈 칸으로 시작 → POST /api/records 로 저장
//  - 수정 화면(records/[id]/edit/page.tsx) : 저장된 값을 채운 채로 시작 → PUT /api/records/아이디 로 저장
// 두 화면의 입력칸이 똑같아서, 폼을 한 번만 만들고 props 로 다른 부분만 넘겨받는다.
//
// 화면 구성
//  - 상단: 제목, 날짜, 위치, 시간, 날씨
//  - 중단: 어종/마릿수 ([어종 추가]로 줄 늘리기), 최대어 크기
//          장비(로드, 릴, 라인, 미끼), 자유 텍스트 박스
//  - 하단: 왼쪽 [뒤로 가기], 오른쪽 [저장]
//
// [저장]을 누르면 입력값을 모아 props 로 받은 주소(url)와 방식(method)으로 보내고,
// 저장이 끝나면 doneHref 화면으로 이동한다.

// 입력할 때마다 값이 바뀌는 화면(useState)이라 브라우저에서 돌아가야 한다.
// 이 줄이 있어야 useState, onClick 같은 걸 쓸 수 있다.
'use client';

//화면에서 변경되는 데이터를 저장하고, 값이 변하면 화면을 다시 그리게 하는 것
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Catch, Gear, TripInput } from '@/types/trip';
import { TIME_PATTERN } from '@/lib/tripInput';

// 이 폼을 쓰는 화면이 넘겨주는 값
type Props = {
  heading: string; // 맨 위 제목 (예: "조행기 작성", "조행기 수정")
  initial?: TripInput; // 처음에 채워 둘 값. 없으면(등록 화면) 빈 칸으로 시작
  method: 'POST' | 'PUT'; // 저장할 때 쓸 요청 방식
  url: string; // 저장할 때 보낼 API 주소
  doneHref: string; // 저장이 끝나면 이동할 화면
};

// 입력칸 안에서는 숫자도 글자로 들고 있는다.
// (input 칸의 값은 항상 글자라서. 숫자로 바꾸는 건 서버가 저장할 때 한다)
// type 형태의 CatchRow안에 species랑 count변수
type CatchRow = { species: string; count: string };

// 모든 입력칸에 똑같이 쓰는 Tailwind 모양
const inputClass =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';

export default function RecordForm({ heading, initial, method, url, doneHref }: Props) {
  // 페이지 이동(뒤로 가기, 목록으로 가기)에 쓰는 도구
  //push, replace, back 같은 이동함수를 사용할 수 있게 해주는 라우팅 제어 모듈
  const router = useRouter();

  // ── 입력값 보관 (useState) ──
  // useState: [현재 값, 값을 바꾸는 함수]. 값이 바뀌면 화면이 다시 그려진다.
  // 처음 값: initial 이 있으면(수정 화면) 그 값, 없으면(등록 화면) 빈 값.
  // useState 의 처음 값은 화면이 처음 그려질 때 한 번만 쓰인다.
  // 그래서 수정 화면은 기록을 다 불러온 뒤에 이 폼을 그린다.

  // 저장된 시간 "05:30 ~ 11:00" 을 시작·끝으로 나눈다.
  // 시간 형식을 정하기 전에 자유롭게 적은 시간(예: "새벽")은 나눌 수 없어서 빈 칸으로 시작한다.
  const timeMatch = TIME_PATTERN.exec(initial?.time ?? '');

  // 상단  / 구조 분해 할당
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const [place, setPlace] = useState(initial?.place ?? '');
  // 시간은 시작·끝을 따로 고르고, 저장할 때 "05:30 ~ 11:00" 한 줄로 합친다
  const [startTime, setStartTime] = useState(timeMatch?.[1] ?? '');
  const [endTime, setEndTime] = useState(timeMatch?.[2] ?? '');
  const [weather, setWeather] = useState(initial?.weather ?? '');

  // 중단 - 조과. 입력칸은 글자로 들고 있어서 count 를 글자로 바꾼다.
  // 저장된 조과가 없으면(꽝 또는 등록 화면) 빈 줄 하나로 시작한다.
  const [catches, setCatches] = useState<CatchRow[]>(
    initial && initial.catches.length > 0
      ? initial.catches.map((c) => ({ species: c.species, count: String(c.count) }))
      : [{ species: '', count: '' }],
  );
  // maxSize 0 은 "안 적음"이라 빈 칸으로 보여준다
  const [maxSize, setMaxSize] = useState(initial?.maxSize ? String(initial.maxSize) : '');

  // 중단 - 장비. 4칸을 객체 하나로 들고 있다.
  const [gear, setGear] = useState<Gear>(initial?.gear ?? { rod: '', reel: '', line: '', bait: '' });

  // 중단 - 자유 텍스트
  const [memo, setMemo] = useState(initial?.memo ?? '');

  // 저장 중에는 버튼을 막고, 실패하면 메시지를 보여준다.
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── 조과 줄 다루기 ──

  // [어종 추가]: 기존 줄들(...catches) 뒤에 빈 줄 하나를 붙인 새 배열로 바꾼다.
  // (React는 배열을 직접 고치지 않고 "새 배열"로 바꿔야 화면이 다시 그려진다)
  function addCatch() {
    //어종 추가 버튼 클릭 시 {}을 늘려주고
    //...catches가 {}안에 값들을 배열 형태로 저장하고 그 자체가 setCatches의 매개변수로 들어감
    setCatches([...catches, { species: '', count: '' }]);
  } // 스프레드의 원리는 shellow Copy

  // [삭제]: index번째 줄만 빼고 나머지로 새 배열을 만든다.
  // 지우려고하는 catches의 인덱스 값을 받아서 catches.filter을 이용해 지우려는 데이터를 제외하고
  // 남은 데이터들로 새로운 배열을 만들어서 저장
  function removeCatch(index: number) {
    // 배열.filter((항목, 인덱스) => {return 조건식;})
    //배열에서 하나씩 꺼낸 실제 데이터 값 / 인덱스 : 매개변수 or 선택
	  //return : 조건식이 true가 되는 항목만 살려서 새로운 배열에 담는다.
    setCatches(catches.filter((_, i) => i !== index));
  }

  // 한 줄의 한 칸(어종 또는 마릿수)이 바뀌었을 때.
  // index번째 줄만 새 값으로 바꾸고, 나머지 줄은 그대로 둔다.
  // field: keyof CatchRow 는 'species' 나 'count' 만 넣을 수 있다는 TypeScript 표시.
  // 코드를 작성·빌드할 때 검사하는 것이고, 실행 중에는 아무것도 검사하지 않는다.
  // map을 이용해 배열 길이만큼 루프
  // i가 인덱스와 일치하는지 확인 스프레드를 이용해 열에 있는 field(키)에 value 값을 넣고 반환
  // 일치하지 않는 줄일 때는 기존 데이터 반환
  function updateCatch(index: number, field: keyof CatchRow, value: string) {
    setCatches(catches.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  // 장비 4칸 중 하나가 바뀌었을 때. 나머지 3칸은 그대로(...gear) 두고 그 칸만 바꾼다.
  // field: keyof Gear 는 'rod' | 'reel' | 'line' | 'bait' 만 넣을 수 있다는 표시 (빌드할 때 TypeScript가 검사)
  function updateGear(field: keyof Gear, value: string) {
    //gear 객체를 스프레드로 복사하고, 바뀐 칸(field)만 새 값으로 덮어써서 setGear에 저장
    setGear({ ...gear, [field]: value });
  }

  // ── 저장 ──
  // 폼 제출 이벤트가 발생했을 때 실행되는 함수
  async function handleSubmit(e: React.FormEvent) {
    // form의 기본 동작(페이지 새로고침)을 막는다. 우리가 fetch로 직접 보낼 거라서.
    e.preventDefault();
    // 기본값 세팅
    setError('');
    setSaving(true);

    // 화면에서 들고 있던 글자 값을 저장할 모양으로 바꾼다.
    // 마릿수는 여기서 숫자로 바꾼다 (Catch 타입은 count가 number).
    // Const catchList : Catch[] - catchList는 Catch라는 객체들이 들어있는 배열 형태여야한다.
    // catches.map을 이용해 줄마다 함수를 한 번씩 실행한다. c는 인덱스가 아니라 각 줄의 객체({ species, count })다.
    // 클라이언트로부터 입력 받은 값을 서버로 보내기 위해 CatchLow에 species키에 c.species를 넣는 코드
    // 카운트에는 입력 받은 숫자를 Number형태로 저장 / false일 때 0
    const catchList: Catch[] = catches.map((c) => ({
      species: c.species,
      count: Number(c.count) || 0,
    }));

    // 시작·끝을 둘 다 골랐을 때만 "05:30 ~ 11:00" 모양으로 합친다. 안 골랐으면 빈 글자
    // (하나만 고르면 아래 입력칸의 required 때문에 여기까지 오지 않는다)
    const time = startTime && endTime ? `${startTime} ~ ${endTime}` : '';

    const data = {
      title,
      date,
      place,
      time,
      weather,
      catches: catchList,
      maxSize: Number(maxSize) || 0,
      gear,
      memo,
    };

    try {
      // JSON.stringify: 객체를 JSON 글자로 바꾼다. (네트워크로는 글자만 보낼 수 있어서)
      // Content-Type 헤더: 서버에게 "이건 JSON 이야" 하고 알려 준다.
      // fetch는 데이터를 보낼 주소 (등록: /api/records, 수정: /api/records/아이디)
      const res = await fetch(url, {
        // POST - body에 담긴 data로 새로운 records 항목을 '생성'해 줘!라는 의미
        // PUT  - 이 주소의 기록을 body에 담긴 data로 '바꿔' 줘!라는 의미
        // method를 지정하지 않으면 GET으로 인식
        method,
        //body가 json형태여서 Content-Type을 사용해 미리 서버에 알려주는 코드
        //서버가 들어오는 본문 데이터를 어떻게 파싱할지 미리 준비해야하기 때문에 사용함
        headers: { 'Content-Type': 'application/json' },
        // data를 JSON형태로 변환함
        // 네트워크로 전송할 때, js 변수 상자 그 자체로 보낼 수 없고 오직 글자만 전송 가능
        body: JSON.stringify(data),
      });

      if (!res.ok) { // 주소가 들어오지 않으면
        // 서버가 돌려준 에러 메시지를 보여준다.
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? '저장에 실패했습니다.');
      }

      // 저장을 성공하면 doneHref 화면으로 이동 (등록: 목록, 수정: 그 기록의 상세 화면)
      // replace: 지금 주소(입력 폼)를 바꿔치기해서, 이동한 화면에서 [뒤로 가기]를 눌러도 입력 폼으로 돌아오지 않게
      router.replace(doneHref);
    } catch (err) {
      //잡힌 에러(err)가 자바스크립트의 진짜 Error 클래스로 만들어진 표준 에러 객체인지 확인하고 맞으면 표준 메시지
      //아닐 경우 text 메시지
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">{heading}</h1>

      {/* onSubmit: [저장] 버튼(type="submit")을 누르면 handleSubmit 실행 */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* ───────── 상단: 기본 정보 ───────── */}
        <section className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            제목 *
            {/* required: 비어 있으면 브라우저가 저장을 막는다 */}
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="가을 우럭 첫 출조"
              required
            />
          </label>

          {/* 날짜·위치를 한 줄에 두 칸으로 */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              날짜 *
              {/* type="date": 달력에서 날짜를 고른다. 값은 항상 "2026-09-28"(YYYY-MM-DD) 모양으로 들어온다 */}
              <input
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              위치 *
              <input
                className={inputClass}
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="영종도 선착장"
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* type="time": 시각을 고르는 칸. 값은 항상 "05:30"(HH:MM, 24시간) 모양으로 들어온다.
                시간은 선택 입력이지만, 한쪽만 고르면 "~ 11:00" 처럼 반쪽이 되므로
                한쪽을 고르면 다른 쪽도 required 가 된다 */}
            <div className="flex flex-col gap-1 text-sm">
              시간
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  aria-label="시작 시간"
                  className={inputClass}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required={endTime !== ''}
                />
                <span>~</span>
                <input
                  type="time"
                  aria-label="끝 시간"
                  className={inputClass}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required={startTime !== ''}
                />
              </div>
              {/* 예전에 자유롭게 적은 시간은 위 칸에 채울 수 없어서, 무엇이었는지 알려 준다 */}
              {initial?.time && !timeMatch && (
                <span className="text-xs text-gray-500">기존 입력: {initial.time} (다시 골라 주세요)</span>
              )}
            </div>
            <label className="flex flex-col gap-1 text-sm">
              날씨
              <input
                className={inputClass}
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                placeholder="맑음"
              />
            </label>
          </div>
        </section>

        {/* ───────── 중단 1: 조과 ───────── */}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">조과</h2>

          {/* catches 배열의 줄 수만큼 입력줄을 그린다.
              key: React가 줄을 구분하는 번호. 여기선 순서(index)를 쓴다. */}
          {catches.map((row, index) => (
            <div key={index} className="flex gap-2">
              <input
                className={inputClass}
                value={row.species}
                onChange={(e) => updateCatch(index, 'species', e.target.value)}
                placeholder="어종 (예: 우럭)"
              />
              <input
                className={`${inputClass} w-28`}
                type="number"
                min="0"
                value={row.count}
                onChange={(e) => updateCatch(index, 'count', e.target.value)}
                placeholder="마릿수"
              />
              {/* type="button": 이게 없으면 form 안의 버튼은 누를 때 저장(submit)이 돼 버린다 */}
              <button
                type="button"
                onClick={() => removeCatch(index)}
                className="shrink-0 rounded border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-100"
              >
                삭제
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addCatch}
            className="self-start rounded border border-blue-500 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
          >
            + 어종 추가
          </button>

          <label className="flex flex-col gap-1 text-sm">
            최대어 크기 (cm)
            <input
              className={`${inputClass} w-40`}
              type="number"
              min="0"
              step="0.1"
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              placeholder="28"
            />
          </label>
        </section>

        {/* ───────── 중단 2: 장비 ───────── */}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">장비</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              className={inputClass}
              value={gear.rod}
              onChange={(e) => updateGear('rod', e.target.value)}
              placeholder="로드"
            />
            <input
              className={inputClass}
              value={gear.reel}
              onChange={(e) => updateGear('reel', e.target.value)}
              placeholder="릴"
            />
            <input
              className={inputClass}
              value={gear.line}
              onChange={(e) => updateGear('line', e.target.value)}
              placeholder="라인 (예: PE 0.8호)"
            />
            <input
              className={inputClass}
              value={gear.bait}
              onChange={(e) => updateGear('bait', e.target.value)}
              placeholder="미끼"
            />
          </div>
        </section>

        {/* ───────── 중단 3: 자유 텍스트 박스 ───────── */}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">내용</h2>
          {/* textarea: 여러 줄 입력칸. rows = 처음 보이는 줄 수 */}
          <textarea
            className={`${inputClass} min-h-40`}
            rows={8}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="물때, 포인트, 느낀 점 등 자유롭게"
          />
        </section>

        {/* 저장 실패 메시지 */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* ───────── 하단: 버튼 ───────── */}
        {/* justify-between: 첫 번째 버튼은 왼쪽 끝, 두 번째 버튼은 오른쪽 끝 */}
        <div className="flex justify-between border-t pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
          >
            뒤로 가기
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </main>
  );
}
