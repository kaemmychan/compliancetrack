// Direct fix script for regulation updateHistory
// Run with: node scripts/direct-fix-regulation.js

// Import required modules
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/compliance-track';

// Regulation ID to fix
const REGULATION_ID = '6821e779a11011e33b23a592';

async function fixRegulation() {
  // Create a MongoDB client
  const client = new MongoClient(MONGODB_URI);

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB');

    // Get the database and collection
    const db = client.db();
    const collection = db.collection('regulations');

    // Find the regulation
    const regulation = await collection.findOne({ _id: new ObjectId(REGULATION_ID) });

    if (!regulation) {
      console.error(`Regulation with ID ${REGULATION_ID} not found`);
      return;
    }

    console.log('Found regulation:', regulation.name);
    console.log('Current updateHistory:', regulation.updateHistory);

    // Create a new update entry
    const newEntry = {
      date: new Date(),
      description: 'Test entry added by direct fix script'
    };

    // Update the regulation with the new entry
    const result = await collection.updateOne(
      { _id: new ObjectId(REGULATION_ID) },
      { $push: { updateHistory: newEntry } }
    );

    console.log('Update result:', result);

    // Verify the update
    const updatedRegulation = await collection.findOne({ _id: new ObjectId(REGULATION_ID) });
    console.log('Updated updateHistory:', updatedRegulation.updateHistory);
    console.log('Number of entries:', updatedRegulation.updateHistory.length);

    console.log('Fix completed successfully');
  } catch (error) {
    console.error('Error fixing regulation:', error);
  } finally {
    // Close the MongoDB connection
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixRegulation();
