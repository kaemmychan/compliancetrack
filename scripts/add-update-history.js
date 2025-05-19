// Direct migration script to add updateHistory field to all regulations
// Run this script with: node scripts/add-update-history.js

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    return false;
  }
}

// Add updateHistory field to all regulations
async function addUpdateHistoryField() {
  try {
    // Connect to MongoDB
    const connected = await connectToMongoDB();
    if (!connected) {
      console.error('Failed to connect to MongoDB. Exiting...');
      return;
    }

    // Get the regulations collection
    const db = mongoose.connection.db;
    const regulationsCollection = db.collection('regulations');

    // Find all regulations
    console.log('Finding all regulations...');
    const regulations = await regulationsCollection.find({}).toArray();
    console.log(`Found ${regulations.length} regulations`);

    // Update each regulation
    let updatedCount = 0;
    for (const regulation of regulations) {
      // Check if updateHistory already exists
      if (!regulation.updateHistory) {
        // Create a default updateHistory entry
        const updateHistory = [{
          date: regulation.lastUpdated || regulation.updatedAt || regulation.createdAt || new Date(),
          description: `Initial version of ${regulation.name}`
        }];

        // Update the regulation directly in the database
        const result = await regulationsCollection.updateOne(
          { _id: regulation._id },
          { $set: { updateHistory: updateHistory } }
        );

        if (result.modifiedCount > 0) {
          updatedCount++;
          console.log(`Updated regulation: ${regulation.name}`);
          console.log(`Added updateHistory: ${JSON.stringify(updateHistory)}`);
        }
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} regulations.`);
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
addUpdateHistoryField();
