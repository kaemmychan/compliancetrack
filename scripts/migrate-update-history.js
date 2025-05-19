// Migration script to add updateHistory field to existing regulations
// Run this script with: node scripts/migrate-update-history.js

const mongoose = require('mongoose');
require('dotenv').config();

// Define the UpdateHistory schema
const UpdateHistorySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  description: { type: String, required: true }
});

// Define the Regulation schema
const RegulationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    shortName: { type: String },
    country: { type: String, required: true },
    region: {
      type: String,
      enum: ['Europe', 'North America', 'South America', 'Asia', 'Africa', 'Oceania', 'Global'],
      required: true
    },
    description: { type: String, default: '' },
    link: { type: String },
    lastUpdated: { type: Date, default: Date.now },
    featured: { type: Boolean, default: false },
    categories: [{ type: String }],
    updateDetails: { type: String },
    updateHistory: [UpdateHistorySchema],
    fileId: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    fileType: { type: String },
  },
  { timestamps: true }
);

// Create the Regulation model
const Regulation = mongoose.model('Regulation', RegulationSchema);

async function migrateUpdateHistory() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all regulations
    console.log('Finding all regulations...');
    const regulations = await Regulation.find({});
    console.log(`Found ${regulations.length} regulations`);

    // Update each regulation
    let updatedCount = 0;
    for (const regulation of regulations) {
      // Check if updateHistory already exists
      if (!regulation.updateHistory || regulation.updateHistory.length === 0) {
        // Create updateHistory from updateDetails or lastUpdated
        const updateHistory = [];

        // Create a default entry based on lastUpdated
        // Keep this separate from updateDetails
        updateHistory.push({
          date: regulation.lastUpdated || regulation.updatedAt || regulation.createdAt,
          description: `Initial version of ${regulation.name}`
        });

        // Update the regulation
        regulation.updateHistory = updateHistory;
        await regulation.save();
        updatedCount++;

        console.log(`Updated regulation: ${regulation.name}`);
        console.log(`Added updateHistory: ${JSON.stringify(updateHistory)}`);
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
migrateUpdateHistory();
