import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Regulation from '@/models/Regulation';

// Add runtime directive for Node.js
export const runtime = 'nodejs';

// GET handler to retrieve a specific regulation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const regulation = await Regulation.findById(id);

    if (!regulation) {
      return NextResponse.json(
        { success: false, error: 'Regulation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: regulation });
  } catch (error) {
    console.error('Error getting regulation:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT handler to update a regulation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    // Find the regulation first to make sure it exists
    const existingRegulation = await Regulation.findById(id);

    if (!existingRegulation) {
      return NextResponse.json(
        { success: false, error: 'Regulation not found' },
        { status: 404 }
      );
    }

    // Log the update data for debugging
    console.log('Updating regulation with data:', {
      id,
      name: body.name,
      shortName: body.shortName,
      shortNameType: typeof body.shortName,
      updateHistory: body.updateHistory,
      fullBody: body
    });

    // Create an update object with explicit fields to ensure all fields are properly updated
    // First, get the existing regulation data to use as defaults for required fields
    const updateObj = {
      name: body.name || existingRegulation.name,
      shortName: body.shortName,
      country: body.country || existingRegulation.country,
      // Ensure region is always set since it's required
      region: body.region || existingRegulation.region,
      description: body.description || existingRegulation.description || '',
      link: body.link || existingRegulation.link || '',
      featured: typeof body.featured !== 'undefined' ? body.featured : existingRegulation.featured,
      categories: body.categories || existingRegulation.categories || [],
      updateDetails: body.updateDetails || existingRegulation.updateDetails || '',
      // Include updateHistory if it exists in the request body
      updateHistory: body.updateHistory || existingRegulation.updateHistory || [],
      // Ensure lastUpdated is set
      lastUpdated: body.lastUpdated || new Date()
    };

    console.log('Existing regulation data:', {
      name: existingRegulation.name,
      shortName: existingRegulation.shortName,
      country: existingRegulation.country,
      region: existingRegulation.region
    });

    // Add file fields if they exist
    if (body.fileId) updateObj.fileId = body.fileId;
    if (body.fileName) updateObj.fileName = body.fileName;
    if (body.fileSize) updateObj.fileSize = body.fileSize;
    if (body.fileType) updateObj.fileType = body.fileType;

    console.log('Using explicit update object:', updateObj);

    // Try a different approach - first find the regulation, then update its fields directly
    // This can sometimes work better with Mongoose than findByIdAndUpdate
    const regulationToUpdate = await Regulation.findById(id);

    if (!regulationToUpdate) {
      return NextResponse.json(
        { success: false, error: 'Regulation not found during update' },
        { status: 404 }
      );
    }

    // Log the regulation before update
    console.log('Regulation before update:', {
      id: regulationToUpdate._id,
      name: regulationToUpdate.name,
      shortName: regulationToUpdate.shortName,
      updateHistory: regulationToUpdate.updateHistory
    });

    // Log the updateObj for debugging
    console.log('Update object with updateHistory:', {
      updateHistory: updateObj.updateHistory,
      updateHistoryLength: updateObj.updateHistory ? updateObj.updateHistory.length : 0
    });

    // Force initialize updateHistory if it doesn't exist or isn't an array
    if (!regulationToUpdate.updateHistory || !Array.isArray(regulationToUpdate.updateHistory)) {
      console.log(`Initializing updateHistory for regulation ${regulationToUpdate._id}`);
      regulationToUpdate.updateHistory = [{
        date: regulationToUpdate.lastUpdated || regulationToUpdate.updatedAt || regulationToUpdate.createdAt || new Date(),
        description: `Initial version of ${regulationToUpdate.name}`
      }];
    }

    // IMPORTANT: Handle update description - using direct MongoDB update
    console.log('Processing updateHistory with current state:', {
      existingHistory: regulationToUpdate.updateHistory,
      updateDescription: body.updateDescription
    });

    // Check if we have a new update description to add
    if (body.updateDescription && body.updateDescription.trim() !== '') {
      console.log('Adding new update description to history:', body.updateDescription);

      try {
        // Create a new update entry with the current date
        const newEntry = {
          date: new Date(),
          description: body.updateDescription.trim()
        };

        console.log('New update entry:', newEntry);

        // Use direct MongoDB update to add the new entry to the updateHistory array
        // This bypasses Mongoose's document handling and directly updates the database
        const rawUpdateResult = await mongoose.connection.db
          .collection('regulations')
          .updateOne(
            { _id: new mongoose.Types.ObjectId(id) },
            { $push: { updateHistory: newEntry } }
          );

        console.log('Raw MongoDB update result:', rawUpdateResult);

        // Refresh the regulation from the database to get the updated updateHistory
        const refreshedRegulation = await Regulation.findById(id);

        if (refreshedRegulation) {
          // Update our local objects with the refreshed data
          regulationToUpdate.updateHistory = refreshedRegulation.updateHistory;
          updateObj.updateHistory = refreshedRegulation.updateHistory;

          console.log('Refreshed updateHistory from database:', regulationToUpdate.updateHistory);
        }
      } catch (updateError) {
        console.error('Error with direct MongoDB update:', updateError);

        // Fallback to the original approach if direct update fails
        console.log('Falling back to original approach...');

        // Ensure updateHistory is initialized as an array
        if (!regulationToUpdate.updateHistory || !Array.isArray(regulationToUpdate.updateHistory)) {
          console.log('Initializing empty updateHistory array');
          regulationToUpdate.updateHistory = [];
        }

        // Make a clean copy of the existing history
        const existingHistory = Array.isArray(regulationToUpdate.updateHistory)
          ? [...regulationToUpdate.updateHistory]
          : [];

        // Create a new update entry with the current date
        const newEntry = {
          date: new Date(),
          description: body.updateDescription.trim()
        };

        // Add the new entry to our history array
        existingHistory.push(newEntry);

        // Set the updateHistory directly on the document
        regulationToUpdate.updateHistory = existingHistory;

        // Explicitly mark the field as modified
        regulationToUpdate.markModified('updateHistory');

        // Also update the updateObj for consistency
        updateObj.updateHistory = existingHistory;
      }
    } else {
      // If no update description, make sure updateHistory is properly initialized
      if (!regulationToUpdate.updateHistory || !Array.isArray(regulationToUpdate.updateHistory)) {
        regulationToUpdate.updateHistory = [];
        regulationToUpdate.markModified('updateHistory');
      }

      // Always update the updateObj to include the updated updateHistory
      updateObj.updateHistory = regulationToUpdate.updateHistory;
    }

    console.log('Final updateHistory to be saved:', regulationToUpdate.updateHistory);

    // Update each field directly
    Object.keys(updateObj).forEach(key => {
      // Skip updateHistory as we've already handled it
      if (key !== 'updateHistory') {
        regulationToUpdate[key] = updateObj[key];
      }
    });

    // Explicitly set the updateHistory field to ensure it's updated
    console.log('Explicitly setting updateHistory to:', updateObj.updateHistory);

    // IMPORTANT: Make sure updateHistory is properly set on the regulationToUpdate object
    console.log('Current updateHistory before final processing:', regulationToUpdate.updateHistory);

    // Ensure updateHistory is properly formatted
    if (regulationToUpdate.updateHistory && Array.isArray(regulationToUpdate.updateHistory)) {
      // Ensure each item in the array has the correct format
      const formattedHistory = regulationToUpdate.updateHistory.map(item => {
        // If the item is already in the correct format, use it as is
        if (item && typeof item === 'object' && item.date && item.description) {
          return {
            date: new Date(item.date),
            description: item.description
          };
        }
        // Otherwise, try to create a valid entry
        return {
          date: new Date(),
          description: typeof item === 'string' ? item : 'Update'
        };
      });

      console.log('Formatted updateHistory array:', formattedHistory);
      regulationToUpdate.updateHistory = formattedHistory;

      // Mark the updateHistory field as modified to ensure Mongoose saves it
      regulationToUpdate.markModified('updateHistory');
    } else {
      // If updateHistory is not an array, initialize it as an empty array
      regulationToUpdate.updateHistory = [];

      // Mark the updateHistory field as modified to ensure Mongoose saves it
      regulationToUpdate.markModified('updateHistory');
    }

    // CRITICAL: Make sure the updateHistory is explicitly set on the regulationToUpdate object
    // This is necessary to ensure it's saved to the database
    console.log('Setting updateHistory directly on regulationToUpdate:', regulationToUpdate.updateHistory);

    // Log the final updateHistory that will be saved
    console.log('Final updateHistory to be saved:', regulationToUpdate.updateHistory);

    // Explicitly set the shortName field to ensure it's updated
    // Use the exact value from the request body, even if it's an empty string
    console.log('Explicitly setting shortName to:', body.shortName);
    regulationToUpdate.shortName = body.shortName;

    // Double-check that the shortName was set correctly
    console.log('After setting shortName, value is:', regulationToUpdate.shortName);

    // IMPORTANT: Make sure all fields are properly set before saving
    console.log('Before saving, updateHistory is:', regulationToUpdate.updateHistory);

    // Save the updated regulation - with special handling for updateHistory
    console.log('Before saving, updateHistory has',
      regulationToUpdate.updateHistory ? regulationToUpdate.updateHistory.length : 0,
      'entries');

    // Make sure updateHistory is properly marked as modified before saving
    regulationToUpdate.markModified('updateHistory');

    // Save the document
    let updatedRegulation = await regulationToUpdate.save();

    console.log('After direct update and save:', {
      name: updatedRegulation.name,
      shortName: updatedRegulation.shortName,
      country: updatedRegulation.country,
      region: updatedRegulation.region,
      updateHistory: updatedRegulation.updateHistory,
      updateHistoryLength: updatedRegulation.updateHistory ? updatedRegulation.updateHistory.length : 0
    });

    // Skip verification since we're using direct MongoDB updates
    // But let's log the current state for debugging
    console.log('Current updateHistory state after save:', {
      length: updatedRegulation.updateHistory ? updatedRegulation.updateHistory.length : 0,
      data: updatedRegulation.updateHistory
    });

    // If we had an update description, verify it was added
    if (body.updateDescription && body.updateDescription.trim() !== '') {
      console.log('Verifying update description was added...');

      // Check if the update description is in the updateHistory
      const descriptionAdded = updatedRegulation.updateHistory &&
        Array.isArray(updatedRegulation.updateHistory) &&
        updatedRegulation.updateHistory.some(entry =>
          entry.description === body.updateDescription.trim()
        );

      if (!descriptionAdded) {
        console.warn('Warning: Update description not found in updateHistory, attempting direct fix...');

        try {
          // Create a new update entry
          const newEntry = {
            date: new Date(),
            description: body.updateDescription.trim()
          };

          // Use direct MongoDB update as a final fallback
          const rawUpdateResult = await mongoose.connection.db
            .collection('regulations')
            .updateOne(
              { _id: new mongoose.Types.ObjectId(id) },
              { $push: { updateHistory: newEntry } }
            );

          console.log('Final fallback update result:', rawUpdateResult);

          // Fetch the updated document to verify
          updatedRegulation = await Regulation.findById(id);

          console.log('After final fallback update, updateHistory:', {
            length: updatedRegulation.updateHistory ? updatedRegulation.updateHistory.length : 0,
            data: updatedRegulation.updateHistory
          });
        } catch (updateError) {
          console.error('Error with final fallback update method:', updateError);
        }
      } else {
        console.log('Update description successfully added to updateHistory');
      }
    }

    // Verify the shortName was saved correctly
    if (updatedRegulation.shortName !== body.shortName) {
      console.warn('Warning: shortName may not have been saved correctly', {
        expected: body.shortName,
        actual: updatedRegulation.shortName
      });

      // Try one more time to update it directly
      updatedRegulation.shortName = body.shortName;
      await updatedRegulation.save();

      console.log('After second save attempt, shortName is:', updatedRegulation.shortName);
    }

    // Log the updated regulation for debugging
    console.log('Updated regulation result:', {
      id: updatedRegulation._id,
      name: updatedRegulation.name,
      shortName: updatedRegulation.shortName
    });

    return NextResponse.json({
      success: true,
      data: updatedRegulation,
      message: 'Regulation updated successfully'
    });
  } catch (error) {
    console.error('Error updating regulation:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a regulation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = await params;

    // Find the regulation first to make sure it exists
    const existingRegulation = await Regulation.findById(id);

    if (!existingRegulation) {
      return NextResponse.json(
        { success: false, error: 'Regulation not found' },
        { status: 404 }
      );
    }

    // Delete the regulation
    await Regulation.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Regulation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting regulation:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
