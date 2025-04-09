// src/shared/cache.ts
import NodeCache from "node-cache";
import config from "./config";

const { stdTTL, checkperiod } = config.cache;

const cache = new NodeCache({
  stdTTL: stdTTL, // 기본 TTL (초)
  checkperiod: checkperiod, // 만료된 캐시 검사 주기 (초)
  useClones: false, // 성능을 위해 복제본 대신 직접 참조 사용 (캐시된 객체 수정 시 주의!)
  deleteOnExpire: true, // 만료 시 자동 삭제
});

console.log(
  `In-memory cache initialized (stdTTL: ${stdTTL}s, checkperiod: ${checkperiod}s).`,
);

export default cache;
