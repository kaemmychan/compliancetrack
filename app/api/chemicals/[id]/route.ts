import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Chemical from "@/models/Chemical";
import ChemicalRegulationV2 from "@/models/ChemicalRegulationV2";
import mongoose from 'mongoose';

// Add runtime directive for Node.js
export const runtime = 'nodejs';

interface Params {
  id: string;
}

// Helper function to validate ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET handler for a single chemical
export async function GET(request: NextRequest, { params }: { params: Params }) {
  await dbConnect();
  // Get the ID from params
  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid chemical ID format" }, { status: 400 });
  }

  try {
    // Fetch the chemical with all its regulation relationships
    const chemical = await Chemical.findById(id).lean();

    if (!chemical) {
      return NextResponse.json({ success: false, error: "Chemical not found" }, { status: 404 });
    }

    // Fetch all chemical-regulation relationships for this chemical
    const chemicalRegulations = await ChemicalRegulationV2.find({
      chemical: id
    }).populate({
      path: 'regulation',
      select: 'name shortName country region categories description link lastUpdated featured'
    }).lean();

    // Format the response
    const formattedChemical = {
      ...chemical,
      chemicalRegulations: chemicalRegulations.map(relation => ({
        id: relation._id,
        regulation: relation.regulation,
        smlValue: relation.smlValue || '',
        smlUnit: relation.smlUnit || 'mg/kg',
        notes: relation.notes || '',
        restrictions: relation.restrictions || '',
        additionalInfo: relation.additionalInfo || {}
      }))
    };

    return NextResponse.json({ success: true, data: formattedChemical });
  } catch (error) {
    console.error("API Error fetching chemical:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

// PUT handler to update a chemical
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  await dbConnect();
  // Get the ID from params
  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid chemical ID format" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, casNumber, status, riskLevel, riskDescription } = body;

    // Validate required fields
    if (!name || !casNumber) {
      return NextResponse.json(
        { success: false, error: "Name and CAS number are required" },
        { status: 400 }
      );
    }

    // Check if another chemical with the same CAS number exists (excluding this one)
    const existingChemical = await Chemical.findOne({
      casNumber,
      _id: { $ne: id }
    });

    if (existingChemical) {
      return NextResponse.json(
        { success: false, error: "Another chemical with this CAS number already exists" },
        { status: 409 }
      );
    }

    // Update the chemical
    const updatedChemical = await Chemical.findByIdAndUpdate(
      id,
      {
        name,
        casNumber,
        status,
        riskLevel,
        riskDescription
      },
      { new: true, runValidators: true }
    );

    if (!updatedChemical) {
      return NextResponse.json({ success: false, error: "Chemical not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedChemical,
      message: "Chemical updated successfully"
    });
  } catch (error) {
    console.error("API Error updating chemical:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

// DELETE handler to remove a chemical
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  await dbConnect();
  // Get the ID from params
  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid chemical ID format" }, { status: 400 });
  }

  try {
    const deletedChemical = await Chemical.findByIdAndDelete(id);

    if (!deletedChemical) {
      return NextResponse.json({ success: false, error: "Chemical not found" }, { status: 404 });
    }

    // TODO: Also delete related chemical regulations if needed

    return NextResponse.json({
      success: true,
      message: "Chemical deleted successfully"
    });
  } catch (error) {
    console.error("API Error deleting chemical:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
