import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Chemical from '@/models/Chemical';
import ChemicalRegulationV2 from '@/models/ChemicalRegulationV2';
import Regulation from '@/models/Regulation';
import * as XLSX from 'xlsx';

// For debugging
console.log('Import API: Models loaded', {
  Chemical: !!Chemical,
  ChemicalRegulationV2: !!ChemicalRegulationV2,
  Regulation: !!Regulation
});

// Add runtime directive for Node.js
export const runtime = 'nodejs';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Check if the request is multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'Request must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Connect to the database
    await dbConnect();

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const regulationNameRaw = formData.get('regulationName');
    const regulationName = regulationNameRaw ? String(regulationNameRaw) : '';
    const statusRaw = formData.get('status');
    const status = statusRaw ? String(statusRaw) : 'allowed';
    const riskLevelRaw = formData.get('riskLevel');
    const riskLevel = riskLevelRaw ? String(riskLevelRaw) : 'low';
    const regulationIdRaw = formData.get('regulationId');
    const regulationId = regulationIdRaw ? String(regulationIdRaw) : '';
    const categoryRaw = formData.get('category');
    const category = categoryRaw ? String(categoryRaw) : 'Imported';
    const regionRaw = formData.get('region');
    const region = regionRaw ? String(regionRaw) : 'Global';

    console.log('Import request parameters:', {
      regulationName,
      status,
      riskLevel,
      regulationId,
      category,
      region,
      fileName: file?.name
    });

    // Check if a file was provided
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Get file details
    const fileName = file.name;
    const fileType = file.type;

    // Check file type
    if (!fileType.includes('spreadsheet') && !fileType.includes('csv') &&
        !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only Excel and CSV files are supported.' },
        { status: 400 }
      );
    }

    // Convert the file to an array buffer
    const fileBuffer = await file.arrayBuffer();

    // Parse the Excel/CSV file
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File contains no data' },
        { status: 400 }
      );
    }

    // Process the data
    const results = {
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      chemicals: [] as any[]
    };

    // Create or find regulation if regulationName or regulationId is provided
    let regulation = null;

    if (regulationId) {
      console.log(`Looking for regulation with ID: ${regulationId}`);
      regulation = await Regulation.findById(regulationId);
      if (!regulation) {
        return NextResponse.json(
          { success: false, error: 'Regulation not found' },
          { status: 404 }
        );
      }
      console.log(`Found regulation: ${regulation.name}`);
    } else if (regulationName && regulationName.trim() !== '') {
      console.log(`Looking for regulation with name: ${regulationName}`);
      // Try to find an existing regulation with this name
      regulation = await Regulation.findOne({
        name: { $regex: new RegExp('^' + regulationName.trim() + '$', 'i') }
      });

      if (regulation) {
        console.log(`Found existing regulation: ${regulation.name}`);
      } else {
        // Create a new regulation with the provided name
        console.log(`Creating new regulation: ${regulationName}`);
        regulation = await Regulation.create({
          name: regulationName.trim(),
          country: 'Unknown',
          region: region,
          description: `Imported from ${fileName}`,
          categories: [category],
          lastUpdated: new Date()
        });
        console.log(`Created new regulation with ID: ${regulation._id}`);
      }
    } else {
      console.log('No regulation ID or name provided');
    }

    // Process each row in the file
    for (const row of data) {
      try {
        // Find chemical name column (could be "chemical name", "substance name", etc.)
        const chemicalNameKeys = Object.keys(row).filter(key =>
          key.toLowerCase().includes('chemical') && key.toLowerCase().includes('name') ||
          key.toLowerCase().includes('substance') && key.toLowerCase().includes('name') ||
          key.toLowerCase() === 'name'
        );

        // Find CAS number column
        const casNumberKeys = Object.keys(row).filter(key =>
          key.toLowerCase().includes('cas') ||
          key.toLowerCase().includes('cas no') ||
          key.toLowerCase().includes('cas number')
        );

        // Find SML value column
        const smlKeys = Object.keys(row).filter(key =>
          key.toLowerCase().includes('sml') ||
          key.toLowerCase().includes('specific migration') ||
          key.toLowerCase().includes('migration limit')
        );

        // Find notes column
        const notesKeys = Object.keys(row).filter(key =>
          key.toLowerCase().includes('note') ||
          key.toLowerCase().includes('comment') ||
          key.toLowerCase().includes('remark')
        );

        // Find restrictions column
        const restrictionsKeys = Object.keys(row).filter(key =>
          key.toLowerCase().includes('restriction') ||
          key.toLowerCase().includes('limitation') ||
          key.toLowerCase().includes('condition')
        );

        // Extract values
        const chemicalName = chemicalNameKeys.length > 0 ? row[chemicalNameKeys[0]] : null;
        const casNumber = casNumberKeys.length > 0 ? row[casNumberKeys[0]] : null;
        let smlValue = smlKeys.length > 0 ? row[smlKeys[0]] : null;
        const notes = notesKeys.length > 0 ? row[notesKeys[0]] : '';
        const restrictions = restrictionsKeys.length > 0 ? row[restrictionsKeys[0]] : '';

        // Extract SML value and unit
        let smlUnit = 'mg/kg'; // Default unit
        if (smlValue && typeof smlValue === 'string') {
          // Extract numeric part from SML value (e.g., "0.05 mg/kg" -> "0.05")
          const numericMatch = smlValue.match(/[\d.]+/);
          if (numericMatch) {
            // Try to extract the unit part
            const unitMatch = smlValue.match(/[a-zA-Z\/]+/g);
            if (unitMatch && unitMatch.length > 0) {
              smlUnit = unitMatch.join('').trim();
            }
            smlValue = numericMatch[0];
          }
        }

        // Collect additional information from other columns
        // Use a plain object for additionalInfo
        const additionalInfo = {};
        Object.keys(row).forEach(key => {
          // Skip columns we've already processed
          if (!chemicalNameKeys.includes(key) &&
              !casNumberKeys.includes(key) &&
              !smlKeys.includes(key) &&
              !notesKeys.includes(key) &&
              !restrictionsKeys.includes(key)) {
            additionalInfo[key] = row[key];
          }
        });

        // Skip row if neither chemical name nor CAS number is provided
        if (!chemicalName && !casNumber) {
          results.skipped++;
          continue;
        }

        // Try to find existing chemical by CAS number first, then by name
        let existingChemical = null;
        if (casNumber) {
          existingChemical = await Chemical.findOne({ casNumber });
        }

        if (!existingChemical && chemicalName) {
          existingChemical = await Chemical.findOne({ name: chemicalName });
        }

        if (existingChemical) {
          // Update existing chemical
          results.updated++;
          results.chemicals.push({
            _id: existingChemical._id,
            name: existingChemical.name,
            casNumber: existingChemical.casNumber,
            status: existingChemical.status,
            updated: true
          });

          // If regulation is provided, link it to the chemical
          if (regulation) {
            console.log(`Linking existing chemical ${existingChemical.name} to regulation ${regulation.name}`);

            try {
              // Check if the chemical-regulation relationship already exists
              const existingRelation = await ChemicalRegulationV2.findOne({
                chemical: existingChemical._id,
                regulation: regulation._id
              });

              if (!existingRelation) {
                // Create new chemical-regulation relationship
                console.log(`Creating new chemical-regulation relationship with SML value: ${smlValue || 'none'}`);
                const newRelation = await ChemicalRegulationV2.create({
                  chemical: existingChemical._id,
                  regulation: regulation._id,
                  smlValue: smlValue || '',
                  smlUnit,
                  notes,
                  restrictions,
                  additionalInfo
                });

                // Update the chemical's chemicalRegulations array
                const updateResult = await Chemical.findByIdAndUpdate(
                  existingChemical._id,
                  { $addToSet: { chemicalRegulations: newRelation._id } },
                  { new: true }
                );

                console.log(`Created new relation with ID: ${newRelation._id} and updated chemical's regulations array`);

                // Log the updated chemical for debugging
                console.log(`Updated chemical regulations array:`, {
                  chemicalId: existingChemical._id,
                  chemicalName: existingChemical.name,
                  regulationId: regulation._id,
                  regulationName: regulation.name,
                  relationId: newRelation._id,
                  updatedRegulationsArray: updateResult.chemicalRegulations
                });
              } else {
                // Update the relation with any new information
                let updated = false;

                if (smlValue && existingRelation.smlValue !== smlValue) {
                  console.log(`Updating existing relation SML value from ${existingRelation.smlValue} to ${smlValue}`);
                  existingRelation.smlValue = smlValue;
                  updated = true;
                }

                if (smlUnit && existingRelation.smlUnit !== smlUnit) {
                  console.log(`Updating existing relation SML unit from ${existingRelation.smlUnit} to ${smlUnit}`);
                  existingRelation.smlUnit = smlUnit;
                  updated = true;
                }

                if (notes && existingRelation.notes !== notes) {
                  console.log(`Updating existing relation notes`);
                  existingRelation.notes = notes;
                  updated = true;
                }

                if (restrictions && existingRelation.restrictions !== restrictions) {
                  console.log(`Updating existing relation restrictions`);
                  existingRelation.restrictions = restrictions;
                  updated = true;
                }

                // Merge additional info
                if (Object.keys(additionalInfo).length > 0) {
                  console.log(`Updating additional information`);
                  // Merge the new additionalInfo with the existing one
                  existingRelation.additionalInfo = {
                    ...existingRelation.additionalInfo,
                    ...additionalInfo
                  };

                  updated = true;
                }

                if (updated) {
                  await existingRelation.save();
                  console.log(`Updated relation with ID: ${existingRelation._id}`);
                } else {
                  console.log(`Relation already exists with SML value: ${existingRelation.smlValue}`);
                }
              }
            } catch (relationError) {
              console.error(`Error linking chemical to regulation:`, relationError);
              results.errors.push(`Error linking chemical ${existingChemical.name} to regulation ${regulation.name}: ${relationError.message}`);
            }
          }
        } else {
          // Create new chemical
          const newChemical = await Chemical.create({
            name: chemicalName || `Unknown (CAS: ${casNumber})`,
            casNumber: casNumber || 'Unknown',
            status,
            riskLevel
          });

          results.added++;
          results.chemicals.push({
            _id: newChemical._id,
            name: newChemical.name,
            casNumber: newChemical.casNumber,
            status: newChemical.status,
            added: true
          });

          // If regulation is provided, link it to the chemical
          if (regulation) {
            console.log(`Linking new chemical ${newChemical.name} to regulation ${regulation.name}`);

            try {
              // Create new chemical-regulation relationship
              console.log(`Creating chemical-regulation relationship with SML value: ${smlValue || 'none'}`);
              const newRelation = await ChemicalRegulationV2.create({
                chemical: newChemical._id,
                regulation: regulation._id,
                smlValue: smlValue || '',
                smlUnit,
                notes,
                restrictions,
                additionalInfo
              });

              // Update the chemical's chemicalRegulations array
              const updateResult = await Chemical.findByIdAndUpdate(
                newChemical._id,
                { $addToSet: { chemicalRegulations: newRelation._id } },
                { new: true }
              );

              console.log(`Created new relation with ID: ${newRelation._id} and updated chemical's regulations array`);

              // Log the updated chemical for debugging
              console.log(`Updated new chemical regulations array:`, {
                chemicalId: newChemical._id,
                chemicalName: newChemical.name,
                regulationId: regulation._id,
                regulationName: regulation.name,
                relationId: newRelation._id,
                updatedRegulationsArray: updateResult.chemicalRegulations
              });
            } catch (relationError) {
              console.error(`Error linking new chemical to regulation:`, relationError);
              results.errors.push(`Error linking chemical ${newChemical.name} to regulation ${regulation.name}: ${relationError.message}`);
            }
          }
        }
      } catch (rowError) {
        console.error('Error processing row:', rowError, row);
        results.errors.push(`Error processing row: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
        results.skipped++;
      }
    }

    // Prepare the response
    const response = {
      success: true,
      data: {
        ...results,
        regulation: regulation ? {
          _id: regulation._id,
          name: regulation.name
        } : null
      },
      message: `Processed ${data.length} rows: ${results.added} added, ${results.updated} updated, ${results.skipped} skipped`
    };

    if (regulation) {
      response.message += ` (Regulation: ${regulation.name})`;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error importing chemicals:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
