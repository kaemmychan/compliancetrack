"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Database,
  Download,
  FileText,
  History,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Upload,
  LinkIcon,
  CheckCircle,
  Star,
  CalendarIcon,
  Loader2,
  Search,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { useAuth } from "@/lib/auth-provider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import UpdateRegulationDialog from "@/components/UpdateRegulationDialog"
import {
  addChemical,
  updateChemical,
  deleteChemical,
  fetchRegulations,
  addRegulation,
  deleteRegulation,
  addChemicalRegulation,
  uploadRegulationFile,
  fetchChemicals,
  searchChemicals
} from "@/lib/api"

// Mock data for demonstration
const mockChemicals = [
  { id: 1, name: "Bisphenol A", casNumber: "80-05-7", status: "restricted", riskLevel: "high" },
  { id: 2, name: "Titanium Dioxide", casNumber: "13463-67-7", status: "allowed", riskLevel: "low" },
  { id: 3, name: "Diethylhexyl Phthalate", casNumber: "117-81-7", status: "prohibited", riskLevel: "high" },
  { id: 4, name: "Polyethylene Terephthalate", casNumber: "25038-59-9", status: "allowed", riskLevel: "low" },
  { id: 5, name: "Formaldehyde", casNumber: "50-00-0", status: "restricted", riskLevel: "medium" },
]

const mockRegulations = [
  {
    id: 1,
    name: "Regulation (EU) 10/2011",
    country: "European Union",
    region: "Europe",
    lastUpdated: "2020-09-23",
    featured: true,
  },
  {
    id: 4,
    name: "FDA 21 CFR 175-178",
    country: "United States",
    region: "North America",
    lastUpdated: "2023-04-01",
    featured: true,
  },
  { id: 7, name: "GB 9685-2016", country: "China", region: "Asia", lastUpdated: "2016-10-19", featured: true },
  { id: 9, name: "JHOSPA Positive List", country: "Japan", region: "Asia", lastUpdated: "2018-06-15", featured: true },
  {
    id: 2,
    name: "Regulation (EC) 1935/2004",
    country: "European Union",
    region: "Europe",
    lastUpdated: "2019-11-10",
    featured: false,
  },
]

const mockHistory = [
  { id: 1, date: "2023-05-15", user: "admin@example.com", action: "Upload", details: "Uploaded 25 chemicals" },
  { id: 2, date: "2023-05-20", user: "admin@example.com", action: "Edit", details: "Updated Regulation EU 10/2011" },
  { id: 3, date: "2023-06-01", user: "admin@example.com", action: "Add", details: "Added new chemical: Zinc Oxide" },
  { id: 4, date: "2023-06-10", user: "admin@example.com", action: "Delete", details: "Removed obsolete regulation" },
]

// Add history tracking for non-admin users
// Add this to the history tab content

// Mock data for user activity
const mockUserActivity = [
  { id: 1, date: "2023-06-15", user: "user@example.com", action: "Search", details: "Searched for 'Bisphenol A'" },
  { id: 2, date: "2023-06-16", user: "user@example.com", action: "View", details: "Viewed Regulation EU 10/2011" },
  {
    id: 3,
    date: "2023-06-17",
    user: "guest@example.com",
    action: "Search",
    details: "Searched for 'Titanium Dioxide'",
  },
  {
    id: 4,
    date: "2023-06-18",
    user: "user@example.com",
    action: "Calculate",
    details: "Performed M value calculation",
  },
]

// Category tags for regulations
const regulationCategories = [
  "General",
  "Food Contact",
  "Electronic Equipment",
  "Drinking Water",
  "Medical Devices",
  "Cosmetics",
  "Toys",
  "Packaging",
  "Textiles",
  "Construction Materials"
]

// Regions for regulations
const predefinedRegions = ["Europe", "North America", "South America", "Asia", "Africa", "Oceania", "Global"]

export default function AdminPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const highlightParam = searchParams.get("highlight")
  const [activeTab, setActiveTab] = useState(tabParam || "chemicals")
  const [highlightedRegulationId, setHighlightedRegulationId] = useState<string | null>(highlightParam)

  // Log the highlight parameter for debugging
  useEffect(() => {
    if (highlightParam) {
      console.log('Highlight parameter from URL:', highlightParam);
    }
  }, [highlightParam])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddRegulationForm, setShowAddRegulationForm] = useState(false)
  const [addRegulationMethod, setAddRegulationMethod] = useState<"form" | "upload" | "link">("form")

  // Data states
  // Use a simpler type for chemicals to avoid TypeScript issues with Mongoose Document
  type ChemicalType = {
    _id: string;
    name: string;
    casNumber: string;
    status: string;
    riskLevel: string;
    riskDescription?: string;
    chemicalRegulations: any[];
    createdAt?: Date;
    updatedAt?: Date;
  }

  type UpdateHistoryType = {
    date: Date;
    description: string;
  }

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
    updateDetails?: string;
    updateHistory?: UpdateHistoryType[];
    updateDescription?: string; // Added for handling update descriptions
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  }

  const [chemicals, setChemicals] = useState<ChemicalType[]>([])
  const [regulations, setRegulations] = useState<RegulationType[]>([])
  const [chemicalSearchQuery, setChemicalSearchQuery] = useState("")
  const [loading, setLoading] = useState({
    chemicals: false,
    regulations: false,
    addChemical: false,
    addRegulation: false,
    updateChemical: false,
    updateRegulation: false,
    deleteChemical: false,
    deleteRegulation: false,
    uploadFile: false,
    searchChemicals: false
  })
  const [error, setError] = useState<string | null>(null)

  const [showAddChemicalDialog, setShowAddChemicalDialog] = useState(false)
  const [newChemical, setNewChemical] = useState({
    name: "",
    casNumber: "",
    status: "allowed",
    riskLevel: "low",
    riskDescription: ""
  })

  // New regulation form state
  const [newRegulation, setNewRegulation] = useState({
    name: "",
    shortName: "",
    country: "",
    region: "",
    description: "",
    link: "",
    featured: false,
    updateDetails: "",
  })

  // State for regulation file upload
  const [regulationFile, setRegulationFile] = useState<File | null>(null)
  const [uploadedRegulationFile, setUploadedRegulationFile] = useState<{
    fileId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  } | null>(null)

  const [newRegulationTags, setNewRegulationTags] = useState<string[]>([])
  const [customRegion, setCustomRegion] = useState("")
  const [showCustomRegion, setShowCustomRegion] = useState(false)

  // State for the new chemical form with real regulation IDs
  const [selectedRegulations, setSelectedRegulations] = useState<{ id: string; name: string; sml: string }[]>([])
  const [showRegulationSelector, setShowRegulationSelector] = useState(false)
  const [currentRegulation, setCurrentRegulation] = useState<{ id: string; name: string; sml: string } | null>(null)

  // Update the Add New Regulation form to allow custom category input
  // Add this state for custom category
  const [customCategory, setCustomCategory] = useState("")
  const [customRegulationName, setCustomRegulationName] = useState("")

  // State for Excel import settings
  const [excelImportSettings, setExcelImportSettings] = useState({
    status: "allowed",
    riskLevel: "low",
    regulation: "", // Will be set to a real regulation ID
    category: "Food Contact",
    region: "Europe",
  })

  // Add a state for the uploaded filename
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [isFileUploaded, setIsFileUploaded] = useState(false)

  // Add after the other state declarations
  const [showUpdateRegulationDialog, setShowUpdateRegulationDialog] = useState(false)
  const [currentRegulationToUpdate, setCurrentRegulationToUpdate] = useState<any>(null)

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined,
  })

  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportType, setExportType] = useState<"admin" | "user">("admin")

  const toggleRegulationTag = (tag: string) => {
    if (newRegulationTags.includes(tag)) {
      setNewRegulationTags(newRegulationTags.filter((t) => t !== tag))
    } else {
      setNewRegulationTags([...newRegulationTags, tag])
    }
  }

  // Editing functionality
  const cancelEditing = () => {
    setEditingId(null)
  }

  const handleAddRegulation = async () => {
    try {
      setLoading(prev => ({ ...prev, addRegulation: true }));
      setError(null);

      // Validate required fields
      if (!newRegulation.name || !newRegulation.country || !newRegulation.region) {
        setError('Regulation name, country, and region are required');
        return;
      }

      // Prepare the regulation data
      // Explicitly include all fields, especially updateDetails
      const regulationData: any = {
        name: newRegulation.name,
        shortName: newRegulation.shortName,
        country: newRegulation.country,
        region: newRegulation.region,
        description: newRegulation.description || '',
        link: newRegulation.link || '',
        featured: newRegulation.featured || false,
        updateDetails: newRegulation.updateDetails || '',
        categories: newRegulationTags,
        // Initialize updateHistory with a default entry - keep separate from updateDetails
        updateHistory: [{
          date: new Date(),
          description: `Initial version of ${newRegulation.name}`
        }],
      };

      // If we have an uploaded file, add the file details to the regulation data
      if (uploadedRegulationFile) {
        regulationData.fileId = uploadedRegulationFile.fileId;
        regulationData.fileName = uploadedRegulationFile.fileName;
        regulationData.fileSize = uploadedRegulationFile.fileSize;
        regulationData.fileType = uploadedRegulationFile.fileType;
      }

      console.log('Submitting regulation data:', regulationData);
      console.log('Regulation details being sent:', regulationData.updateDetails);

      // Add the regulation to the database
      const result = await addRegulation(regulationData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to add regulation');
      }

      console.log('Regulation added successfully:', result);

      // Refresh the regulations list to show the newly added regulation
      await fetchRegulationsData();

      // Reset form and close dialog
      setShowAddRegulationForm(false);

      // Make sure the Regulations tab is active
      setActiveTab("regulations");

      // Reset all form state
      setNewRegulation({
        name: "",
        shortName: "",
        country: "",
        region: "",
        description: "",
        link: "",
        featured: false,
        updateDetails: "",
      });
      setNewRegulationTags([]);
      setCustomRegion("");
      setShowCustomRegion(false);
      setRegulationFile(null);
      setUploadedRegulationFile(null);

      // Show success message
      alert(`Regulation "${regulationData.name}" has been successfully added.`);

    } catch (err: any) {
      console.error('Error adding regulation:', err);
      setError(err.message || 'Failed to add regulation. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, addRegulation: false }));
    }
  }

  // Function to handle adding a regulation to a chemical
  const addRegulationToChemical = () => {
    if (currentRegulation) {
      // Check if this regulation is already selected
      const alreadySelected = selectedRegulations.some(reg => reg.id === currentRegulation.id);

      if (!alreadySelected) {
        setSelectedRegulations([...selectedRegulations, currentRegulation]);
      } else {
        setError('This regulation is already added to the chemical');
      }

      setCurrentRegulation(null);
      setShowRegulationSelector(false);
    }
  }

  // Function to remove a regulation from a chemical
  const removeRegulationFromChemical = (index: number) => {
    const newRegulations = [...selectedRegulations];
    newRegulations.splice(index, 1);
    setSelectedRegulations(newRegulations);
  }

  // This function is now replaced by handleAddChemicalSubmit

  // Handle file upload for chemicals
  const handleChemicalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setLoading(prev => ({ ...prev, addChemical: true }));
        setError(null);

        const file = e.target.files[0];
        console.log('Selected file:', file.name, 'Size:', file.size, 'Type:', file.type);

        // Prepare import options with proper TypeScript interface
        interface ImportOptions {
          status: string;
          riskLevel: string;
          category: string;
          region: string;
          regulationId?: string;
          regulationName?: string;
        }

        const importOptions: ImportOptions = {
          status: excelImportSettings.status,
          riskLevel: excelImportSettings.riskLevel,
          category: excelImportSettings.category,
          region: excelImportSettings.region
        };

        // Add either regulationId or regulationName, but not both
        if (excelImportSettings.regulation) {
          console.log('Using existing regulation ID:', excelImportSettings.regulation);

          // Find the regulation in the regulations array for debugging
          const selectedRegulation = regulations.find(r => r._id === excelImportSettings.regulation);
          console.log('Selected regulation details:', selectedRegulation ?
            { id: selectedRegulation._id, name: selectedRegulation.name } :
            'Regulation not found in local state');

          importOptions.regulationId = excelImportSettings.regulation;
        } else if (customRegulationName) {
          console.log('Using custom regulation name:', customRegulationName);
          importOptions.regulationName = customRegulationName;
        }

        console.log('Import options:', importOptions);

        try {
          // Create a FormData object manually
          const formData = new FormData();
          formData.append('file', file);

          // Add options to the form data
          if (importOptions.status) {
            formData.append('status', importOptions.status);
          }

          if (importOptions.riskLevel) {
            formData.append('riskLevel', importOptions.riskLevel);
          }

          if (importOptions.regulationId) {
            formData.append('regulationId', importOptions.regulationId);
          }

          if (importOptions.regulationName) {
            formData.append('regulationName', importOptions.regulationName);
          }

          if (importOptions.category) {
            formData.append('category', importOptions.category);
          }

          if (importOptions.region) {
            formData.append('region', importOptions.region);
          }

          // Log the form data for debugging
          console.log('Form data entries:');
          for (const [key, value] of formData.entries()) {
            console.log(`${key}: ${value instanceof File ? value.name : value}`);
          }

          // Make the fetch request directly
          console.log('Sending request to /api/chemicals/import');
          const response = await fetch('/api/chemicals/import', {
            method: 'POST',
            body: formData,
          });

          console.log('Response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Server error: ${response.status}. ${errorText}`);
          }

          const result = await response.json();
          console.log('Import result:', result);

          if (result.success) {
            // Show success message
            let successMessage = `Successfully processed ${result.data.added + result.data.updated} chemicals:
            - ${result.data.added} new chemicals added
            - ${result.data.updated} existing chemicals updated
            - ${result.data.skipped} rows skipped or had errors`;

            // Add regulation information if available
            if (result.data.regulation) {
              successMessage += `\n\nRegulation: ${result.data.regulation.name}`;
              successMessage += `\n\nAll imported chemicals have been linked to this regulation and will appear in:
              - The chemical details page
              - Search results
              - The regulation details page`;
            }

            alert(successMessage);

            // Refresh the chemicals list and regulations
            console.log("Refreshing data after import...");

            // First fetch regulations to ensure we have the latest data
            await fetchRegulationsData();

            // Then fetch chemicals with a small delay to ensure the server has time to process
            setTimeout(async () => {
              await fetchChemicalsData();
              console.log("Data refreshed after import");
            }, 1000);

            // Close the dialog
            setShowAddChemicalDialog(false);
          } else {
            throw new Error(result.error || 'Failed to import chemicals');
          }
        } catch (fetchError: any) {
          console.error('Fetch error:', fetchError);
          throw new Error(`Failed to import chemicals: ${fetchError.message}`);
        }
      } catch (err: any) {
        console.error('Error importing chemicals:', err);
        setError(err.message || 'Failed to import chemicals. Please try again.');
      } finally {
        setLoading(prev => ({ ...prev, addChemical: false }));
      }
    }
  }

  const toggleFeatured = async (id: string) => {
    try {
      setLoading(prev => ({ ...prev, updateRegulation: true }));
      setError(null);

      // Find the regulation
      const regulation = regulations.find(r => r._id === id);
      if (!regulation) return;

      // Toggle the featured status
      const updatedRegulation = {
        ...regulation,
        featured: !regulation.featured
      };

      // Update the regulation in the database
      // When featuring a regulation, also update lastUpdated to make it appear at the top of the home page
      const updateData = {
        featured: !regulation.featured,
        // If we're featuring the regulation, update lastUpdated to now
        ...((!regulation.featured) && { lastUpdated: new Date() })
      };

      const response = await fetch(`/api/regulations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update regulation');
      }

      // Update the local state
      setRegulations(regulations.map(r => r._id === id ? updatedRegulation : r));

      // Show a success message
      const message = regulation.featured
        ? `Regulation "${regulation.name}" removed from homepage`
        : `Regulation "${regulation.name}" will now appear on homepage (at the top of the list)`;

      alert(message);
    } catch (err) {
      console.error('Error toggling featured status:', err);
      setError('Failed to update regulation. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, updateRegulation: false }));
    }
  }

  // Update the getRiskBadge function to handle "unknown" risk level
  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "low":
        return <Badge className="bg-green-500">Low Risk</Badge>
      case "medium":
        return <Badge className="bg-yellow-500">Medium Risk</Badge>
      case "high":
        return <Badge className="bg-red-500">High Risk</Badge>
      case "unknown":
        return <Badge className="bg-gray-400">Not Specified</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  const checkAuthentication = useCallback(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  // Fetch chemicals from the database
  const fetchChemicalsData = useCallback(async (searchQuery?: string) => {
    try {
      setLoading(prev => ({ ...prev, chemicals: true }))
      setError(null)

      console.log(`Fetching chemicals${searchQuery ? ` with query: ${searchQuery}` : ''}`);

      // Use the appropriate API function based on whether we have a search query
      let chemicalsData;
      if (searchQuery) {
        // Use searchChemicals for searching
        chemicalsData = await searchChemicals(searchQuery);
      } else {
        // Use fetchChemicals for getting all chemicals
        chemicalsData = await fetchChemicals();
      }

      // Log the fetched chemicals data for debugging
      console.log('Fetched chemicals data:', chemicalsData);

      // Make sure chemicalsData is an array before setting state
      if (Array.isArray(chemicalsData)) {
        // If we have chemicals with regulations, log the first one for debugging
        if (chemicalsData.length > 0 && chemicalsData[0].chemicalRegulations && chemicalsData[0].chemicalRegulations.length > 0) {
          console.log('First chemical regulation details:', chemicalsData[0].chemicalRegulations[0]);
        }
        
        setChemicals(chemicalsData);
      } else {
        console.error('Invalid chemicals data format received. Expected array, got:', typeof chemicalsData);
        setError('Invalid data format received from server. Please refresh and try again.');
        setChemicals([]); // Set to empty array to avoid the map error
      }
    } catch (err) {
      console.error('Error fetching chemicals:', err)
      setError(`Failed to load chemicals: ${err instanceof Error ? err.message : 'Unknown error'}`)
                                      console.error('Error adding custom regulation:', err);
                                      setError('Failed to add custom regulation. Please try again.');
                                    }
                                  }
                                }}
                              >
                                Continue
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowRegulationSelector(true)}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" /> Add Existing
                      </Button>
                    </div>
                  </div>

                  {selectedRegulations.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Regulation</TableHead>
                          <TableHead>SML Value (mg/kg)</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRegulations.map((reg, index) => {
                          // Find the regulation in the regulations list
                          const regulationInfo = regulations.find((r) => r._id === reg.id);
                          return (
                            <TableRow key={index}>
                              <TableCell>{reg.name}</TableCell>
                              <TableCell>{reg.sml}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {regulationInfo?.categories?.[0] || excelImportSettings.category || "General"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button size="icon" variant="ghost" onClick={() => removeRegulationFromChemical(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">No regulations added yet</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="file" className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                <div className="border rounded-md p-4 mb-4">
                  <h3 className="text-lg font-medium mb-4">Default Settings for Imported Chemicals</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    All chemicals imported from the file will be assigned these default values. You can edit individual
                    chemicals later.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="default-status">Default Status</Label>
                      <Select
                        value={excelImportSettings.status}
                        onValueChange={(value) => setExcelImportSettings({ ...excelImportSettings, status: value })}
                      >
                        <SelectTrigger id="default-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          <SelectItem value="allowed">Allowed</SelectItem>
                          <SelectItem value="restricted">Restricted</SelectItem>
                          <SelectItem value="prohibited">Prohibited</SelectItem>
                          <SelectItem value="unknown">Not Specified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="default-risk">Default Risk Level</Label>
                      <Select
                        value={excelImportSettings.riskLevel}
                        onValueChange={(value) => setExcelImportSettings({ ...excelImportSettings, riskLevel: value })}
                      >
                        <SelectTrigger id="default-risk">
                          <SelectValue placeholder="Select risk level" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          <SelectItem value="low">Low Risk</SelectItem>
                          <SelectItem value="medium">Medium Risk</SelectItem>
                          <SelectItem value="high">High Risk</SelectItem>
                          <SelectItem value="unknown">Not Specified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2 col-span-2">
                      <Label className="text-base font-medium">Regulation Assignment</Label>
                      <div className="p-3 bg-muted rounded-md mb-3">
                        <div className="flex items-center mb-2">
                          <LinkIcon className="h-4 w-4 mr-2 text-primary" />
                          <span className="font-medium">Link Chemicals to Regulations</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          All imported chemicals will be linked to the selected regulation and will appear in:
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
                          <li>The chemical details page</li>
                          <li>Search results</li>
                          <li>The regulation details page</li>
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="use-existing-regulation"
                              name="regulation-option"
                              className="h-4 w-4"
                              title="Use existing regulation"
                              aria-label="Use existing regulation"
                              checked={!!excelImportSettings.regulation}
                              onChange={() => {
                                if (!excelImportSettings.regulation && regulations.length > 0) {
                                  setExcelImportSettings({
                                    ...excelImportSettings,
                                    regulation: regulations[0]._id
                                  });
                                }
                              }}
                            />
                            <Label htmlFor="use-existing-regulation" className="font-normal">
                              Use existing regulation
                            </Label>
                          </div>

                          {excelImportSettings.regulation && (
                            <div className="pl-6">
                              <Select
                                value={excelImportSettings.regulation}
                                onValueChange={(value) =>
                                  setExcelImportSettings({ ...excelImportSettings, regulation: value })
                                }
                                disabled={!excelImportSettings.regulation}
                              >
                                <SelectTrigger id="default-regulation">
                                  <SelectValue placeholder="Select regulation" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px] overflow-y-auto">
                                  {regulations.map((reg) => (
                                    <SelectItem key={reg._id} value={reg._id}>
                                      {reg.shortName || reg.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="use-custom-regulation"
                              name="regulation-option"
                              className="h-4 w-4"
                              title="Create new regulation"
                              aria-label="Create new regulation"
                              checked={!excelImportSettings.regulation}
                              onChange={() => {
                                setExcelImportSettings({
                                  ...excelImportSettings,
                                  regulation: ""
                                });
                              }}
                            />
                            <Label htmlFor="use-custom-regulation" className="font-normal">
                              Create new regulation
                            </Label>
                          </div>

                          {!excelImportSettings.regulation && (
                            <div className="pl-6">
                              <Input
                                placeholder="Enter regulation name"
                                value={customRegulationName}
                                onChange={(e) => setCustomRegulationName(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                A new regulation will be created with this name and linked to all imported chemicals
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="default-category">Default Category</Label>
                      <div className="flex-1">
                        <Select
                          value={excelImportSettings.category}
                          onValueChange={(value) => setExcelImportSettings({ ...excelImportSettings, category: value })}
                        >
                          <SelectTrigger id="default-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {regulationCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="default-region">Default Region</Label>
                      <div className="flex-1">
                        <Select
                          value={excelImportSettings.region}
                          onValueChange={(value) => setExcelImportSettings({ ...excelImportSettings, region: value })}
                        >
                          <SelectTrigger id="default-region">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {predefinedRegions.map((region) => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="mb-2 text-sm text-muted-foreground">Upload Excel or CSV file with chemical data</p>
                  <div className="mb-4 text-xs text-muted-foreground max-w-md">
                    <p className="mb-2">File should contain columns with these headers (or similar):</p>
                    <ul className="list-disc list-inside text-left">
                      <li><strong>Chemical Name</strong> or <strong>Substance Name</strong> - Required if CAS No. is not provided</li>
                      <li><strong>CAS No.</strong> or <strong>CAS Number</strong> - Required if Chemical Name is not provided</li>
                      <li><strong>SML</strong> or <strong>SML Value</strong> or <strong>Specific Migration Limit</strong> - Optional</li>
                    </ul>
                    <p className="mt-2">The system will automatically match existing chemicals by CAS number or name and update their information.</p>
                  </div>
                  <input
                    type="file"
                    id="chemical-file-upload"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleChemicalFileUpload}
                  />
                  <label htmlFor="chemical-file-upload">
                    <Button
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => document.getElementById("chemical-file-upload")?.click()}
                      disabled={loading.addChemical}
                    >
                      {loading.addChemical ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Importing...
                        </>
                      ) : (
                        'Select File'
                      )}
                    </Button>
                  </label>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddChemicalDialog(false)
                setSelectedRegulations([])
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddChemicalSubmit}
              disabled={loading.addChemical}
            >
              {loading.addChemical ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Chemical'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showRegulationSelector} onOpenChange={setShowRegulationSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Regulation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!currentRegulation ? (
              <div className="grid gap-2">
                <Label htmlFor="regulation-select">Select Regulation</Label>
                {loading.regulations ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading regulations...</span>
                  </div>
                ) : regulations.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No regulations found. Please add regulations first.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Select
                      onValueChange={(value) => {
                        const reg = regulations.find((r) => r._id === value)
                        if (reg) {
                          setCurrentRegulation({
                            id: reg._id,
                            name: reg.name,
                            sml: "",
                          })
                        }
                      }}
                    >
                      <SelectTrigger id="regulation-select">
                        <SelectValue placeholder="Select a regulation" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {regulations.map((reg) => (
                          <SelectItem key={reg._id} value={reg._id}>
                            {reg.shortName || reg.name} ({reg.country})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="text-sm text-muted-foreground">
                      <p>Selected regulations will be linked to this chemical and will appear in:</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>The chemical details page</li>
                        <li>Search results</li>
                        <li>The regulation details page</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="sml-value">SML Value (mg/kg) for {currentRegulation.name}</Label>
                <Input
                  id="sml-value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 0.05"
                  value={currentRegulation.sml}
                  onChange={(e) =>
                    setCurrentRegulation({
                      ...currentRegulation,
                      sml: e.target.value,
                    })
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRegulationSelector(false)
                setCurrentRegulation(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={addRegulationToChemical}
              disabled={!currentRegulation || !currentRegulation.sml}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UpdateRegulationDialog
        open={showUpdateRegulationDialog}
        onOpenChange={(open) => {
          setShowUpdateRegulationDialog(open);
          if (!open) {
            setCurrentRegulationToUpdate(null);
            setUploadedRegulationFile(null);
          }
        }}
        regulation={currentRegulationToUpdate}
        onUpdate={async (updatedRegulation) => {
          try {
            setLoading(prev => ({ ...prev, updateRegulation: true }));
            setError(null);

            console.log('Updating regulation with data:', updatedRegulation);

            // Log the shortName from the updated regulation
            console.log('ShortName from updatedRegulation:', {
              value: updatedRegulation.shortName,
              type: typeof updatedRegulation.shortName
            });

            // Generate a default shortName if one doesn't exist
            let shortNameToUse = updatedRegulation.shortName;
            if (!shortNameToUse || shortNameToUse.trim() === '') {
              // For "Commission Regulation (EU) No 10/2011" -> "EU10/2011"
              const match = updatedRegulation.name.match(/\(([^)]+)\)[^0-9]*([0-9]+\/[0-9]+)/i);
              if (match && match.length >= 3) {
                shortNameToUse = `${match[1]}${match[2]}`.replace(/\s+/g, '');
              } else {
                // Fallback: take first 10 characters
                shortNameToUse = updatedRegulation.name.substring(0, 10) + '...';
              }
              console.log('Generated default shortName for API call:', shortNameToUse);
            }

            // Prepare update data - explicitly handle shortName and updateHistory
            const updateData: any = {
              name: updatedRegulation.name,
              // Explicitly set shortName, ensuring it has a value
              shortName: shortNameToUse,
              country: updatedRegulation.country,
              region: updatedRegulation.region,
              description: updatedRegulation.description || '',
              updateDetails: updatedRegulation.updateDetails || '',
              link: updatedRegulation.link || '',
              featured: updatedRegulation.featured,
              lastUpdated: new Date(),
              categories: updatedRegulation.categories,
            };

            // IMPORTANT: Check if there's an update description and pass it to the API
            if ((updatedRegulation as any).updateDescription) {
              console.log('Processing updateDescription in admin page:', (updatedRegulation as any).updateDescription);

              // Make sure the updateDescription is properly set in the updateData
              updateData.updateDescription = (updatedRegulation as any).updateDescription;

              // Log that we're sending the update description to the API
              console.log('Sending updateDescription to API:', updateData.updateDescription);

              // Add a direct log to verify the updateDescription is included in the request
              console.log('Update data with updateDescription:', JSON.stringify(updateData));
            }

            // Let the API handle the updateHistory
            // We'll just pass the existing updateHistory from the updatedRegulation
            if (updatedRegulation.updateHistory && Array.isArray(updatedRegulation.updateHistory)) {
              console.log('Passing existing updateHistory to API:', updatedRegulation.updateHistory);
              updateData.updateHistory = updatedRegulation.updateHistory;
            } else {
              // If updateHistory doesn't exist or is not an array, initialize it as an empty array
              console.log('Initializing updateHistory as empty array');
              updateData.updateHistory = [];
            }

            // Log the final updateHistory that will be sent to the server
            console.log('Final updateHistory to be sent to server:', updateData.updateHistory);

            // Log the update data to verify shortName and updateHistory are included
            console.log('Update data being sent to server:', {
              name: updateData.name,
              shortName: updateData.shortName,
              shortNameType: typeof updateData.shortName,
              updateHistory: updateData.updateHistory,
              updateHistoryLength: updateData.updateHistory ? updateData.updateHistory.length : 0,
              allKeys: Object.keys(updateData)
            });

            // If we have a new uploaded file, add it to the update data
            if (uploadedRegulationFile) {
              updateData.fileId = uploadedRegulationFile.fileId;
              updateData.fileName = uploadedRegulationFile.fileName;
              updateData.fileSize = uploadedRegulationFile.fileSize;
              updateData.fileType = uploadedRegulationFile.fileType;
            }

            // Update the regulation in the database
            const response = await fetch(`/api/regulations/${updatedRegulation._id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updateData),
            });

            const result = await response.json();

            if (!result.success) {
              throw new Error(result.error || 'Failed to update regulation');
            }

            console.log('Regulation updated successfully:', result);

            // Log the updated regulation data
            if (result.data) {
              console.log('Updated regulation data from server:', {
                id: result.data._id,
                name: result.data.name,
                shortName: result.data.shortName,
                updateHistory: result.data.updateHistory,
                updateHistoryLength: result.data.updateHistory ? result.data.updateHistory.length : 0
              });
            }

            // Refresh the regulations list
            await fetchRegulationsData();

            // Close the dialog and reset state
            setShowUpdateRegulationDialog(false);
            setCurrentRegulationToUpdate(null);
            setUploadedRegulationFile(null);

            // Show success message
            alert(`Regulation "${updateData.name}" has been successfully updated.`);

          } catch (err) {
            console.error('Error updating regulation:', err);
            setError('Failed to update regulation. Please try again.');
          } finally {
            setLoading(prev => ({ ...prev, updateRegulation: false }));
          }
        }}
        categories={regulationCategories}
        isLoading={loading.updateRegulation}
        uploadedFile={uploadedRegulationFile}
      />
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Export {exportType === "admin" ? "Admin" : "User"} Activity History</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date-range">Select Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-range"
                    variant={"outline"}
                    className={`w-full justify-start text-left font-normal ${!dateRange.from && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                        </>
                      ) : (
                        format(dateRange.from, "PPP")
                      )
                    ) : (
                      "Pick a date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange({
                        from: range?.from,
                        to: range?.to
                      });
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-sm text-muted-foreground">Leave empty to export all history data</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportWithDateRange}>Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

