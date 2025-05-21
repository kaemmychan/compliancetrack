import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Chemical from '@/models/Chemical';
import ChemicalRegulationV2 from '@/models/ChemicalRegulationV2';
import mongoose from 'mongoose';

// Add runtime directive for Node.js
export const runtime = 'nodejs';

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Interface for AI summary
interface AISummary {
  regulationId: string;
  regulationName: string;
  summary: string;
  keyPoints: string[];
  lastUpdated: string;
  confidence: number; // 0-1 value representing AI confidence
}

// GET handler to retrieve AI summaries for a chemical
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = params;

    // Validate the chemical ID format
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chemical ID format' },
        { status: 400 }
      );
    }

    // Check if the chemical exists
    const chemical = await Chemical.findById(id);
    if (!chemical) {
      return NextResponse.json(
        { success: false, error: 'Chemical not found' },
        { status: 404 }
      );
    }

    // Fetch all chemical-regulation relationships for this chemical
    const chemicalRegulations = await ChemicalRegulationV2.find({
      chemical: id
    }).populate({
      path: 'regulation',
      select: 'name shortName country region categories description'
    }).lean();

    // In a real implementation, this would call an AI service to generate summaries
    // For now, we'll use mock data based on the regulations
    const aiSummaries: AISummary[] = chemicalRegulations.map((relation: any) => {
      const regulation = relation.regulation;
      const regulationName = regulation.shortName || regulation.name;
      
      // Generate mock summary based on the chemical and regulation
      return {
        regulationId: regulation._id.toString(),
        regulationName: regulationName,
        summary: generateMockSummary(chemical.name, regulationName, relation),
        keyPoints: generateMockKeyPoints(chemical.name, regulationName, relation),
        lastUpdated: new Date().toISOString(),
        confidence: Math.random() * 0.3 + 0.7 // Random confidence between 0.7 and 1.0
      };
    });

    return NextResponse.json({ success: true, data: aiSummaries });
  } catch (error) {
    console.error("API Error fetching AI summaries:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// Helper function to generate mock summaries
function generateMockSummary(chemicalName: string, regulationName: string, relation: any): string {
  const templates = [
    `${chemicalName} is regulated under ${regulationName} with specific migration limits. The regulation specifies detailed requirements for its use in consumer products, with particular attention to potential health impacts. Manufacturers must ensure compliance with the specified limits and testing protocols.`,
    
    `According to ${regulationName}, ${chemicalName} is subject to specific restrictions and monitoring requirements. The regulation outlines testing methodologies and acceptable limits for various applications. Companies using this substance must maintain documentation of compliance.`,
    
    `${regulationName} classifies ${chemicalName} as a substance requiring careful monitoring. The regulation provides guidelines for risk assessment and mitigation strategies. Regular testing is recommended to ensure continued compliance with evolving standards.`,
    
    `Under ${regulationName}, ${chemicalName} has defined usage parameters that manufacturers must adhere to. The regulation emphasizes the importance of proper documentation and traceability throughout the supply chain. Periodic reviews of compliance status are advised.`
  ];
  
  // Add specific information if available
  let summary = templates[Math.floor(Math.random() * templates.length)];
  
  if (relation.smlValue) {
    summary += ` The specific migration limit (SML) is set at ${relation.smlValue} ${relation.smlUnit || 'mg/kg'}.`;
  }
  
  if (relation.restrictions) {
    summary += ` Key restrictions include: ${relation.restrictions}.`;
  }
  
  if (relation.notes) {
    summary += ` Additional regulatory notes: ${relation.notes}.`;
  }
  
  return summary;
}

// Helper function to generate mock key points
function generateMockKeyPoints(chemicalName: string, regulationName: string, relation: any): string[] {
  const basePoints = [
    `${chemicalName} is specifically mentioned in ${regulationName} regulatory framework.`,
    `Compliance documentation should be maintained for at least 5 years.`,
    `Regular testing is recommended to ensure continued compliance.`
  ];
  
  const additionalPoints = [];
  
  if (relation.smlValue) {
    additionalPoints.push(`The specific migration limit is ${relation.smlValue} ${relation.smlUnit || 'mg/kg'}.`);
  }
  
  if (relation.restrictions) {
    additionalPoints.push(`Usage restrictions apply: ${relation.restrictions}.`);
  }
  
  // Add random points based on the regulation
  const possiblePoints = [
    `${regulationName} requires notification to authorities when using this substance above certain thresholds.`,
    `Special labeling requirements may apply when this substance is present.`,
    `This substance may be subject to future regulatory changes under ${regulationName}.`,
    `Alternative substances may be recommended for certain applications.`,
    `Risk assessment documentation is required when using this substance.`
  ];
  
  // Add 1-2 random points
  const numRandomPoints = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < numRandomPoints; i++) {
    const randomIndex = Math.floor(Math.random() * possiblePoints.length);
    additionalPoints.push(possiblePoints[randomIndex]);
    // Remove the used point to avoid duplicates
    possiblePoints.splice(randomIndex, 1);
    if (possiblePoints.length === 0) break;
  }
  
  return [...basePoints, ...additionalPoints];
}
