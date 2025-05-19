// Type definitions for regulations and related entities

export interface UpdateHistoryType {
  date: Date;
  description: string;
}

export interface RegulationType {
  _id: string;
  name: string;
  shortName?: string;
  country: string;
  region: string;
  description?: string;
  link?: string;
  lastUpdated?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  featured: boolean;
  categories: string[];
  updateDetails?: string;
  updateHistory?: UpdateHistoryType[];
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  chemicals?: any[]; // Array of chemicals associated with this regulation
}

export interface ChemicalType {
  _id: string;
  name: string;
  casNumber: string;
  status?: string;
  riskLevel?: string;
  riskDescription?: string;
  regulations?: any[]; // Array of regulations associated with this chemical
}
