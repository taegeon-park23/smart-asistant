// src/app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
// REMOVED: No longer importing fileMetadataStore for GET, but POST still uses it
import { fileMetadataStore, FileMetadata } from "./fileStore";
import s3Client from "@/lib/s3Client"; // Adjust path to your s3Client setup
// Import necessary S3 commands
import {
  PutObjectCommand,
  ListObjectsV2Command,
  S3Object,
} from "@aws-sdk/client-s3";

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const UPLOAD_PREFIX = "uploads/"; // Define the prefix where files are stored

// GET /api/files - Retrieve list of files directly from S3
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
        const firstDashIndex = keyWithoutPrefix.indexOf("-");
        if (firstDashIndex > 0) {
          id = keyWithoutPrefix.substring(0, firstDashIndex);
          name = keyWithoutPrefix.substring(firstDashIndex + 1);
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

// POST /api/files - Upload a new file to S3 (No changes from previous version)
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
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Generate a simple unique ID (replace with UUID in a real app)
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const s3Key = `${UPLOAD_PREFIX}${fileId}-${fileName}`; // Use prefix

    // --- Upload to S3 ---
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

    // --- Store Metadata (Only after successful upload) ---
    // Note: We still update the in-memory store here for potential immediate use,
    // but the GET request now ignores it. Consider if this store is still needed.
    // If DELETE relies on it before hitting S3, keep it.
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
