// src/app/api/files/[fileId]/route.ts
import { NextRequest, NextResponse } from "next/server";
// REMOVED: No longer importing fileMetadataStore
import { S3ServiceException } from "@aws-sdk/client-s3";
// import { fileMetadataStore } from "../fileStore";
import s3Client from "@/lib/s3Client"; // Adjust path to your s3Client setup
// Import needed S3 commands
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  _Object,
} from "@aws-sdk/client-s3";

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const UPLOAD_PREFIX = "uploads/"; // Define the prefix where files are stored

// DELETE /api/files/{fileId} - Delete a specific file by ID by listing S3 first
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

    // --- Step 1: List objects in S3 with the fileId prefix ---
    const listPrefix = `${UPLOAD_PREFIX}${fileIdToDelete}-`;
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: listPrefix,
    });

    let s3KeyToDelete: string | null = null;
    let objectsFound: _Object[] = [];

    try {
      const s3ListResponse = await s3Client.send(listCommand);
      objectsFound = s3ListResponse.Contents?.filter((obj) => obj.Key) ?? [];

      if (objectsFound.length === 0) {
        // No object found with this prefix
        console.log(`No S3 object found with prefix: ${listPrefix}`);
        return NextResponse.json(
          { error: "File not found in storage" },
          { status: 404 }
        );
      } else if (objectsFound.length > 1) {
        // Ambiguous: multiple objects match the prefix. Log warning and delete all? Or return error?
        // For safety, let's log a warning but proceed to delete the first one found for now.
        // Consider a more robust strategy if this ambiguity is possible in your use case.
        console.warn(
          `Ambiguous delete request: Found ${objectsFound.length} objects matching prefix ${listPrefix}. Deleting the first one.`
        );
        s3KeyToDelete = objectsFound[0].Key!;
      } else {
        // Exactly one object found
        s3KeyToDelete = objectsFound[0].Key!;
        console.log(`Found S3 object to delete: ${s3KeyToDelete}`);
      }
    } catch (listError) {
      console.error(
        `Error listing objects from S3 with prefix ${listPrefix}:`,
        listError
      );
      return NextResponse.json(
        { error: "Failed to check file storage" },
        { status: 500 }
      );
    }
    // --- End Step 1 ---

    // --- Step 2: Delete the found object from S3 ---
    if (!s3KeyToDelete) {
      // This should ideally not happen if logic above is correct, but as a safeguard:
      console.error(
        `Could not determine S3 key to delete for prefix ${listPrefix}`
      );
      return NextResponse.json(
        { error: "Failed to identify file in storage" },
        { status: 500 }
      );
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3KeyToDelete,
    });

    try {
      await s3Client.send(deleteCommand);
      console.log(
        `File deleted successfully from S3: ${BUCKET_NAME}/${s3KeyToDelete}`
      );
    } catch (s3Error: unknown) {
      // Log S3 delete error, but proceed to return success as the intent was deletion.
      // If the object was already gone (NoSuchKey), it's still effectively deleted.
      console.error(
        `Error deleting file from S3 (Key: ${s3KeyToDelete}), but proceeding:`,
        s3Error
      );
      // Optionally check for specific S3 error codes if needed
      if (s3Error instanceof S3ServiceException) {
        console.error(
          `S3 Error Code: ${s3Error.name}, Message: ${s3Error.message}`
        );
      } else if (s3Error instanceof Error) {
        console.error(`Generic Error Message: ${s3Error.message}`);
      }
    }
    // --- End Step 2 ---

    // --- Remove metadata from the in-memory store (REMOVED) ---
    // console.log("In-memory metadata store is no longer used for deletion checks.");
    // --- End Metadata Remove ---

    // Return success (Filename is unknown now)
    return NextResponse.json({
      message: `File associated with ID '${fileIdToDelete}' deleted successfully`,
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
