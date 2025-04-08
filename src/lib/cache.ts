// src/lib/cache.ts
import NodeCache from "node-cache";

// 캐시 설정:
// stdTTL: 기본 TTL(Time To Live) 초 단위. 0이면 만료되지 않음.
// checkperiod: 만료된 캐시 항목을 확인하는 주기(초).
const cache = new NodeCache({
  stdTTL: 300, // 기본 TTL 5분 (300초)
  checkperiod: 60, // 1분마다 만료된 캐시 검사
  useClones: false, // 성능을 위해 복제본 대신 직접 참조 사용 (캐시된 객체 수정 시 주의!)
});

console.log("In-memory cache initialized.");

export default cache;
