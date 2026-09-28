09/28(월)
파일 : src/app/records/page.tsx

하는 일 :
mongoDB에 저장된 조행기 데이터를 가져와서 목록UI로 보여준다.
DB에 저장된 데이터를 바탕으로 10개 목록에 1페이지씩 저장하고,
서버로부터 JSON형식의 데이터를 받아 목록박스 데이터를 넣어 보여주고,
if (ignore) return으로 Race Condition(비동기 경쟁 상태) 버그를 막을 수 있게 했고
useEffect 뒤에 [page]를 넣어 다른 페이지 클릭 시 새로운 페이를 실행시켜준다.

