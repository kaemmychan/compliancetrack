import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Regulation from '@/models/Regulation';

// Add runtime directive for Node.js
export const runtime = 'nodejs';

// GET handler to retrieve regulations
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Optional search query parameters
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('query');
    const region = searchParams.get('region');
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');

    let query: any = {};

    // Add search filters if provided
    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { country: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    if (region) {
      query.region = region;
    }

    if (category) {
      query.categories = category;
    }

    if (featured === 'true') {
      query.featured = true;
    }

    const regulations = await Regulation.find(query)
      .sort({ featured: -1, lastUpdated: -1 });

    return NextResponse.json({ success: true, data: regulations });
  } catch (error) {
    console.error('Error getting regulations:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST handler to add a new regulation
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const {
      name,
      shortName,
      country,
      region,
      description,
      link,
      categories,
      featured,
      fileId,
      fileName,
      fileSize,
      fileType,
      updateDetails
    } = body;

    // Validate required fields
    if (!name || !country || !region) {
      return NextResponse.json(
        { success: false, error: 'Name, country, and region are required' },
        { status: 400 }
      );
    }

    // Create new regulation with all fields
    const newRegulation = await Regulation.create({
      name,
      shortName: shortName || '',
      country,
      region,
      description: description || '',
      link,
      categories: categories || [],
      featured: featured || false,
      updateDetails: updateDetails || '',
      lastUpdated: new Date(),
      // Always initialize updateHistory with a default entry
      updateHistory: [{
        date: new Date(),
        description: `Initial version of ${name}`
      }],
      // Include file information if available
      ...(fileId && { fileId }),
      ...(fileName && { fileName }),
      ...(fileSize && { fileSize }),
      ...(fileType && { fileType })
    });

    return NextResponse.json({
      success: true,
      data: newRegulation,
      message: 'Regulation added successfully'
    });
  } catch (error) {
    console.error('Error adding regulation:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
