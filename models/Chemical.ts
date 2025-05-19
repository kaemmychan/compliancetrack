import mongoose, { Schema, Document, Model } from 'mongoose';

// Define TypeScript interfaces and possible enum values
export type ChemicalStatus = 'allowed' | 'restricted' | 'prohibited' | 'unknown';
export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

export interface IChemical extends Document {
  name: string;
  casNumber: string;
  status: ChemicalStatus;
  riskLevel: RiskLevel;
  riskDescription?: string;
  createdAt: Date;
  updatedAt: Date;
  chemicalRegulations: mongoose.Types.ObjectId[];
  uploadResults: mongoose.Types.ObjectId[];
  calculationResults: mongoose.Types.ObjectId[];
}

const ChemicalSchema: Schema<IChemical> = new Schema(
  {
    name: { type: String, required: true },
    casNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['allowed', 'restricted', 'prohibited', 'unknown'],
      default: 'allowed'
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'unknown'],
      default: 'low'
    },
    riskDescription: { type: String },
    chemicalRegulations: [
      { type: Schema.Types.ObjectId, ref: 'ChemicalRegulation' }
    ],
    uploadResults: [{ type: Schema.Types.ObjectId, ref: 'UploadResult' }],
    calculationResults: [
      { type: Schema.Types.ObjectId, ref: 'CalculationResult' }
    ],
  },
  {
    timestamps: true,
  }
);

// Create or reuse the Chemical model
const Chemical: Model<IChemical> =
  mongoose.models.Chemical || mongoose.model<IChemical>('Chemical', ChemicalSchema);

export default Chemical;