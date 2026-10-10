// 등록 화면: /records/new
//
// 입력칸과 [저장] 동작은 수정 화면과 같아서 RecordForm(src/components/RecordForm.tsx)에 모아 두었다.
// 이 화면은 "빈 칸으로 시작해서 POST /api/records 로 새로 저장하고, 끝나면 목록(/)으로" 라는 것만 정한다.

import RecordForm from '@/components/RecordForm';

// export default: Next.js 가 이 주소(/records/new)에서 그릴 페이지 컴포넌트
export default function NewRecordPage() {
  return <RecordForm heading="조행기 작성" method="POST" url="/api/records" doneHref="/" />;
}
