// src/app/api/files/[fileId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fileMetadataStore } from "../fileStore"; // Import shared store
import { promises as fs } from "fs"; // For optional local deletion
import path from "path"; // For optional local deletion

// DELETE /api/files/{fileId} - Delete a specific file by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
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
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const deletedMetadata = fileMetadataStore[fileIndex]; // Get metadata before deleting

    // Remove metadata from the in-memory store
    fileMetadataStore.splice(fileIndex, 1);
    console.log("Updated file store after deletion:", fileMetadataStore);

    // --- Optional: Delete file locally ---
    // In the actual project, this part will handle S3 deletion (Phase 1, Step 2)
    try {
      const uploadDir = path.join(process.cwd(), "uploads");
      const localFilePath = path.join(
        uploadDir,
        deletedMetadata.id + "-" + deletedMetadata.name
      );
      await fs.unlink(localFilePath); // Delete the local file
      console.log(`Local file deleted (for testing): ${localFilePath}`);
    } catch (deleteError: any) {
      // Log error but don't fail the request if local delete fails (e.g., file already gone)
      if (deleteError.code !== "ENOENT") {
        // ENOENT = Error NO ENTry (file not found)
        console.error("Optional: Error deleting local file:", deleteError);
      } else {
        console.log(
          `Optional: Local file not found for deletion, possibly already deleted: ${deletedMetadata.id + "-" + deletedMetadata.name}`
        );
      }
    }
    // --- End Optional Local Delete ---

    return NextResponse.json({
      message: `File '${deletedMetadata.name}' (ID: ${fileIdToDelete}) deleted successfully`,
    });
  } catch (error) {
    console.error(`Error deleting file with ID ${params?.fileId}:`, error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
