import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Chemical from '@/models/Chemical';
import Regulation from '@/models/Regulation';
import ChemicalRegulationV2 from '@/models/ChemicalRegulationV2';

// Make sure all models are imported before using them
import '@/models/Chemical';
import '@/models/Regulation';
import '@/models/ChemicalRegulationV2';

export async function GET(request: NextRequest) {
  try {
    // Connect to the database
    await dbConnect();

    // Get search parameters from the URL
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const region = searchParams.get('region') || '';
    const categories = searchParams.getAll('category');

    // Build the search query
    let searchQuery: any = {};

    // Search by name or CAS number if query is provided
    if (query) {
      searchQuery = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { casNumber: { $regex: query, $options: 'i' } }
        ]
      };
    }

    // Find chemicals matching the search criteria
    let chemicals = await Chemical.find(searchQuery)
      .populate({
        path: 'chemicalRegulations',
        populate: {
          path: 'regulation',
          select: 'name shortName country region categories description link lastUpdated featured'
        }
      });

    // Filter by region if provided
    if (region && region !== 'all') {
      chemicals = chemicals.filter(chemical => {
        return chemical.chemicalRegulations.some((chemReg: any) =>
          chemReg.regulation && chemReg.regulation.region === region
        );
      });
    }

    // Filter by categories if provided
    if (categories && categories.length > 0) {
      chemicals = chemicals.filter(chemical => {
        return chemical.chemicalRegulations.some((chemReg: any) => {
          if (!chemReg.regulation || !chemReg.regulation.categories) return false;
          return categories.some(category =>
            chemReg.regulation.categories.includes(category)
          );
        });
      });
    }

    // Format the response
    const formattedChemicals = chemicals.map(chemical => {
      // Extract regulations info
      const regulations = chemical.chemicalRegulations.map((chemReg: any) => {
        if (!chemReg.regulation) return null;

        // Convert MongoDB ObjectId to string for proper serialization
        const regulationId = chemReg.regulation._id.toString();
        console.log(`Regulation ID for ${chemReg.regulation.name}:`, regulationId);

        // Use additionalInfo as is since it's now a plain object
        const additionalInfoObj = chemReg.additionalInfo || {};

        return {
          id: regulationId,
          name: chemReg.regulation.name,
          shortName: chemReg.regulation.shortName || '',
          country: chemReg.regulation.country,
          region: chemReg.regulation.region,
          categories: chemReg.regulation.categories,
          smlValue: chemReg.smlValue || '',
          smlUnit: chemReg.smlUnit || 'mg/kg',
          notes: chemReg.notes || '',
          restrictions: chemReg.restrictions || '',
          additionalInfo: additionalInfoObj,
          relationId: chemReg._id.toString() // Include the relation ID for reference
        };
      }).filter(Boolean); // Remove null values

      // Convert chemical ID to string
      const chemicalId = chemical._id.toString();
      console.log(`Chemical ID for ${chemical.name}:`, chemicalId);

      // Return formatted chemical
      return {
        id: chemicalId,
        name: chemical.name,
        casNumber: chemical.casNumber,
        status: chemical.status,
        riskLevel: chemical.riskLevel,
        riskDescription: chemical.riskDescription,
        regulations: regulations
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedChemicals
    });
  } catch (error) {
    console.error('Error searching chemicals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search chemicals' },
      { status: 500 }
    );
  }
}
