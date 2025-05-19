import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Chemical from '@/models/Chemical';
import ChemicalRegulationV2 from '@/models/ChemicalRegulationV2';
import Regulation from '@/models/Regulation';

// Add runtime directive for Node.js
export const runtime = 'nodejs';

// GET handler to fetch all chemicals
export async function GET(request: NextRequest) {
  try {
    console.log("API: Attempting to connect to database");
    // Connect to the database
    await dbConnect();
    console.log("API: Successfully connected to database");

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('query');

    let query = {};
    if (searchQuery) {
      query = {
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { casNumber: { $regex: searchQuery, $options: 'i' } }
        ]
      };
    }

    console.log("API: Fetching chemicals with query:", JSON.stringify(query));

    // Fetch chemicals with optional filtering and populate the regulations
    const chemicals = await Chemical.find(query)
      .populate({
        path: 'chemicalRegulations',
        populate: {
          path: 'regulation',
          select: 'name country region categories description link lastUpdated featured'
        }
      })
      .lean();

    // Log the raw chemicals data for debugging
    console.log("API: Raw chemicals data:", JSON.stringify(chemicals.slice(0, 1), null, 2));

    console.log(`API: Retrieved ${chemicals.length} chemicals`);

    // Log the first chemical's regulations for debugging
    if (chemicals.length > 0 && chemicals[0].chemicalRegulations) {
      console.log(`API: First chemical has ${chemicals[0].chemicalRegulations.length} regulations`);

      // Add more detailed logging for debugging
      if (chemicals[0].chemicalRegulations.length > 0) {
        console.log('API: First chemical regulation details:', JSON.stringify(chemicals[0].chemicalRegulations[0], null, 2));
      }
    }

    // Return the data as JSON
    return NextResponse.json({ success: true, data: chemicals });
  } catch (error) {
    // Log server error and return JSON error response
    console.error('API Error fetching chemicals:', error);

    // Return a proper JSON error response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
        timestamp: new Date().toISOString(),
        path: '/api/chemicals'
      },
      { status: 500 }
    );
  }
}

// POST handler to add a new chemical
export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const body = await request.json();
    const { name, casNumber, status, riskLevel, riskDescription } = body;

    // Validate required fields
    if (!name || !casNumber) {
      return NextResponse.json(
        { success: false, error: 'Name and CAS number are required' },
        { status: 400 }
      );
    }

    // Check if chemical with CAS number already exists
    const existingChemical = await Chemical.findOne({ casNumber });
    if (existingChemical) {
      return NextResponse.json(
        { success: false, error: 'Chemical with this CAS number already exists' },
        { status: 409 }
      );
    }

    // Create new chemical
    const newChemical = await Chemical.create({
      name,
      casNumber,
      status: status || 'allowed',
      riskLevel: riskLevel || 'low',
      riskDescription: riskDescription || ''
    });

    return NextResponse.json({
      success: true,
      data: newChemical,
      message: 'Chemical added successfully'
    });
  } catch (error) {
    console.error("API Error adding chemical:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
