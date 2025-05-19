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
    console.log('API Search V2: Starting search request');

    // Connect to the database
    console.log('API Search V2: Connecting to database');
    const mongoose = await dbConnect();
    console.log('API Search V2: Database connection established:',
      mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected');

    // Get search parameters from the URL
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const region = searchParams.get('region') || '';
    const categories = searchParams.getAll('category');

    console.log('API Search V2: Search parameters:', {
      query,
      region,
      categories: categories.join(', ')
    });

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

    console.log('API Search V2: Executing search query:', JSON.stringify(searchQuery));

    // Find chemicals matching the search criteria
    let chemicals = await Chemical.find(searchQuery).lean();

    console.log(`API Search V2: Found ${chemicals.length} chemicals matching query`);

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

        console.log(`API Search V2: Found ${chemicalRegulations.length} regulations for chemical ${chemical.name}`);

        // Return the chemical with its regulations
        return {
          ...chemical,
          chemicalRegulations
        };
      })
    );

    // Filter by region if provided
    let filteredChemicals = chemicalsWithRegulations;
    if (region && region !== 'all') {
      filteredChemicals = filteredChemicals.filter(chemical => {
        return chemical.chemicalRegulations.some((chemReg: any) =>
          chemReg.regulation && chemReg.regulation.region === region
        );
      });
    }

    // Filter by categories if provided
    if (categories && categories.length > 0) {
      filteredChemicals = filteredChemicals.filter(chemical => {
        return chemical.chemicalRegulations.some((chemReg: any) => {
          if (!chemReg.regulation || !chemReg.regulation.categories) return false;
          return categories.some(category =>
            chemReg.regulation.categories.includes(category)
          );
        });
      });
    }

    // Format the response
    const formattedChemicals = filteredChemicals.map(chemical => {
      // Extract regulations info
      const regulations = chemical.chemicalRegulations.map((chemReg: any) => {
        if (!chemReg.regulation) return null;

        // Convert MongoDB ObjectId to string for proper serialization
        const regulationId = chemReg.regulation._id.toString();
        console.log(`API Search V2: Regulation ID for ${chemReg.regulation.name}:`, regulationId);

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
      console.log(`API Search V2: Chemical ID for ${chemical.name}:`, chemicalId);

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
    console.error('API Search V2: Error searching chemicals:', error);

    // Provide more detailed error information
    const errorMessage = error instanceof Error
      ? error.message
      : 'Unknown error occurred';

    console.error('API Search V2: Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : 'No stack trace available'
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search chemicals',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
