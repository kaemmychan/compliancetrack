import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUpdateHistory {
  date: Date;
  description: string;
}

export interface IRegulation extends Document {
  name: string;
  shortName?: string;     // Short name for display in tables
  country: string;
  region: string;
  description: string;
  link?: string;
  lastUpdated: Date;
  featured: boolean;
  categories: string[];
  updateDetails?: string;
  updateHistory?: IUpdateHistory[];  // Array of update history entries
  fileId?: string;        // GridFS file ID
  fileName?: string;      // Original file name
  fileSize?: number;      // File size in bytes
  fileType?: string;      // MIME type of the file
  createdAt: Date;
  updatedAt: Date;
}

const RegulationSchema: Schema<IRegulation> = new Schema(
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
    updateHistory: [{
      date: { type: Date, default: Date.now },
      description: { type: String, required: true }
    }],
    fileId: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    fileType: { type: String },
  },
  { timestamps: true }
);

// Create or reuse the Regulation model
const Regulation: Model<IRegulation> =
  mongoose.models.Regulation || mongoose.model<IRegulation>('Regulation', RegulationSchema);

export default Regulation;
