// MongoDB 접속 코드
//
// 한 번 접속해 둔 연결(client)을 계속 다시 쓰기 위한 파일.
// API가 요청마다 새로 접속하면 느리고 연결이 계속 쌓이기 때문에,
// 처음 한 번만 접속하고 그 뒤로는 만들어 둔 연결을 돌려준다.
//
// 어디에 접속하는지는 코드가 아니라 .env.local 의 MONGODB_URI 가 정한다.
//  - MongoDB Atlas(클라우드) : mongodb+srv://아이디:비밀번호@cluster0.xxxx.mongodb.net/...
//  - 내 컴퓨터의 MongoDB     : mongodb://localhost:27017
// 그래서 Atlas ↔ 내 컴퓨터를 바꿀 때 이 파일은 고칠 필요가 없다. .env.local 만 바꾸면 된다.
//
// 사용하는 곳: src/app/api/records/route.ts (저장 POST, 목록 GET)

import { MongoClient, Db } from 'mongodb';

// .env.local 에 적어 둔 값을 읽는다. (git에 올라가지 않는 파일)
// 지금 값: Atlas 주소 (아이디·비밀번호가 들어 있어서 절대 코드에 직접 적지 않는다)
const uri = process.env.MONGODB_URI;
// DB 이름. 안 적었으면 "fishing-log"를 쓴다.
// Atlas 안에서도 이 이름의 DB 가 없으면 처음 저장할 때 자동으로 만들어진다.
const dbName = process.env.MONGODB_DB ?? 'fishing-log';

// 개발 모드(npm run dev)에서는 파일을 고칠 때마다 이 파일이 다시 실행된다.
// 그때마다 새로 접속하지 않도록, 파일이 다시 실행돼도 사라지지 않는
// globalThis(전역 공간)에 연결을 보관해 둔다.
const globalForMongo = globalThis as unknown as {
  mongoClientPromise?: Promise<MongoClient>;
};

// DB 객체를 돌려주는 함수. API에서는 이것만 불러 쓰면 된다.
//   const db = await getDb();
//   db.collection('trips').insertOne(...)
export async function getDb(): Promise<Db> {
  if (!uri) {
    // .env.local 을 안 만들었거나 오타가 있으면 여기서 바로 알려 준다.
    throw new Error('.env.local 에 MONGODB_URI 가 없습니다.');
  }

  // 아직 접속한 적이 없을 때만 새로 접속한다.
  if (!globalForMongo.mongoClientPromise) {
    globalForMongo.mongoClientPromise = new MongoClient(uri, {
      // 접속할 서버를 찾을 때 기다리는 최대 시간(ms). 기본값은 30초라서
      // DB에 못 닿으면 [저장]을 누르고 한참 멈춰 있게 된다. 5초만 기다리고 실패로 처리한다.
      // Atlas 는 인터넷 너머에 있어서 내 컴퓨터 DB보다 조금 느리지만, 5초면 충분하다.
      serverSelectionTimeoutMS: 5000,
    }).connect();
  }

  try {
    const client = await globalForMongo.mongoClientPromise;
    return client.db(dbName);
  } catch (err) {
    // 접속에 실패하면 보관해 둔 "실패한 연결"을 지운다.
    // 이걸 안 지우면 문제를 고친 뒤에도(예: 비밀번호 수정, 인터넷 재연결),
    // 서버를 재시작하기 전까지 계속 옛날 실패 결과를 돌려준다.
    // 지워 두면 다음 요청 때 다시 접속을 시도한다.
    //
    // Atlas 접속이 실패하는 흔한 이유
    //  1) 비밀번호가 틀림                     → 터미널에 "bad auth : authentication failed"
    //  2) Atlas 의 Network Access 에 내 IP 가 없음 → 터미널에 "Server selection timed out"
    //  3) 인터넷이 끊김
    globalForMongo.mongoClientPromise = undefined;
    throw err;
  }
}
