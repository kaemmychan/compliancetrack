"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Loader2 } from "lucide-react"

// Define update history type
type UpdateHistoryType = {
  date: Date;
  description: string;
}

// Define the regulation type
type RegulationType = {
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
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  updateDetails?: string;
  updateHistory?: UpdateHistoryType[];
}

// Define the props for the component
interface UpdateRegulationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regulation: RegulationType | null;
  onUpdate: (regulation: RegulationType) => Promise<void>;
  categories: string[];
  isLoading: boolean;
  uploadedFile: any;
}

export default function UpdateRegulationDialog({
  open,
  onOpenChange,
  regulation,
  onUpdate,
  categories,
  isLoading,
  uploadedFile
}: UpdateRegulationDialogProps) {
  // State for the form data
  const [formData, setFormData] = useState<RegulationType | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState("");
  const [updateDescription, setUpdateDescription] = useState("");

  // Update the form data when the regulation changes
  useEffect(() => {
    if (regulation) {
      console.log('Setting form data with regulation:', {
        id: regulation._id,
        name: regulation.name,
        shortName: regulation.shortName,
        shortNameType: typeof regulation.shortName,
        fullRegulation: regulation
      });

      // Create a deep copy to avoid reference issues
      const regulationCopy = JSON.parse(JSON.stringify(regulation));

      // Make sure to explicitly set shortName, even if it's undefined or null
      // Also ensure updateHistory is initialized as an array
      const updatedFormData = {
        ...regulationCopy,
        shortName: regulationCopy.shortName || '',
        updateHistory: regulationCopy.updateHistory || []
      };

      console.log('Updated form data prepared:', {
        id: updatedFormData._id,
        name: updatedFormData.name,
        shortName: updatedFormData.shortName,
        shortNameType: typeof updatedFormData.shortName
      });

      setFormData(updatedFormData);
      setSelectedCategories(regulationCopy.categories || []);
    }
  }, [regulation]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    // Generate a default shortName if one doesn't exist
    let shortNameToUse = formData.shortName;
    if (!shortNameToUse || shortNameToUse.trim() === '') {
      // For "Commission Regulation (EU) No 10/2011" -> "EU10/2011"
      const match = formData.name.match(/\(([^)]+)\)[^0-9]*([0-9]+\/[0-9]+)/i);
      if (match && match.length >= 3) {
        shortNameToUse = `${match[1]}${match[2]}`.replace(/\s+/g, '');
      } else {
        // Fallback: take first 10 characters
        shortNameToUse = formData.name.substring(0, 10) + '...';
      }
      console.log('Generated default shortName for submission:', shortNameToUse);
    }

    // Create a copy of the form data with the selected categories
    const updatedRegulation = {
      ...formData,
      categories: selectedCategories,
      // Explicitly ensure shortName is included
      shortName: shortNameToUse
    };

    // Add update description to the regulation object
    if (updateDescription.trim()) {
      // Add the update description to the regulation object
      updatedRegulation.updateDescription = updateDescription.trim();

      // Log the update description
      console.log('Adding update description to regulation:', updateDescription.trim());
    }

    // Ensure updateHistory is initialized
    updatedRegulation.updateHistory = formData.updateHistory && Array.isArray(formData.updateHistory)
      ? [...formData.updateHistory]
      : [];

    // Log the regulation data being submitted, focusing on shortName and updateHistory
    console.log('Submitting regulation update with data:', {
      id: updatedRegulation._id,
      name: updatedRegulation.name,
      shortName: updatedRegulation.shortName,
      shortNameType: typeof updatedRegulation.shortName,
      updateHistory: updatedRegulation.updateHistory,
      updateHistoryLength: updatedRegulation.updateHistory ? updatedRegulation.updateHistory.length : 0
    });

    // Add the uploaded file if available
    if (uploadedFile) {
      updatedRegulation.fileId = uploadedFile.fileId;
      updatedRegulation.fileName = uploadedFile.fileName;
      updatedRegulation.fileSize = uploadedFile.fileSize;
      updatedRegulation.fileType = uploadedFile.fileType;
    }

    // Final check to ensure shortName and updateHistory are properly set
    console.log('Final regulation data before submission:', {
      id: updatedRegulation._id,
      name: updatedRegulation.name,
      shortName: updatedRegulation.shortName,
      shortNameType: typeof updatedRegulation.shortName,
      updateHistory: updatedRegulation.updateHistory,
      updateHistoryLength: updatedRegulation.updateHistory ? updatedRegulation.updateHistory.length : 0,
      allKeys: Object.keys(updatedRegulation)
    });

    // Call the onUpdate function
    await onUpdate(updatedRegulation);

    // Reset the update description field after submission
    setUpdateDescription("");
  };

  // Toggle a category
  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  // Add a custom category
  const addCustomCategory = () => {
    if (customCategory.trim() && !selectedCategories.includes(customCategory)) {
      setSelectedCategories([...selectedCategories, customCategory]);
      setCustomCategory("");
    }
  };

  // If no regulation is provided, don't render anything
  if (!formData) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        // Reset the update description field when the dialog is closed
        if (!open) {
          setUpdateDescription("");
        }
        onOpenChange(open);
      }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Update Regulation</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4 py-4 overflow-y-auto pr-2" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="update-reg-name">Regulation Name*</Label>
              <Input
                id="update-reg-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="update-reg-short-name">Short Name</Label>
              <Input
                id="update-reg-short-name"
                value={formData.shortName !== undefined ? formData.shortName : ''}
                onChange={(e) => {
                  const newShortName = e.target.value;
                  console.log('Short name changed to:', newShortName);
                  console.log('Current formData before update:', {
                    id: formData._id,
                    name: formData.name,
                    shortName: formData.shortName,
                    shortNameType: typeof formData.shortName
                  });

                  // Create a new object to ensure React detects the change
                  const updatedFormData = {
                    ...formData,
                    shortName: newShortName
                  };

                  console.log('Updated formData after change:', {
                    id: updatedFormData._id,
                    name: updatedFormData.name,
                    shortName: updatedFormData.shortName,
                    shortNameType: typeof updatedFormData.shortName
                  });

                  setFormData(updatedFormData);
                }}
                placeholder="e.g., EU10/2011"
              />

            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="update-reg-country">Country/Authority*</Label>
              <Input
                id="update-reg-country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="update-reg-region">Region*</Label>
              <Select
                value={formData.region}
                onValueChange={(value) => setFormData({ ...formData, region: value })}
              >
                <SelectTrigger id="update-reg-region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe">Europe</SelectItem>
                  <SelectItem value="North America">North America</SelectItem>
                  <SelectItem value="South America">South America</SelectItem>
                  <SelectItem value="Asia">Asia</SelectItem>
                  <SelectItem value="Africa">Africa</SelectItem>
                  <SelectItem value="Oceania">Oceania</SelectItem>
                  <SelectItem value="Global">Global</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="update-reg-description">Description*</Label>
            <Textarea
              id="update-reg-description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the regulation"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="update-reg-details">Detailed Information</Label>
            <Textarea
              id="update-reg-details"
              value={formData.updateDetails || ''}
              onChange={(e) => setFormData({ ...formData, updateDetails: e.target.value })}
              placeholder="Enter detailed information about the regulation"
              rows={5}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="update-description" className="flex items-center">
              <span className="text-yellow-600 font-medium">Update Description</span>
              <span className="ml-2 text-xs text-muted-foreground">(Describe what has been updated in this regulation)</span>
            </Label>
            <Textarea
              id="update-description"
              value={updateDescription}
              onChange={(e) => setUpdateDescription(e.target.value)}
              placeholder="Example: Updated migration limits for substances X, Y, Z"
              rows={3}
              className="border-yellow-200 focus-visible:ring-yellow-500"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="update-reg-link">Official Link</Label>
            <Input
              id="update-reg-link"
              value={formData.link || ''}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="e.g., https://eur-lex.europa.eu/..."
            />
          </div>

          <div className="grid gap-2">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategories.includes(category) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add custom category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={addCustomCategory}>
                Add
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <Switch
              id="update-featured-regulation"
              checked={formData.featured}
              onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
            />
            <Label htmlFor="update-featured-regulation">Feature on homepage</Label>
          </div>
        </form>
        <DialogFooter className="mt-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              'Update Regulation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
