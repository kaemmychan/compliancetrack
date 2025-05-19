// Direct script to fix updateHistory field in MongoDB
// Run with: node scripts/fix-update-history.js

require('dotenv').config();
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

    // Find all regulations without updateHistory field
    const regulations = await collection.find({
      $or: [
        { updateHistory: { $exists: false } },
        { updateHistory: { $eq: [] } },
        { updateHistory: { $eq: null } }
      ]
    }).toArray();

    console.log(`Found ${regulations.length} regulations without updateHistory`);

    // Update each regulation
    let updatedCount = 0;
    for (const regulation of regulations) {
      console.log(`Processing regulation: ${regulation.name} (${regulation._id})`);
      
      // Create a default updateHistory entry
      const updateHistory = [{
        date: regulation.lastUpdated || regulation.updatedAt || regulation.createdAt || new Date(),
        description: `Initial version of ${regulation.name}`
      }];

      // Update the document
      const result = await collection.updateOne(
        { _id: regulation._id },
        { $set: { updateHistory: updateHistory } }
      );

      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`Updated regulation: ${regulation.name}`);
      } else {
        console.log(`No changes made to regulation: ${regulation.name}`);
      }
    }

    console.log(`Updated ${updatedCount} regulations`);

    // Verify the specific document mentioned in the issue
    const specificId = "6821e512a11011e33b23a56e";
    const specificDoc = await collection.findOne({ _id: new ObjectId(specificId) });
    
    if (specificDoc) {
      console.log(`\nVerifying specific document (${specificId}):`);
      console.log(`Name: ${specificDoc.name}`);
      console.log(`Has updateHistory: ${specificDoc.updateHistory ? 'Yes' : 'No'}`);
      
      if (!specificDoc.updateHistory) {
        console.log('Fixing specific document...');
        
        const updateHistory = [{
          date: specificDoc.lastUpdated || specificDoc.updatedAt || specificDoc.createdAt || new Date(),
          description: `Initial version of ${specificDoc.name}`
        }];
        
        const result = await collection.updateOne(
          { _id: new ObjectId(specificId) },
          { $set: { updateHistory: updateHistory } }
        );
        
        if (result.modifiedCount > 0) {
          console.log('Successfully fixed specific document');
          
          // Verify the update
          const updatedDoc = await collection.findOne({ _id: new ObjectId(specificId) });
          console.log(`After update - Has updateHistory: ${updatedDoc.updateHistory ? 'Yes' : 'No'}`);
          console.log(`UpdateHistory: ${JSON.stringify(updatedDoc.updateHistory)}`);
        } else {
          console.log('Failed to fix specific document');
        }
      } else {
        console.log(`UpdateHistory: ${JSON.stringify(specificDoc.updateHistory)}`);
      }
    } else {
      console.log(`\nSpecific document (${specificId}) not found`);
    }

  } finally {
    // Close the connection
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

main().catch(console.error);
