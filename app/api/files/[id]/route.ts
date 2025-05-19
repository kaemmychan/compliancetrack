import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/gridfs';
import { Readable } from 'stream';

// Set the runtime to nodejs
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: fileId } = await params;

    // Download the file from GridFS
    const { stream, file } = await downloadFile(fileId);

    // Convert the stream to a Response
    const readableStream = Readable.fromWeb(stream as any);
    const response = new NextResponse(readableStream as any);

    // Set the appropriate headers
    response.headers.set('Content-Type', file.contentType);
    response.headers.set('Content-Disposition', `inline; filename="${file.filename}"`);
    response.headers.set('Content-Length', file.length.toString());

    return response;
  } catch (error) {
    console.error('Error downloading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
