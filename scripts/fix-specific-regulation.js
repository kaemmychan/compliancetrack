// Direct script to fix a specific regulation in MongoDB
// Run with: node scripts/fix-specific-regulation.js

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  // Connection URL
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  // Create a new MongoClient
  const client = new MongoClient(uri);

  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected to MongoDB');

    // Get the database and collection
    const database = client.db(); // Uses the database from the connection string
    const collection = database.collection('regulations');

    // The specific regulation ID to fix
    const specificId = "6821e779a11011e33b23a592";

    // Find the regulation
    const regulation = await collection.findOne({ _id: new ObjectId(specificId) });

    if (!regulation) {
      console.error(`Regulation with ID ${specificId} not found`);
      return;
    }

    console.log(`Found regulation: ${regulation.name}`);
    console.log(`Current state: Has updateHistory: ${regulation.updateHistory ? 'Yes' : 'No'}`);

    // Create a default updateHistory entry
    const updateHistory = [{
      date: regulation.lastUpdated || regulation.updatedAt || regulation.createdAt || new Date(),
      description: `Initial version of ${regulation.name}`
    }];

    // Update the document
    const result = await collection.updateOne(
      { _id: new ObjectId(specificId) },
      { $set: { updateHistory: updateHistory } }
    );

    if (result.modifiedCount > 0) {
      console.log(`Successfully updated regulation: ${regulation.name}`);

      // Verify the update
      const updatedRegulation = await collection.findOne({ _id: new ObjectId(specificId) });
      console.log(`After update - Has updateHistory: ${updatedRegulation.updateHistory ? 'Yes' : 'No'}`);
      console.log(`UpdateHistory: ${JSON.stringify(updatedRegulation.updateHistory)}`);
    } else {
      console.log(`No changes made to regulation: ${regulation.name}`);
    }

  } finally {
    // Close the connection
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

main().catch(console.error);
