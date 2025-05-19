// Script to list all regulations in the database
// Run with: node scripts/list-regulations.js

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

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

    // Find all regulations
    const regulations = await collection.find({}).toArray();
    
    console.log(`Found ${regulations.length} regulations:`);
    
    // Print each regulation
    regulations.forEach((regulation, index) => {
      console.log(`\n${index + 1}. Regulation ID: ${regulation._id}`);
      console.log(`   Name: ${regulation.name}`);
      console.log(`   Short Name: ${regulation.shortName || 'N/A'}`);
      console.log(`   Has updateHistory: ${regulation.updateHistory ? 'Yes' : 'No'}`);
      if (regulation.updateHistory) {
        console.log(`   Update History Length: ${regulation.updateHistory.length}`);
      }
    });

  } finally {
    // Close the connection
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

main().catch(console.error);
