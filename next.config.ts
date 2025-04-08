// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 기존 설정이 있다면 유지...

  // Webpack 개발 서버 설정 추가
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 개발 모드이고 클라이언트 측 번들일 때만 폴링 활성화
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000, // 1초마다 파일 변경 확인 (ms 단위)
        aggregateTimeout: 300, // 변경 후 재빌드 대기 시간 (ms 단위)
      };
    }
    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
