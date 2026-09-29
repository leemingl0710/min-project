09/28(월)
파일 : src/app/records/page.tsx

하는 일 :
mongoDB에 저장된 조행기 데이터를 가져와서 목록UI로 보여준다.
DB에 저장된 데이터를 바탕으로 10개 목록에 1페이지씩 저장하고,
서버로부터 JSON형식의 데이터를 받아 목록박스 데이터를 넣어 보여주고,
if (ignore) return으로 Race Condition(비동기 경쟁 상태) 버그를 막을 수 있게 했고
useEffect 뒤에 [page]를 넣어 다른 페이지 클릭 시 새로운 페이를 실행시켜준다.

09/29(화)
파일 : src/app/api/records/[id]/route.ts

하는 일 :
클라이언트가 상세페이지를 클릭 시 MongoDB에서 상세페이지에 대한 ID 값을 받아와
규칙이 맞는지 확인하고 규칙이 맞을 시 MongoDB ID와 묶여있는 값을 전부 가져와
TripDetaily type에 형식을 맞춰 body에 저장하고 클라이언트로 넘겨준다.


