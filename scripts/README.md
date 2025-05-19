# Migration Scripts

This directory contains migration scripts for the database.

## Fix Update History

The `fix-update-history.js` script directly adds the `updateHistory` field to all regulations in the database that don't have it.

### How to Run

1. Make sure you have Node.js installed
2. Make sure your `.env` file contains the `MONGODB_URI` environment variable
3. Run the script:

```bash
node scripts/fix-update-history.js
```

This script will:
- Connect directly to your MongoDB database
- Find all regulations without an `updateHistory` field
- Add a default `updateHistory` entry to each one
- Specifically check and fix the regulation with ID "6821e512a11011e33b23a56e"

### What it Does

- Connects to the MongoDB database
- Finds all regulations
- For each regulation without an `updateHistory` field or with an empty `updateHistory` array:
  - Creates a new `updateHistory` entry based on the `updateDetails` field or creates a default entry
  - Saves the updated regulation

### Expected Output

```
Connecting to MongoDB...
Connected to MongoDB
Finding all regulations...
Found X regulations
Updated regulation: [Regulation Name]
Added updateHistory: [{"date":"2025-05-12T10:57:37.749Z","description":"Initial version of [Regulation Name]"}]
...
Migration complete. Updated Y regulations.
Disconnected from MongoDB
```

## Troubleshooting

If you encounter any issues:

1. Make sure your MongoDB connection string is correct in the `.env` file
2. Check that you have the necessary permissions to access the database
3. Verify that the Regulation model schema matches the actual database schema
