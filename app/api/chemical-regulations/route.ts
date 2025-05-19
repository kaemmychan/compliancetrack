import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ChemicalRegulationV2 from '@/models/ChemicalRegulationV2';
import Chemical from '@/models/Chemical';
import Regulation from '@/models/Regulation';

// Add runtime directive for Node.js
export const runtime = 'nodejs';

// GET handler to retrieve chemical regulations
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const chemicalId = searchParams.get('chemicalId');
    const regulationId = searchParams.get('regulationId');

    let query: any = {};

    if (chemicalId) {
      query.chemical = chemicalId;
    }

    if (regulationId) {
      query.regulation = regulationId;
    }

    const chemicalRegulations = await ChemicalRegulationV2.find(query)
      .populate('chemical', 'name casNumber')
      .populate('regulation', 'name country region categories');

    return NextResponse.json({ success: true, data: chemicalRegulations });
  } catch (error) {
    console.error('Error getting chemical regulations:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST handler to add a new chemical regulation relationship
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { chemicalId, regulationId, smlValue } = body;

    // Validate required fields
    if (!chemicalId || !regulationId) {
      return NextResponse.json(
        { success: false, error: 'Chemical ID and Regulation ID are required' },
        { status: 400 }
      );
    }

    // Verify both chemical and regulation exist
    const chemical = await Chemical.findById(chemicalId);
    const regulation = await Regulation.findById(regulationId);

    if (!chemical) {
      return NextResponse.json(
        { success: false, error: 'Chemical not found' },
        { status: 404 }
      );
    }

    if (!regulation) {
      return NextResponse.json(
        { success: false, error: 'Regulation not found' },
        { status: 404 }
      );
    }

    // Check if relationship already exists
    const existingRelation = await ChemicalRegulationV2.findOne({
      chemical: chemicalId,
      regulation: regulationId
    });

    if (existingRelation) {
      return NextResponse.json(
        { success: false, error: 'This chemical is already linked to this regulation' },
        { status: 409 }
      );
    }

    // Create new relationship
    const newRelation = await ChemicalRegulationV2.create({
      chemical: chemicalId,
      regulation: regulationId,
      smlValue: smlValue || ''
    });

    // Update the chemical's chemicalRegulations array
    await Chemical.findByIdAndUpdate(
      chemicalId,
      { $push: { chemicalRegulations: newRelation._id } }
    );

    return NextResponse.json({
      success: true,
      data: newRelation,
      message: 'Chemical regulation relationship added successfully'
    });
  } catch (error) {
    console.error('Error adding chemical regulation:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE handler to remove a chemical regulation relationship
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const chemicalId = searchParams.get('chemicalId');
    const regulationId = searchParams.get('regulationId');

    if (!chemicalId || !regulationId) {
      return NextResponse.json(
        { success: false, error: 'Chemical ID and Regulation ID are required' },
        { status: 400 }
      );
    }

    // Find and delete the relationship
    const deletedRelation = await ChemicalRegulationV2.findOneAndDelete({
      chemical: chemicalId,
      regulation: regulationId
    });

    if (!deletedRelation) {
      return NextResponse.json(
        { success: false, error: 'Chemical regulation relationship not found' },
        { status: 404 }
      );
    }

    // Remove the reference from the chemical's chemicalRegulations array
    await Chemical.findByIdAndUpdate(
      chemicalId,
      { $pull: { chemicalRegulations: deletedRelation._id } }
    );

    return NextResponse.json({
      success: true,
      message: 'Chemical regulation relationship removed successfully'
    });
  } catch (error) {
    console.error('Error deleting chemical regulation:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
