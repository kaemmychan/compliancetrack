// Script to fix the updateHistory for a specific regulation
// Run with: node scripts/fix-specific-regulation-history.js

const mongoose = require('mongoose');
require('dotenv').config();

// Define the MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/compliance-track';

// The ID of the regulation to fix
const REGULATION_ID = '6821e779a11011e33b23a592';

async function fixRegulationHistory() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get direct access to the regulations collection
    const db = mongoose.connection.db;
    const collection = db.collection('regulations');

    // Find the regulation
    const regulation = await collection.findOne({ _id: new mongoose.Types.ObjectId(REGULATION_ID) });

    if (!regulation) {
      console.error(`Regulation with ID ${REGULATION_ID} not found`);
      return;
    }

    console.log(`Found regulation: ${regulation.name}`);
    console.log(`Current updateHistory:`, regulation.updateHistory);

    // Create a new updateHistory array with the existing entry
    let updateHistory = [];
    
    // Add the initial entry if it exists
    if (regulation.updateHistory && Array.isArray(regulation.updateHistory) && regulation.updateHistory.length > 0) {
      updateHistory = [...regulation.updateHistory];
      console.log('Preserved existing updateHistory entries:', updateHistory.length);
    } else {
      // Create a default entry if none exists
      updateHistory.push({
        date: regulation.lastUpdated || regulation.updatedAt || regulation.createdAt || new Date(),
        description: `Initial version of ${regulation.name}`
      });
      console.log('Created default updateHistory entry');
    }

    // Add a new test entry
    const newEntry = {
      date: new Date(),
      description: 'Test entry added by fix script'
    };
    updateHistory.push(newEntry);
    console.log('Added new test entry:', newEntry);

    // Update the document directly in MongoDB
    const result = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(REGULATION_ID) },
      { $set: { updateHistory: updateHistory } }
    );

    console.log('Update result:', result);

    // Verify the update
    const updatedRegulation = await collection.findOne({ _id: new mongoose.Types.ObjectId(REGULATION_ID) });
    console.log('Updated regulation updateHistory:', updatedRegulation.updateHistory);
    console.log('Number of entries:', updatedRegulation.updateHistory.length);

    console.log('Fix completed successfully');
  } catch (error) {
    console.error('Error fixing regulation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
fixRegulationHistory();
