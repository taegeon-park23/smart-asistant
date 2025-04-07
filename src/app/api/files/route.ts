// src/app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
// fileMetadataStore는 POST에서 임시로 사용될 수 있으나 GET은 S3 직접 조회
import { fileMetadataStore, FileMetadata } from "./fileStore";
import s3Client from "@/lib/s3Client"; // Adjust path to your s3Client setup
// Import necessary S3 commands
import {
  PutObjectCommand,
  ListObjectsV2Command,
  S3Object, // _Object 대신 S3Object 사용 (SDK v3 스타일)
} from "@aws-sdk/client-s3";
import { extractTextFromFile } from "@/lib/textExtractor";

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const UPLOAD_PREFIX = "uploads/"; // Define the prefix where files are stored

// GET /api/files - Retrieve list of files directly from S3 (사용자가 제공한 버전 유지)
export async function GET(req: NextRequest) {
  if (!BUCKET_NAME) {
    console.error("S3_BUCKET_NAME environment variable is not set.");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: UPLOAD_PREFIX, // Only list objects within the 'uploads/' directory
    });

    const s3Response = await s3Client.send(listCommand);

    // Process the S3 response to create the metadata list
    const files: Omit<FileMetadata, "type">[] = (s3Response.Contents ?? [])
      // Filter out the directory marker if present and ensure Key exists
      .filter(
        (obj: S3Object) =>
          obj.Key && obj.Key !== UPLOAD_PREFIX && obj.Size !== undefined
      )
      .map((obj: S3Object) => {
        const key = obj.Key!;
        const size = obj.Size!;
        let id = "unknown-id";
        let name = key.replace(UPLOAD_PREFIX, ""); // Default name if parsing fails

        // Attempt to parse id and name from the key (format: uploads/fileId-fileName)
        const keyWithoutPrefix = key.substring(UPLOAD_PREFIX.length);
        const splitKeys = (keyWithoutPrefix as string).split("-");
        if (splitKeys.length > 2) {
          id = `${splitKeys[0]}-${splitKeys[1]}`;
          name = splitKeys[2];
        } else {
          console.warn(`Could not parse fileId and name from S3 key: ${key}`);
        }

        return {
          id: id,
          name: name,
          size: size,
          s3Key: key,
          // NOTE: 'type' (ContentType) is NOT available from ListObjectsV2
          // To get it, a separate HeadObjectCommand per file would be needed (inefficient).
        };
      });

    // Return the processed list
    return NextResponse.json(files);
  } catch (error) {
    console.error("Error fetching file list from S3:", error);
    // Handle S3 specific errors if needed
    return NextResponse.json(
      { error: "Failed to fetch file list" },
      { status: 500 }
    );
  }
}

// POST /api/files - Upload a new file to S3, then extract text (텍스트 추출 순서 수정됨)
export async function POST(req: NextRequest) {
  if (!BUCKET_NAME) {
    console.error("S3_BUCKET_NAME environment variable is not set.");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // --- Basic File Info ---
    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;
    // 파일 버퍼는 S3 업로드와 텍스트 추출 모두에 필요
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Generate a simple unique ID (replace with UUID in a real app)
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const s3Key = `${UPLOAD_PREFIX}${fileId}-${fileName}`; // Use prefix

    // --- Upload to S3 (먼저 실행) ---
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: fileType,
      // ACL: 'private', // Or other ACL settings as needed
    });

    await s3Client.send(putCommand);
    console.log(`File uploaded successfully to S3: ${BUCKET_NAME}/${s3Key}`);
    // --- End S3 Upload ---

    // --- ★ 텍스트 추출 시도 (S3 업로드 성공 후 실행) ★ ---
    let extractedText = "";
    try {
      // 지원되는 타입(PDF, TXT)만 텍스트 추출 시도
      if (fileType === "application/pdf" || fileType === "text/plain") {
        extractedText = await extractTextFromFile(fileBuffer, fileType);
        console.log("Extracted Text:", extractedText.substring(0, 200) + "..."); // 필요시 로그 활성화
        // TODO: 추출된 텍스트를 RAG 파이프라인의 다음 단계(임베딩 생성 등)로 전달
      } else {
        console.log(
          `Skipping text extraction for unsupported file type: ${fileType}`
        );
      }
    } catch (extractionError: any) {
      // More specific type or check needed
      console.error(
        `Failed to extract text from ${fileName} after S3 upload:`,
        extractionError
      );
      // 텍스트 추출 실패 시 어떻게 처리할지 결정 (현재는 로깅만 하고 진행)
    }
    // --- ★ 텍스트 추출 완료 ★ ---

    // --- Store Metadata (텍스트 추출 시도 후 실행) ---
    // GET 요청은 S3를 직접 보므로, 이 메모리 내 저장은
    // DELETE 요청 시 S3 Key를 조회하거나, UI에서 즉각적인 피드백을 줄 때만 유효합니다.
    // 장기적으로는 DB 등으로 대체 필요.
    const newMetadata: FileMetadata = {
      id: fileId,
      name: fileName,
      type: fileType,
      size: fileSize,
      s3Key: s3Key, // Store the S3 key
    };

    fileMetadataStore.push(newMetadata);
    console.log("Updated file store:", fileMetadataStore);
    // --- End Metadata Store ---

    return NextResponse.json(
      {
        message: "File uploaded successfully",
        fileId: fileId,
        metadata: newMetadata,
        extractedText: extractedText, // 필요시 응답에 텍스트 포함 (디버깅용)
      },
      { status: 201 } // 201 Created status
    );
  } catch (error) {
    console.error("Error uploading file:", error);

    // Check for specific error types if needed (like the curl issue)
    if (
      error instanceof Error &&
      error.name === "TypeError" &&
      error.message.includes(".stream is not a function")
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid file data received. Ensure file is uploaded correctly (e.g., using @filename with curl).",
        },
        { status: 400 }
      );
    }
    // Handle S3 specific errors if needed, e.g., credentials error

    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
