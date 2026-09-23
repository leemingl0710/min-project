// 조행기 데이터 모델
//
// 조행기 1건 = MongoDB `trips` 컬렉션의 문서 1개.
// 등록 화면에서 입력한 값이 이 모양 그대로 저장되고,
// 목록/상세 화면은 이 모양을 꺼내서 보여준다.
//
// 저장 예시 (MongoDB에 들어가는 문서 하나):
// {
//   _id: "66f1...",
//   date: "2026-09-28",
//   place: "영종도 선착장",
//   title: "가을 우럭 첫 출조",
//   time: "05:30 ~ 11:00",
//   weather: "맑음",
//   catches: [
//     { species: "우럭", count: 3 },
//     { species: "노래미", count: 1 }
//   ],
//   maxSize: 28,
//   gear: { rod: "OO 루어대 7.6ft", reel: "2500번", line: "PE 0.8호", bait: "웜" },
//   memo: "물때가 안 맞아서 오전엔 입질이 없었다...",
//   photos: ["https://.../photo1.jpg"],
//   createdAt: 2026-09-28T03:00:00.000Z
// }

// 잡은 물고기 한 종류.
// 하루에 여러 종류를 잡을 수 있어서 배열(catches)에 이 모양을 여러 개 넣는다.
// 등록 화면에서 "어종 추가"를 누르면 배열에 하나가 늘어난다.
export type Catch = {
  species: string; // 어종 (예: "우럭")
  count: number; // 그 어종을 몇 마리 잡았는지. 나중에 합계를 내야 해서 숫자로 저장
};

// 장비 4가지.
// 상세 화면에서 "장비" 한 줄로 묶어서 보여주기 때문에 객체 하나로 묶었다.
export type Gear = {
  rod: string; // 로드
  reel: string; // 릴
  line: string; // 라인 (예: "PE 0.8호")
  bait: string; // 미끼 (예: "웜", "크릴")
};

// 조행기 1건
export type Trip = {
  // MongoDB가 저장할 때 자동으로 만들어 주는 고유 번호.
  // 상세 주소 /trips/[id] 의 [id] 자리에 들어간다.
  // DB 안에서는 ObjectId라는 특별한 타입이지만, 화면으로 넘길 때는 글자로 바꿔서 쓴다.
  _id: string;

  // ── 상단(제목 영역): 목록 카드에도 나오는 값 ──
  date: string; // 날짜. 글자로 저장 (예: "2026-09-28")
  place: string; // 위치. 글자로 저장 (예: "영종도 선착장")
  title: string; // 제목

  // ── 중단 1번째 줄 ──
  time: string; // 시간. 시작~끝을 글자 그대로 (예: "05:30 ~ 11:00")
  weather: string; // 날씨. 글자로 저장 (예: "맑음"). 목록 카드에도 나온다

  // ── 중단 2번째 줄 ──
  catches: Catch[]; // 어종 + 마릿수 목록. 꽝인 날은 빈 배열 []
  maxSize: number; // 가장 큰 물고기 크기(cm). 크기 순 정렬을 하려면 숫자여야 한다. 꽝이면 0

  // ── 중단 3번째 줄 ──
  gear: Gear; // 로드, 릴, 라인, 미끼

  // ── 중단 4번째: 박스형 텍스트 ──
  memo: string; // 위 칸에 안 들어가는 나머지 내용을 자유롭게. 여러 줄 가능

  // ── 중단 5번째: 사진 ──
  // 사진 파일 자체가 아니라, 사진이 저장된 "주소(URL)"만 저장한다.
  // 첫 번째 사진(photos[0])을 목록 카드의 작은 사진으로 쓴다.
  // 사진이 없으면 빈 배열 []
  photos: string[];

  // 저장한 시각. 서버가 저장할 때 자동으로 넣는다.
  // 같은 날짜의 기록이 여러 개일 때 순서를 정하는 데 쓴다.
  createdAt: Date;
};

// 등록 화면에서 서버로 보내는 값.
// _id와 createdAt은 저장할 때 서버/DB가 만들어 주므로, 입력하는 쪽에서는 뺀다.
// (Omit<A, 'x'> = "A에서 x를 뺀 타입")
export type TripInput = Omit<Trip, '_id' | 'createdAt'>;

// 목록 카드 1개에 필요한 값.
// 목록에서는 날짜·위치·날씨·제목·사진만 보여주므로, 기록 전체(Trip)가 아니라
// 이 칸들만 보낸다. (필요 없는 memo, gear 등까지 보내면 느려지기만 한다)
export type TripListItem = {
  id: string; // 카드를 누르면 /records/[id] 로 이동할 때 쓰는 번호
  date: string;
  place: string;
  weather: string;
  title: string;
  thumbnail: string | null; // 대표 사진 주소 (photos[0]). 사진이 없으면 null
};

// 목록 API(GET /api/records?page=1)가 돌려주는 값 전체.
// 카드 10개 + 페이지 버튼을 그리는 데 필요한 숫자들.
export type TripListResponse = {
  items: TripListItem[]; // 이번 페이지의 카드들 (최대 10개)
  page: number; // 지금 페이지 번호 (1부터 시작)
  totalPages: number; // 전체 페이지 수. 기록이 하나도 없으면 0
  total: number; // 전체 기록 수
};
