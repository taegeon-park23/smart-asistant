// src/features/documents/chunking.ts
import config from "@/shared/config";

const { chunkSize, chunkOverlap } = config.textProcessing;

/**
 * 텍스트를 주어진 크기와 겹침(overlap)으로 청크 분할합니다. (단순 문자열 기반)
 * 참고: 실제 운영 환경에서는 토큰 기반 분할기 (예: LangChain, LlamaIndex) 사용을 강력히 권장합니다.
 *
 * @param text - 분할할 전체 텍스트
 * @param size - 각 청크의 목표 크기 (문자 수)
 * @param overlap - 인접 청크 간 겹치는 문자 수
 * @returns 청크 문자열 배열
 */
export function simpleChunkText(
  text: string,
  size: number = chunkSize,
  overlap: number = chunkOverlap,
): string[] {
  if (!text) return [];
  if (size <= overlap) {
    console.warn(
      "Chunk overlap should be smaller than chunk size. Using overlap = 0.",
    );
    overlap = 0;
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + size, text.length);
    chunks.push(text.slice(startIndex, endIndex));

    // 다음 시작 위치 계산 (겹침 고려)
    startIndex += size - overlap;
    if (startIndex >= text.length) break; // 이미 끝에 도달했으면 종료
    if (startIndex < endIndex) {
      // 겹침이 너무 커서 앞으로 이동하지 못하는 경우 방지
      startIndex =
        endIndex - overlap > startIndex ? endIndex - overlap : startIndex + 1;
    }
  }

  // 마지막 청크가 너무 짧으면 이전 청크와 병합하거나, 그대로 둘지 결정 필요
  // 여기서는 일단 그대로 둠

  console.log(
    `Split text into ${chunks.length} chunks (size: ${size}, overlap: ${overlap})`,
  );
  return chunks.filter((chunk) => chunk.trim().length > 0); // 빈 청크 제거
}
