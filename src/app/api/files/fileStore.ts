// src/app/api/files/fileStore.ts

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  s3Key: string;
  // In a real app, you might add s3Key, uploadTimestamp, etc.
}

// This array acts as our temporary in-memory database.
// WARNING: Data will be lost when the server restarts!
export const fileMetadataStore: FileMetadata[] = [];
