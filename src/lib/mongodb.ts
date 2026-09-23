// MongoDB 접속 코드
//
// 한 번 접속해 둔 연결(client)을 계속 다시 쓰기 위한 파일.
// API가 요청마다 새로 접속하면 느리고 연결이 계속 쌓이기 때문에,
// 처음 한 번만 접속하고 그 뒤로는 만들어 둔 연결을 돌려준다.

import { MongoClient, Db } from 'mongodb';

// .env.local 에 적어 둔 값을 읽는다. (git에 올라가지 않는 파일)
// 예: MONGODB_URI=mongodb://localhost:27017
const uri = process.env.MONGODB_URI;
// DB 이름. 안 적었으면 "fishing-log"를 쓴다.
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
    globalForMongo.mongoClientPromise = new MongoClient(uri).connect();
  }

  const client = await globalForMongo.mongoClientPromise;
  return client.db(dbName);
}
