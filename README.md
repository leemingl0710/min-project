# 오늘의 낚시 조행기

낚시 다녀온 날의 기록(날짜·위치·시간·날씨·조과·장비·메모)을 남기고, 목록과 상세 화면에서 다시 보는 웹 앱입니다.

- 기술: Next.js 14 (App Router), TypeScript, Tailwind CSS, MongoDB Atlas
- 기획 문서: [`docs/spec.md`](docs/spec.md)
- 공부 기록: [`NOTE.md`](NOTE.md)

## 화면

| 화면 | 주소 | 하는 일 |
| --- | --- | --- |
| 목록 | `/` (예: `/?page=2`) | 기록을 날짜 최신순으로 10개씩 보여준다 |
| 등록 | `/records/new` | 새 기록을 입력해서 저장한다 |
| 상세 | `/records/[id]` | 기록 1건을 자세히 보여주고, 삭제할 수 있다 |

## API

| 방식 | 주소 | 하는 일 |
| --- | --- | --- |
| GET | `/api/records?page=1` | 목록 (10개씩) |
| POST | `/api/records` | 새 기록 저장 |
| GET | `/api/records/[id]` | 기록 1건 |
| DELETE | `/api/records/[id]` | 기록 1건 삭제 |

## 실행 방법

1. 패키지 설치

   ```bash
   npm install
   ```

2. 프로젝트 맨 위 폴더에 `.env.local` 파일을 만들고 환경변수를 적는다.

   ```bash
   MONGODB_URI=mongodb+srv://아이디:비밀번호@클러스터주소/
   MONGODB_DB=fishing-log
   ```

   | 이름 | 필수 | 설명 |
   | --- | --- | --- |
   | `MONGODB_URI` | ✅ | MongoDB Atlas 접속 주소. Atlas 화면의 Connect → Drivers 에서 복사한다 |
   | `MONGODB_DB` | | 사용할 데이터베이스 이름. 없으면 `fishing-log` |

   `.env.local` 에는 비밀번호가 들어 있어서 git 에 올리지 않는다. (`.gitignore` 에 들어 있음)

3. 개발 서버 실행

   ```bash
   npm run dev
   ```

   브라우저에서 [http://localhost:3000](http://localhost:3000) 을 연다.

## 폴더 구조

```
src/
  app/
    page.tsx                  목록 화면
    records/new/page.tsx      등록 화면
    records/[id]/page.tsx     상세 화면
    api/records/route.ts      목록(GET), 등록(POST) API
    api/records/[id]/route.ts 상세(GET), 삭제(DELETE) API
  lib/mongodb.ts              MongoDB 접속
  types/trip.ts               조행기 데이터 모양(타입)
```
