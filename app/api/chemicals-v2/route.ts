import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Chemical from '@/models/Chemical';
import ChemicalRegulationV2 from '@/models/ChemicalRegulationV2';
import Regulation from '@/models/Regulation';

// Add runtime directive for Node.js
export const runtime = 'nodejs';

// GET handler to fetch all chemicals with ChemicalRegulationV2 relationships
export async function GET(request: NextRequest) {
  try {
    console.log("API V2: Attempting to connect to database");
    // Connect to the database
    await dbConnect();
    console.log("API V2: Successfully connected to database");

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

    console.log("API V2: Fetching chemicals with query:", JSON.stringify(query));

    // Fetch chemicals with optional filtering
    const chemicals = await Chemical.find(query).lean();

    console.log(`API V2: Retrieved ${chemicals.length} chemicals`);

    // For each chemical, fetch its ChemicalRegulationV2 relationships
    const chemicalsWithRegulations = await Promise.all(
      chemicals.map(async (chemical) => {
        // Find all ChemicalRegulationV2 documents for this chemical
        const chemicalRegulations = await ChemicalRegulationV2.find({
          chemical: chemical._id
        }).populate({
          path: 'regulation',
          select: 'name shortName country region categories description link lastUpdated featured'
        }).lean();

        console.log(`API V2: Found ${chemicalRegulations.length} regulations for chemical ${chemical.name}`);

        // Return the chemical with its regulations
        return {
          ...chemical,
          chemicalRegulations
        };
      })
    );

    // Return the data as JSON
    return NextResponse.json({ success: true, data: chemicalsWithRegulations });
  } catch (error) {
    // Log server error and return JSON error response
    console.error('API V2 Error fetching chemicals:', error);

    // Return a proper JSON error response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
        timestamp: new Date().toISOString(),
        path: '/api/chemicals-v2'
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
    console.error("API V2 Error adding chemical:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
