// src/app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fileMetadataStore, FileMetadata } from "./fileStore"; // Import shared store
import { promises as fs } from "fs"; // For optional local saving
import path from "path"; // For optional local saving

// GET /api/files - Retrieve list of uploaded file metadata
export async function GET(req: NextRequest) {
  try {
    // Return the current state of the in-memory store
    return NextResponse.json(fileMetadataStore);
  } catch (error) {
    console.error("Error fetching file list:", error);
    return NextResponse.json(
      { error: "Failed to fetch file list" },
      { status: 500 }
    );
  }
}

// POST /api/files - Upload a new file
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // --- Basic Metadata Handling ---
    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;

    // Generate a simple unique ID (replace with UUID in a real app)
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newMetadata: FileMetadata = {
      id: fileId,
      name: fileName,
      type: fileType,
      size: fileSize,
    };

    // --- Optional: Save file locally (for basic testing, not recommended for production) ---
    // In the actual project, this part will handle S3 upload (Phase 1, Step 2)
    try {
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "uploads"); // Create an 'uploads' directory in your project root
      await fs.mkdir(uploadDir, { recursive: true }); // Ensure directory exists
      await fs.writeFile(
        path.join(uploadDir, fileId + "-" + fileName),
        fileBuffer
      ); // Save with unique ID prefix
      console.log(
        `File saved locally (for testing): ${path.join(uploadDir, fileId + "-" + fileName)}`
      );
    } catch (saveError) {
      console.error("Optional: Error saving file locally:", saveError);
      // Decide if local saving failure should prevent metadata storage
      // For now, we'll still add metadata even if local save fails
    }
    // --- End Optional Local Save ---

    // Add metadata to the in-memory store
    fileMetadataStore.push(newMetadata);
    console.log("Updated file store:", fileMetadataStore);

    return NextResponse.json(
      {
        message: "File uploaded successfully",
        fileId: fileId,
        metadata: newMetadata,
      },
      { status: 201 } // 201 Created status
    );
  } catch (error) {
    // Log the detailed error
    console.error("Error uploading file:", error);

    // Check for specific error types if needed
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

    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
