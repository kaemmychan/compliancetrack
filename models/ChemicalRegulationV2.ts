import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChemicalRegulation extends Document {
  chemical: mongoose.Types.ObjectId;
  regulation: mongoose.Types.ObjectId;
  smlValue: string; // Specific Migration Limit value
  smlUnit: string; // Unit for SML value (e.g., mg/kg)
  notes: string; // Additional notes about the chemical in this regulation
  restrictions: string; // Any restrictions on the chemical's use
  additionalInfo: Record<string, any>; // Any additional information as key-value pairs in a plain object
  createdAt: Date;
  updatedAt: Date;
}

const ChemicalRegulationSchema: Schema<IChemicalRegulation> = new Schema(
  {
    chemical: {
      type: Schema.Types.ObjectId,
      ref: 'Chemical',
      required: true
    },
    regulation: {
      type: Schema.Types.ObjectId,
      ref: 'Regulation',
      required: true
    },
    smlValue: { type: String },
    smlUnit: { type: String, default: 'mg/kg' },
    notes: { type: String, default: '' },
    restrictions: { type: String, default: '' },
    additionalInfo: { type: Schema.Types.Mixed, default: {} }, // Using Mixed type for flexibility
  },
  { timestamps: true }
);

// Create a compound index to ensure a chemical can only be linked to a regulation once
ChemicalRegulationSchema.index({ chemical: 1, regulation: 1 }, { unique: true });

// Create a new model with a different name to avoid caching issues
const ChemicalRegulationV2: Model<IChemicalRegulation> = 
  mongoose.models.ChemicalRegulationV2 || 
  mongoose.model<IChemicalRegulation>('ChemicalRegulationV2', ChemicalRegulationSchema);

export default ChemicalRegulationV2;
