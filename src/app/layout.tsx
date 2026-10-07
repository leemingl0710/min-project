// 최상위 레이아웃: 모든 화면을 감싸는 "틀"
//
// Next.js(App Router)에서 src/app/layout.tsx 는 특별한 파일이다.
// 목록(/), 등록(/records/new) 등 어떤 화면을 열든 항상 이 파일이 바깥을 감싼다.
//
//   <html>
//     <body>
//       {children}   ← 여기에 각 화면(page.tsx)의 내용이 들어간다
//     </body>
//   </html>
//
// 그래서 "모든 화면에 공통으로 필요한 것"(전체 CSS, 글꼴, 탭 제목 등)을 여기에 둔다.
// 이 파일은 create-next-app 이 자동으로 만든 것에서 탭 제목과 언어(lang)만 바꿨다.

// Metadata: 탭 제목·설명 같은 페이지 정보의 "타입". (import type = 타입만 가져온다는 뜻)
import type { Metadata } from "next";
// localFont: 프로젝트 안에 있는 글꼴 파일을 불러오는 Next.js 기능
import localFont from "next/font/local";
// 앱 전체에 적용되는 CSS. Tailwind 설정과 배경색·글자색이 들어 있다.
// 여기서 한 번 불러오면 모든 화면에 적용된다.
import "./globals.css";

// ── 글꼴 불러오기 ──
// Geist: Vercel 이 만든 글꼴. 파일은 src/app/fonts 폴더에 들어 있다.
const geistSans = localFont({
  src: "./fonts/GeistVF.woff", // 일반 글꼴 파일
  // 이 글꼴을 CSS 변수 이름으로 등록한다. CSS 에서 var(--font-geist-sans) 로 쓸 수 있다.
  variable: "--font-geist-sans",
  // "100 900": 가는 글씨(100)부터 굵은 글씨(900)까지 한 파일에 다 들어 있다는 뜻
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff", // 고정폭 글꼴 (코드처럼 글자 너비가 모두 같은 글꼴)
  variable: "--font-geist-mono",
  weight: "100 900",
});
// 참고: 글꼴을 "등록"만 했고 실제로 쓰는 곳은 없다.
// globals.css 의 body 가 font-family: Arial 로 정해져 있어서, 지금 화면 글꼴은 Arial(한글은 시스템 기본 글꼴)이다.

// ── 탭 제목과 설명 ──
// export const metadata 라고 쓰면 Next.js 가 알아서 <head> 안에 넣어 준다.
//  - title       : 브라우저 탭에 보이는 제목
//  - description : 검색 엔진 등에 보이는 설명
export const metadata: Metadata = {
  title: "오늘의 낚시 조행기",
  description: "낚시 다녀온 날의 기록(날짜·위치·조과·장비)을 남기고 다시 보는 조행기 앱",
};

// ── 레이아웃 컴포넌트 ──
// children: 이 레이아웃 안에 들어갈 화면 내용. Next.js 가 주소에 맞는 page.tsx 를 넣어 준다.
//   예) 주소가 /records/new 이면 children = src/app/records/new/page.tsx 의 화면
// Readonly<{ ... }>: 받은 값을 이 안에서 바꾸지 않겠다는 표시 (TypeScript)
// React.ReactNode: 화면에 그릴 수 있는 것 아무거나 (태그, 글자, 컴포넌트 등)
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang: 이 페이지가 어떤 언어인지 브라우저에 알려 준다. (번역 제안, 화면 읽기 프로그램이 참고)
    // 화면이 한국어라서 "ko"
    <html lang="ko">
      <body
        // geistSans.variable / geistMono.variable : 위에서 등록한 글꼴 변수를 body 에 붙인다.
        //   (붙여야 그 안에서 var(--font-geist-sans) 를 쓸 수 있다)
        // antialiased : 글자 테두리를 부드럽게 보이게 하는 Tailwind 클래스
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* 각 화면(page.tsx)의 내용이 이 자리에 들어간다 */}
        {children}
      </body>
    </html>
  );
}
