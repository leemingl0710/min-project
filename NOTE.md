09/28(월)
파일 : src/app/page.tsx

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


10/01(목)
파일 : src/app/records/[id]/page.tsx

하는 일 :
라우터를 이용해 서버로부터 응답 받은 Props타입 데이터에서 params값만 저장한 뒤 params.id에 해당하는
상세페이지에 대한 UI를 구축하고 구축한 틀에 params.id에 관련된 데이터를 틀에 맞게 데이터를 넣어
인터페이스에 전시해준다.

모르겠는 것 :
라우터로 받아온 값이 어떤 과정을 거쳐 DetailPage에 있는 매개변수에 들어가는지

10/02(금)
파일 : src/app/records/new/page.tsx

하는 일 :
조행기 형식에 맞춰 UI를 구축하고 구축한 틀에 데이터를 입력 받아
서버에 보내 조행기를 저장한다.

기타 :
1.브라우저가 제멋대로 페이지를 새로고침해서 State 데이터를 날려버리는 것을 막고,
Fetch 코드가 백그라운드에서 안전하게 데이터를 보내도록 하려고 e.preventDefault를 사용
2.HTTP프로토콜에서 서버에 무슨 행동을 할지 알려주기 위해 HTT메서드를 사용
POST, GET, PUT, DELETE 등 존재
headers: { 'Content-Type': 'application/json' }는
서버가 들어오는 본문 데이터를 어떻게 파싱할지 미리 준비해야하기 때문에 사용함
네트워크로 전송할 때, js 변수 상자 그 자체로 보낼 수 없고 오직 글자만 전송 가능하기 때문에 사용

10/07(수)
파일 src/app/records/[id]/page.tsx

추가한 부분 :
삭제하고 싶은 조행기를 삭제하는 기능
삭제 버튼을 누르게 되면 confirm을 이용해 Dialog box를 만들어내고
확인을 누를 시 조행기를 삭제하고 취소를 누를 시. 조행기를 삭제하지 않는다.

기타 :
confirm은 브라우저 내장함수
