// src/app/api/files/[fileId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fileMetadataStore } from "../fileStore"; // Import shared store
import s3Client from "@/lib/s3Client"; // Adjust path to your s3Client setup
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// DELETE /api/files/{fileId} - Delete a specific file by ID from S3 and metadata store
export async function DELETE(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  if (!BUCKET_NAME) {
    console.error("S3_BUCKET_NAME environment variable is not set.");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const fileIdToDelete = params.fileId;

    if (!fileIdToDelete) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    const fileIndex = fileMetadataStore.findIndex(
      (file) => file.id === fileIdToDelete
    );

    if (fileIndex === -1) {
      // If metadata doesn't exist, maybe the S3 object still does?
      // Depending on requirements, you might try deleting from S3 anyway,
      // but for now, we'll return 404 if metadata is gone.
      return NextResponse.json(
        { error: "File metadata not found" },
        { status: 404 }
      );
    }

    const deletedMetadata = fileMetadataStore[fileIndex]; // Get metadata before deleting

    // --- Delete from S3 ---
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: deletedMetadata.s3Key, // Use the stored S3 key
    });

    try {
      await s3Client.send(deleteCommand);
      console.log(
        `File deleted successfully from S3: ${BUCKET_NAME}/${deletedMetadata.s3Key}`
      );
    } catch (s3Error: any) {
      // Handle potential S3 errors (e.g., NoSuchKey)
      // Often, even if S3 delete fails (e.g., already deleted), we might still want to remove the metadata.
      console.error(
        `Error deleting file from S3 (Key: ${deletedMetadata.s3Key}):`,
        s3Error
      );
      // Depending on strictness, you could return an error here:
      // return NextResponse.json({ error: "Failed to delete file from storage" }, { status: 500 });
    }
    // --- End S3 Delete ---

    // --- Remove metadata from the in-memory store ---
    // This happens even if S3 delete failed, to clean up the metadata record.
    fileMetadataStore.splice(fileIndex, 1);
    console.log("Updated file store after deletion:", fileMetadataStore);
    // --- End Metadata Remove ---

    return NextResponse.json({
      message: `File '${deletedMetadata.name}' (ID: ${fileIdToDelete}) deleted successfully`,
    });
  } catch (error) {
    console.error(
      `Error processing delete request for file ID ${params?.fileId}:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
