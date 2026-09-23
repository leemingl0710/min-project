// 등록 화면: /records/new
//
// 화면 구성
//  - 상단: 제목, 날짜, 위치, 시간, 날씨
//  - 중단: 어종/마릿수 ([어종 추가]로 줄 늘리기), 최대어 크기
//          장비(로드, 릴, 라인, 미끼), 자유 텍스트 박스, 사진 첨부
//  - 하단: 왼쪽 [뒤로 가기], 오른쪽 [저장]
//
// [저장]을 누르면 입력값을 모아 POST /api/records 로 보내고,
// 저장이 끝나면 목록 화면(/)으로 이동한다.

// 입력할 때마다 값이 바뀌는 화면(useState)이라 브라우저에서 돌아가야 한다.
// 이 줄이 있어야 useState, onClick 같은 걸 쓸 수 있다.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Catch, Gear } from '@/types/trip';

// 입력칸 안에서는 숫자도 글자로 들고 있는다.
// (input 칸의 값은 항상 글자라서. 숫자로 바꾸는 건 서버가 저장할 때 한다)
type CatchRow = { species: string; count: string };

// 모든 입력칸에 똑같이 쓰는 Tailwind 모양
const inputClass =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';

export default function NewRecordPage() {
  // 페이지 이동(뒤로 가기, 목록으로 가기)에 쓰는 도구
  const router = useRouter();

  // ── 입력값 보관 (useState) ──
  // useState: [현재 값, 값을 바꾸는 함수]. 값이 바뀌면 화면이 다시 그려진다.

  // 상단
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('');
  const [weather, setWeather] = useState('');

  // 중단 - 조과. 처음엔 빈 줄 하나로 시작한다.
  const [catches, setCatches] = useState<CatchRow[]>([{ species: '', count: '' }]);
  const [maxSize, setMaxSize] = useState('');

  // 중단 - 장비. 4칸을 객체 하나로 들고 있다.
  const [gear, setGear] = useState<Gear>({ rod: '', reel: '', line: '', bait: '' });

  // 중단 - 자유 텍스트, 사진
  const [memo, setMemo] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);

  // 저장 중에는 버튼을 막고, 실패하면 메시지를 보여준다.
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── 조과 줄 다루기 ──

  // [어종 추가]: 기존 줄들(...catches) 뒤에 빈 줄 하나를 붙인 새 배열로 바꾼다.
  // (React는 배열을 직접 고치지 않고 "새 배열"로 바꿔야 화면이 다시 그려진다)
  function addCatch() {
    setCatches([...catches, { species: '', count: '' }]);
  }

  // [삭제]: index번째 줄만 빼고 나머지로 새 배열을 만든다.
  function removeCatch(index: number) {
    setCatches(catches.filter((_, i) => i !== index));
  }

  // 한 줄의 한 칸(어종 또는 마릿수)이 바뀌었을 때.
  // index번째 줄만 새 값으로 바꾸고, 나머지 줄은 그대로 둔다.
  function updateCatch(index: number, field: keyof CatchRow, value: string) {
    setCatches(catches.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  // 장비 4칸 중 하나가 바뀌었을 때. 나머지 3칸은 그대로(...gear) 두고 그 칸만 바꾼다.
  function updateGear(field: keyof Gear, value: string) {
    setGear({ ...gear, [field]: value });
  }

  // ── 저장 ──
  async function handleSubmit(e: React.FormEvent) {
    // form의 기본 동작(페이지 새로고침)을 막는다. 우리가 fetch로 직접 보낼 거라서.
    e.preventDefault();
    setError('');
    setSaving(true);

    // 화면에서 들고 있던 글자 값을 저장할 모양으로 바꾼다.
    // 마릿수는 여기서 숫자로 바꾼다 (Catch 타입은 count가 number).
    const catchList: Catch[] = catches.map((c) => ({
      species: c.species,
      count: Number(c.count) || 0,
    }));

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

    // 사진 파일은 JSON에 못 넣어서 FormData에 따로 담는다.
    //  - "data"   : 글자 값 전부를 JSON 문자열로
    //  - "photos" : 사진 파일 하나하나
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    photos.forEach((file) => formData.append('photos', file));

    try {
      const res = await fetch('/api/records', { method: 'POST', body: formData });

      if (!res.ok) {
        // 서버가 돌려준 에러 메시지를 보여준다.
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? '저장에 실패했습니다.');
      }

      // 저장 성공 → 목록 화면으로 이동
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">조행기 작성</h1>

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
              {/* 요구사항대로 달력 대신 글자로 입력 */}
              <input
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="2026-09-28"
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
            <label className="flex flex-col gap-1 text-sm">
              시간
              <input
                className={inputClass}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="05:30 ~ 11:00"
              />
            </label>
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

        {/* ───────── 중단 4: 사진 첨부 ───────── */}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">사진</h2>
          {/* accept="image/*": 사진 파일만 고를 수 있게
              multiple: 여러 장 한 번에 고르기 */}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
            className="text-sm"
          />
          {/* 고른 사진 이름 목록. 첫 번째 사진이 목록 카드의 대표 사진이 된다. */}
          {photos.length > 0 && (
            <ul className="text-sm text-gray-600">
              {photos.map((file, i) => (
                <li key={i}>
                  {file.name}
                  {i === 0 && ' (대표)'}
                </li>
              ))}
            </ul>
          )}
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
