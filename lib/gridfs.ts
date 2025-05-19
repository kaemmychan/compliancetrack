import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import dbConnect from './dbConnect';

let bucket: GridFSBucket | null = null;

/**
 * Initialize GridFS bucket
 */
export async function getGridFS(): Promise<GridFSBucket> {
  if (bucket) {
    return bucket;
  }

  // Connect to the database
  await dbConnect();
  
  // Get the MongoDB connection
  const db = mongoose.connection.db;
  
  // Create a GridFS bucket
  bucket = new GridFSBucket(db, {
    bucketName: 'regulations'
  });
  
  return bucket;
}

/**
 * Upload a file to GridFS
 * @param fileBuffer - The file buffer
 * @param filename - The original filename
 * @param contentType - The MIME type of the file
 * @returns The file ID
 */
export async function uploadFile(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const bucket = await getGridFS();
  
  return new Promise((resolve, reject) => {
    // Create a stream to upload the file
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: {
        uploadDate: new Date(),
      },
    });
    
    // Handle upload events
    uploadStream.on('error', (error) => {
      console.error('Error uploading file to GridFS:', error);
      reject(error);
    });
    
    uploadStream.on('finish', () => {
      resolve(uploadStream.id.toString());
    });
    
    // Write the file buffer to the stream
    uploadStream.write(fileBuffer);
    uploadStream.end();
  });
}

/**
 * Download a file from GridFS
 * @param fileId - The file ID
 * @returns The file data
 */
export async function downloadFile(fileId: string): Promise<{
  stream: NodeJS.ReadableStream;
  file: {
    filename: string;
    contentType: string;
    length: number;
  };
}> {
  const bucket = await getGridFS();
  
  // Convert string ID to ObjectId
  const objectId = new mongoose.Types.ObjectId(fileId);
  
  // Find the file metadata
  const files = await bucket.find({ _id: objectId }).toArray();
  
  if (!files || files.length === 0) {
    throw new Error('File not found');
  }
  
  const file = files[0];
  
  // Create a download stream
  const downloadStream = bucket.openDownloadStream(objectId);
  
  return {
    stream: downloadStream,
    file: {
      filename: file.filename,
      contentType: file.contentType || 'application/octet-stream',
      length: file.length,
    },
  };
}

/**
 * Delete a file from GridFS
 * @param fileId - The file ID
 */
export async function deleteFile(fileId: string): Promise<void> {
  const bucket = await getGridFS();
  
  // Convert string ID to ObjectId
  const objectId = new mongoose.Types.ObjectId(fileId);
  
  // Delete the file
  await bucket.delete(objectId);
}
