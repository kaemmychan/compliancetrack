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
      setChemicals([]); // Set to empty array to avoid the map error
    } finally {
      setLoading(prev => ({ ...prev, chemicals: false }))
    }
  }, [])

  // Fetch regulations from the database
  const fetchRegulationsData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, regulations: true }))
      setError(null)
      const data = await fetchRegulations()
      console.log('Fetched regulations:', data);

      // Log regulation IDs for debugging
      if (data && data.length > 0) {
        console.log('Regulation IDs:', data.map((reg: RegulationType) => reg._id));

        // Log the first regulation in detail
        console.log('First regulation details:', data[0]);

        // Log all regulations with shortName for debugging
        const regsWithShortName = data.filter((reg: RegulationType) => reg.shortName);
        console.log('Regulations with shortName:', regsWithShortName.map((reg: RegulationType) => ({
          id: reg._id,
          name: reg.name,
          shortName: reg.shortName
        })));
      }

      setRegulations(data)
    } catch (err) {
      console.error('Error fetching regulations:', err)
      setError('Failed to load regulations. Please try again.')
    } finally {
      setLoading(prev => ({ ...prev, regulations: false }))
    }
  }, [])

  // Handle adding a new chemical
  const handleAddChemicalSubmit = async () => {
    try {
      setLoading(prev => ({ ...prev, addChemical: true }))
      setError(null)

      // Validate required fields
      if (!newChemical.name || !newChemical.casNumber) {
        setError('Chemical name and CAS number are required')
        return
      }

      // Add the chemical to the database
      const addedChemical = await addChemical(newChemical)

      // If we get here, the chemical was added successfully
      if (addedChemical && addedChemical.data) {
        // Add chemical-regulation relationships if any are selected
        if (selectedRegulations.length > 0) {
          try {
            for (const reg of selectedRegulations) {
              await addChemicalRegulation(addedChemical.data._id, reg.id.toString(), reg.sml)
            }
          } catch (regError) {
            console.error('Error adding chemical-regulation relationships:', regError)
            // We don't want to fail the whole operation if just the relationships fail
            // Just show a warning
            alert('Chemical was added but there was an issue linking some regulations. Please try adding them again.')
          }
        }

        // Refresh the chemicals list
        await fetchChemicalsData()

        // Reset form and close dialog
        setNewChemical({
          name: "",
          casNumber: "",
          status: "allowed",
          riskLevel: "low",
          riskDescription: ""
        })
        setSelectedRegulations([])
        setShowAddChemicalDialog(false)
      }
    } catch (err: any) {
      console.error('Error adding chemical:', err)
      // Display the specific error message if available
      setError(err.message || 'Failed to add chemical. Please try again.')

      // Don't close the dialog so the user can fix the issue
    } finally {
      setLoading(prev => ({ ...prev, addChemical: false }))
    }
  }

  // Handle updating a chemical
  const handleUpdateChemical = async (id: string, updatedData: any) => {
    try {
      setLoading(prev => ({ ...prev, updateChemical: true }))
      setError(null)

      await updateChemical(id, updatedData)
      await fetchChemicalsData()
      setEditingId(null)

    } catch (err) {
      console.error('Error updating chemical:', err)
      setError('Failed to update chemical. Please try again.')
    } finally {
      setLoading(prev => ({ ...prev, updateChemical: false }))
    }
  }

  // Handle deleting a chemical
  const handleDeleteChemical = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this chemical?')) {
      try {
        setLoading(prev => ({ ...prev, deleteChemical: true }))
        setError(null)

        await deleteChemical(id)
        await fetchChemicalsData()

      } catch (err) {
        console.error('Error deleting chemical:', err)
        setError('Failed to delete chemical. Please try again.')
      } finally {
        setLoading(prev => ({ ...prev, deleteChemical: false }))
      }
    }
  }

  // Handle deleting a regulation
  const handleDeleteRegulation = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the regulation "${name}"? This action cannot be undone.`)) {
      try {
        setLoading(prev => ({ ...prev, deleteRegulation: true }));
        setError(null);

        // Delete the regulation
        await deleteRegulation(id);

        // Refresh the regulations list
        await fetchRegulationsData();

        // Show success message
        alert(`Regulation "${name}" has been successfully deleted.`);

      } catch (err: any) {
        console.error('Error deleting regulation:', err);
        setError(err.message || 'Failed to delete regulation. Please try again.');
      } finally {
        setLoading(prev => ({ ...prev, deleteRegulation: false }));
      }
    }
  }

  // Check authentication and fetch data on component mount
  useEffect(() => {
    checkAuthentication()
    if (isAuthenticated) {
      // First fetch regulations, then chemicals to ensure we have all the data
      fetchRegulationsData().then(() => {
        console.log('Regulations loaded, now loading chemicals...');
        fetchChemicalsData().then(() => {
          console.log('All data loaded successfully');
        });
      });
    }
  }, [checkAuthentication, isAuthenticated, fetchChemicalsData, fetchRegulationsData])

  // Add an effect to check if chemicals have regulations but they're not displayed
  useEffect(() => {
    if (chemicals.length > 0 && regulations.length > 0) {
      // Check if any chemicals have chemicalRegulations but they're not properly linked
      const chemicalsWithRegulations = chemicals.filter(
        chem => chem.chemicalRegulations && chem.chemicalRegulations.length > 0
      );

      if (chemicalsWithRegulations.length > 0) {
        console.log(`Found ${chemicalsWithRegulations.length} chemicals with regulations`);

        // Check the first chemical with regulations
        const firstChemical = chemicalsWithRegulations[0];
        console.log('First chemical with regulations:', firstChemical.name);
        console.log('Regulations:', firstChemical.chemicalRegulations);
      }
    }
  }, [chemicals, regulations])

  // Switch to regulations tab when a highlight parameter is present
  useEffect(() => {
    if (highlightedRegulationId) {
      console.log('Highlighting regulation with ID:', highlightedRegulationId);
      setActiveTab("regulations");

      // Scroll to the highlighted regulation after a short delay to ensure the table is rendered
      setTimeout(() => {
        const highlightedRow = document.querySelector(`tr[data-regulation-id="${highlightedRegulationId}"]`);
        console.log('Found highlighted row:', highlightedRow);

        if (highlightedRow) {
          highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Add a flash effect to make it more noticeable
          highlightedRow.classList.add('bg-yellow-200');
          setTimeout(() => {
            highlightedRow.classList.remove('bg-yellow-200');
            highlightedRow.classList.add('bg-yellow-50');
          }, 1000);
        } else {
          console.log('Could not find regulation with ID:', highlightedRegulationId);
          console.log('Available regulation IDs:',
            Array.from(document.querySelectorAll('tr[data-regulation-id]'))
              .map(el => el.getAttribute('data-regulation-id'))
          );
        }
      }, 500);
    }
  }, [highlightedRegulationId])

  // If not authenticated, don't render the admin panel
  if (!isAuthenticated) {
    return null
  }

  // Add a function to handle exporting the matched data
  const handleExportMatched = () => {
    if (uploadedFileName) {
      // In a real app, this would generate and download an Excel file with the matched data
      alert(`Matched data would be exported as Excel file with the name: ${uploadedFileName}`)
    }
  }

  // Update the file upload handler to save the filename
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setUploadedFileName(file.name)
      setIsFileUploaded(true)
      // In a real app, this would process the file and match with the database
      alert(`File ${file.name} would be processed and matched with the database`)
    }
  }

  // Handle regulation file upload
  const handleRegulationFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const file = e.target.files[0];
        setRegulationFile(file);

        // Show file name in the UI
        const fileNameElement = document.getElementById('regulation-file-name');
        if (fileNameElement) {
          fileNameElement.textContent = file.name;
        }

        // Always upload the file immediately, regardless of the method
        setLoading(prev => ({ ...prev, uploadFile: true }));
        setError(null);

        // Upload the file to the server
        const result = await uploadRegulationFile(file);
        console.log('File upload result:', result);

        if (result.success && result.data) {
          setUploadedRegulationFile({
            fileId: result.data.fileId,
            fileName: result.data.fileName,
            fileSize: result.data.fileSize,
            fileType: result.data.fileType
          });

          // Set the regulation name to the file name if not already set
          if (!newRegulation.name) {
            // Remove file extension
            const fileName = file.name.replace(/\.[^/.]+$/, "");
            setNewRegulation({
              ...newRegulation,
              name: fileName
            });
          }
        } else {
          throw new Error(result.error || 'Failed to upload file');
        }
      } catch (err: any) {
        console.error('Error uploading regulation file:', err);
        setError(err.message || 'Failed to upload file. Please try again.');
      } finally {
        setLoading(prev => ({ ...prev, uploadFile: false }));
      }
    }
  }

  // Function to open the update regulation dialog
  const openUpdateRegulationDialog = (regulation: RegulationType) => {
    // Log the regulation details for debugging
    console.log('Opening update dialog for regulation:', {
      id: regulation._id,
      name: regulation.name,
      shortName: regulation.shortName,
      shortNameType: typeof regulation.shortName,
      fullRegulation: regulation
    });

    // Create a deep copy of the regulation to avoid reference issues
    const regulationCopy = JSON.parse(JSON.stringify(regulation));

    // Generate a default shortName if one doesn't exist
    let defaultShortName = '';
    if (!regulationCopy.shortName) {
      // For "Commission Regulation (EU) No 10/2011" -> "EU10/2011"
      const match = regulationCopy.name.match(/\(([^)]+)\)[^0-9]*([0-9]+\/[0-9]+)/i);
      if (match && match.length >= 3) {
        defaultShortName = `${match[1]}${match[2]}`.replace(/\s+/g, '');
      } else {
        // Fallback: take first 10 characters
        defaultShortName = regulationCopy.name.substring(0, 10) + '...';
      }
      console.log('Generated default shortName:', defaultShortName);
    }

    // Explicitly set shortName to ensure it's included
    // This is the key fix - make sure shortName is properly set
    const regulationWithShortName = {
      ...regulationCopy,
      shortName: regulationCopy.shortName || defaultShortName
    };

    console.log('Regulation prepared for dialog:', {
      id: regulationWithShortName._id,
      name: regulationWithShortName.name,
      shortName: regulationWithShortName.shortName,
      shortNameType: typeof regulationWithShortName.shortName
    });

    // Set the current regulation to update
    setCurrentRegulationToUpdate(regulationWithShortName);

    // Open the dialog
    setShowUpdateRegulationDialog(true);
  }



  // Replace the handleExportHistory function with this updated version
  const handleExportHistory = (type: "admin" | "user") => {
    setExportType(type)
    setShowExportDialog(true)
  }

  // Add this function to handle the actual export
  const handleExportWithDateRange = () => {
    // In a real app, this would generate and download a CSV/Excel file with data from the selected date range
    const fromDate = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "all"
    const toDate = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "today"

    alert(
      `${exportType === "admin" ? "Admin" : "User"} activity history would be exported as CSV/Excel file from ${fromDate} to ${toDate}`,
    )
    setShowExportDialog(false)
    setDateRange({ from: undefined, to: undefined })
  }

  // Rest of your AdminPage component...
  return (
    <div className="container py-12">
      <div className="flex flex-col items-center space-y-4 text-center mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground max-w-[700px]">
          Manage database and settings for the Compliance Track system
        </p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <TabsTrigger value="chemicals" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Chemicals
          </TabsTrigger>
          <TabsTrigger value="regulations" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Regulations
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Database
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chemicals">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Manage Chemical Database</CardTitle>
                  <CardDescription>Add, edit, or delete chemicals in the system</CardDescription>
                </div>
                <Button className="gap-2" onClick={() => setShowAddChemicalDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Add New Chemical
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Input
                  placeholder="Search chemicals..."
                  className="max-w-sm"
                  value={chemicalSearchQuery}
                  onChange={(e) => setChemicalSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchChemicalsData(chemicalSearchQuery);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => fetchChemicalsData(chemicalSearchQuery)}
                  disabled={loading.chemicals}
                >
                  {loading.chemicals ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search
                </Button>
                {chemicalSearchQuery && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setChemicalSearchQuery("");
                      fetchChemicalsData();
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chemical Name</TableHead>
                    <TableHead>CAS Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Assessment</TableHead>
                    <TableHead>Related Regulations</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading.chemicals ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex justify-center items-center">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          <span>Loading chemicals...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : chemicals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground">No chemicals found. Add your first chemical to get started.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    chemicals.map((chemical) => (
                      <TableRow key={chemical._id}>
                        {editingId === chemical._id ? (
                          <>
                            <TableCell>
                              <Input
                                id={`edit-name-${chemical._id}`}
                                defaultValue={chemical.name}
                                className="w-full"
                                onChange={(e) => {
                                  const updatedChemical = { ...chemical, name: e.target.value };
                                  // Update the chemical in the local state
                                  setChemicals(chemicals.map(c => c._id === chemical._id ? updatedChemical : c));
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                id={`edit-cas-${chemical._id}`}
                                defaultValue={chemical.casNumber}
                                className="w-full"
                                onChange={(e) => {
                                  const updatedChemical = { ...chemical, casNumber: e.target.value };
                                  setChemicals(chemicals.map(c => c._id === chemical._id ? updatedChemical : c));
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                defaultValue={chemical.status}
                                onValueChange={(value) => {
                                  const updatedChemical = { ...chemical, status: value as any };
                                  setChemicals(chemicals.map(c => c._id === chemical._id ? updatedChemical : c));
                                }}
                              >
                                <SelectTrigger id={`edit-status-${chemical._id}`}>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="allowed">Allowed</SelectItem>
                                  <SelectItem value="restricted">Restricted</SelectItem>
                                  <SelectItem value="prohibited">Prohibited</SelectItem>
                                  <SelectItem value="unknown">Not Specified</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                defaultValue={chemical.riskLevel}
                                onValueChange={(value) => {
                                  const updatedChemical = { ...chemical, riskLevel: value as any };
                                  setChemicals(chemicals.map(c => c._id === chemical._id ? updatedChemical : c));
                                }}
                              >
                                <SelectTrigger id={`edit-risk-${chemical._id}`}>
                                  <SelectValue placeholder="Select risk level" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low Risk</SelectItem>
                                  <SelectItem value="medium">Medium Risk</SelectItem>
                                  <SelectItem value="high">High Risk</SelectItem>
                                  <SelectItem value="unknown">Not Specified</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {chemical.chemicalRegulations && chemical.chemicalRegulations.length > 0 ? (
                                  <Badge variant="outline">Has regulations</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">No regulations</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => handleUpdateChemical(chemical._id, chemical)}
                                  disabled={loading.updateChemical}
                                >
                                  {loading.updateChemical && editingId === chemical._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button size="icon" variant="outline" onClick={cancelEditing}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{chemical.name}</TableCell>
                            <TableCell>{chemical.casNumber}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  chemical.status === "allowed"
                                    ? "bg-green-500"
                                    : chemical.status === "restricted"
                                      ? "bg-yellow-500"
                                      : chemical.status === "prohibited"
                                        ? "bg-red-500"
                                        : "bg-gray-400"
                                }
                              >
                                {chemical.status === "allowed"
                                  ? "Allowed"
                                  : chemical.status === "restricted"
                                    ? "Restricted"
                                    : chemical.status === "prohibited"
                                      ? "Prohibited"
                                      : "Not Specified"}
                              </Badge>
                            </TableCell>
                            <TableCell>{getRiskBadge(chemical.riskLevel)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {chemical.chemicalRegulations && chemical.chemicalRegulations.length > 0 ? (
                                  <>
                                    {chemical.chemicalRegulations.map((chemReg: any, index: number) => {
                                      // Get the regulation name and ID
                                      let regulationName = "Unknown Regulation";
                                      let regulationShortName = "";
                                      let regulationId = "";

                                      // Debug the chemReg object
                                      console.log(`ChemReg object for ${chemical.name}:`, chemReg);

                                      // If the regulation is populated in the chemReg object
                                      if (chemReg.regulation && typeof chemReg.regulation === 'object') {
                                        regulationName = chemReg.regulation.name || "Unknown Regulation";
                                        // Explicitly check for shortName and ensure it's not undefined
                                        regulationShortName = chemReg.regulation.shortName ? chemReg.regulation.shortName : "";
                                        regulationId = chemReg.regulation._id;
                                        console.log(`Found populated regulation object: ${regulationName}, shortName: ${regulationShortName}`);
                                      } else if (chemReg.regulation) {
                                        // If regulation is just an ID, find the regulation in the regulations array
                                        const regId = typeof chemReg.regulation === 'string' ?
                                          chemReg.regulation :
                                          chemReg.regulation.toString();

                                        console.log(`Looking for regulation with ID: ${regId}`);

                                        // Log all regulation IDs for debugging
                                        console.log('Available regulation IDs:', regulations.map(r => r._id));

                                        // Try different ways to match the regulation ID
                                        let regulationObj = regulations.find(r => r._id === regId);

                                        if (!regulationObj) {
                                          // Try with toString() on both sides
                                          regulationObj = regulations.find(r => r._id.toString() === regId.toString());
                                          console.log('Tried matching with toString():', !!regulationObj);
                                        }

                                        if (!regulationObj) {
                                          // Try case-insensitive match
                                          regulationObj = regulations.find(r =>
                                            r._id.toLowerCase() === regId.toLowerCase());
                                          console.log('Tried case-insensitive matching:', !!regulationObj);
                                        }

                                        if (regulationObj) {
                                          regulationName = regulationObj.name;
                                          // Explicitly check for shortName and ensure it's not undefined
                                          regulationShortName = regulationObj.shortName ? regulationObj.shortName : "";
                                          regulationId = regulationObj._id;
                                          console.log(`Found regulation in local state: ${regulationName}, shortName: ${regulationShortName}`);
                                        } else {
                                          console.log(`Regulation not found in local state for ID: ${regId}`);

                                          // As a fallback, use the ID as the name
                                          regulationName = `Regulation ID: ${regId}`;
                                          regulationId = regId;
                                        }
                                      }

                                      // Log the regulation details for debugging
                                      console.log(`Regulation details for badge:`, {
                                        name: regulationName,
                                        shortName: regulationShortName,
                                        displayName: regulationShortName || regulationName
                                      });

                                      return (
                                        <Link
                                          key={index}
                                          href={`/regulations/details?id=${regulationId}`}
                                          className="no-underline"
                                        >
                                          <Badge variant="outline" className="mr-1 mb-1 cursor-pointer hover:bg-primary hover:text-primary-foreground">
                                            {regulationShortName || regulationName}
                                          </Badge>
                                        </Link>
                                      );
                                    })}
                                  </>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">No regulations</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => setEditingId(chemical._id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => handleDeleteChemical(chemical._id)}
                                  disabled={loading.deleteChemical}
                                >
                                  {loading.deleteChemical ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regulations">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Manage Regulations</CardTitle>
                  <CardDescription>
                    Add, edit, or delete regulations in the system.
                    <Link href="/regulations" className="ml-1 text-blue-500 hover:underline">
                      View regulations overview
                    </Link>
                  </CardDescription>
                </div>
                {!showAddRegulationForm && (
                  <Button className="gap-2" onClick={() => setShowAddRegulationForm(true)}>
                    <Plus className="h-4 w-4" />
                    Add New Regulation
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {showAddRegulationForm ? (
                <Card className="mb-6 border-dashed">
                  <CardHeader>
                    <CardTitle>Add New Regulation</CardTitle>
                    <CardDescription>Choose a method to add a new regulation</CardDescription>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant={addRegulationMethod === "form" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAddRegulationMethod("form")}
                      >
                        Form
                      </Button>
                      <Button
                        variant={addRegulationMethod === "upload" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAddRegulationMethod("upload")}
                      >
                        Upload File
                      </Button>
                      <Button
                        variant={addRegulationMethod === "link" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAddRegulationMethod("link")}
                      >
                        External Link
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {addRegulationMethod === "form" && (
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="reg-name">Regulation Name</Label>
                          <Input
                            id="reg-name"
                            value={newRegulation.name}
                            onChange={(e) => setNewRegulation({ ...newRegulation, name: e.target.value })}
                            placeholder="e.g., Regulation (EU) 10/2011"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-short-name">Short Name</Label>
                          <Input
                            id="reg-short-name"
                            value={newRegulation.shortName}
                            onChange={(e) => setNewRegulation({ ...newRegulation, shortName: e.target.value })}
                            placeholder="e.g., EU 10/2011"
                          />
                          <p className="text-xs text-muted-foreground">
                            A shorter version of the regulation name to display in tables
                          </p>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-country">Country/Authority</Label>
                          <Input
                            id="reg-country"
                            value={newRegulation.country}
                            onChange={(e) => setNewRegulation({ ...newRegulation, country: e.target.value })}
                            placeholder="e.g., European Union"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-region">Region</Label>
                          {showCustomRegion ? (
                            <div className="flex gap-2">
                              <Input
                                id="reg-custom-region"
                                value={customRegion}
                                onChange={(e) => setCustomRegion(e.target.value)}
                                placeholder="Enter custom region"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (customRegion.trim()) {
                                    setNewRegulation({ ...newRegulation, region: customRegion })
                                    setShowCustomRegion(false)
                                    setCustomRegion("")
                                  }
                                }}
                              >
                                Add
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowCustomRegion(false)
                                  setCustomRegion("")
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Select
                                value={newRegulation.region}
                                onValueChange={(value) => setNewRegulation({ ...newRegulation, region: value })}
                              >
                                <SelectTrigger id="reg-region" className="flex-1">
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                                <SelectContent>
                                  {predefinedRegions.map((region) => (
                                    <SelectItem key={region} value={region}>
                                      {region}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button variant="outline" size="sm" onClick={() => setShowCustomRegion(true)}>
                                Custom
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-description">Description</Label>
                          <Textarea
                            id="reg-description"
                            value={newRegulation.description}
                            onChange={(e) => setNewRegulation({ ...newRegulation, description: e.target.value })}
                            placeholder="Brief description of the regulation"
                            rows={3}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-details">Detailed Information</Label>
                          <Textarea
                            id="reg-details"
                            value={newRegulation.updateDetails || ''}
                            onChange={(e) => setNewRegulation({ ...newRegulation, updateDetails: e.target.value })}
                            placeholder="Enter detailed information about the regulation, including scope, requirements, and compliance information"
                            className="min-h-[120px]"
                            rows={5}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-link">Official Link (Optional)</Label>
                          <Input
                            id="reg-link"
                            value={newRegulation.link}
                            onChange={(e) => setNewRegulation({ ...newRegulation, link: e.target.value })}
                            placeholder="e.g., https://eur-lex.europa.eu/..."
                          />
                        </div>
                        {/* Update the regulation categories section in the form */}
                        <div className="grid gap-2 mt-4">
                          <Label>Regulation Categories</Label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {regulationCategories.map((tag) => (
                              <Badge
                                key={tag}
                                variant={newRegulationTags.includes(tag) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => toggleRegulationTag(tag)}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add custom category"
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (customCategory.trim()) {
                                  if (
                                    !regulationCategories.includes(customCategory) &&
                                    !newRegulationTags.includes(customCategory)
                                  ) {
                                    setNewRegulationTags([...newRegulationTags, customCategory])
                                  }
                                  setCustomCategory("")
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mt-4">
                          <Switch
                            id="featured-regulation"
                            checked={newRegulation.featured}
                            onCheckedChange={(checked) => setNewRegulation({ ...newRegulation, featured: checked })}
                          />
                          <Label htmlFor="featured-regulation">Feature on homepage</Label>
                        </div>
                      </div>
                    )}

                    {addRegulationMethod === "upload" && (
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="reg-name-upload">Regulation Name</Label>
                          <Input
                            id="reg-name-upload"
                            value={newRegulation.name}
                            onChange={(e) => setNewRegulation({ ...newRegulation, name: e.target.value })}
                            placeholder="e.g., Regulation (EU) 10/2011"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-short-name-upload">Short Name</Label>
                          <Input
                            id="reg-short-name-upload"
                            value={newRegulation.shortName}
                            onChange={(e) => setNewRegulation({ ...newRegulation, shortName: e.target.value })}
                            placeholder="e.g., EU 10/2011"
                          />
                          <p className="text-xs text-muted-foreground">
                            A shorter version of the regulation name to display in tables
                          </p>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="reg-country-upload">Country/Authority</Label>
                          <Input
                            id="reg-country-upload"
                            value={newRegulation.country}
                            onChange={(e) => setNewRegulation({ ...newRegulation, country: e.target.value })}
                            placeholder="e.g., European Union"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="reg-region-upload">Region</Label>
                          {showCustomRegion ? (
                            <div className="flex gap-2">
                              <Input
                                id="reg-custom-region-upload"
                                value={customRegion}
                                onChange={(e) => setCustomRegion(e.target.value)}
                                placeholder="e.g., Southeast Asia"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (customRegion.trim()) {
                                    setNewRegulation({ ...newRegulation, region: customRegion })
                                    setShowCustomRegion(false)
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Select
                                value={newRegulation.region}
                                onValueChange={(value) => setNewRegulation({ ...newRegulation, region: value })}
                              >
                                <SelectTrigger id="reg-region-upload">
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                                <SelectContent>
                                  {predefinedRegions.map((region) => (
                                    <SelectItem key={region} value={region}>
                                      {region}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCustomRegion(true)}
                              >
                                Custom
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center mt-4">
                          <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            Drag and drop regulation file here, or click to select file
                          </p>
                          <input
                            type="file"
                            id="regulation-upload-upload"
                            className="hidden"
                            accept=".pdf,.docx,.xlsx,.doc,.xls"
                            onChange={handleRegulationFileUpload}
                          />
                          <label htmlFor="regulation-upload-upload">
                            <Button
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => document.getElementById("regulation-upload-upload")?.click()}
                              disabled={loading.uploadFile}
                            >
                              {loading.uploadFile ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Uploading...
                                </>
                              ) : (
                                'Select File'
                              )}
                            </Button>
                          </label>

                          {/* Display uploaded file info */}
                          {uploadedRegulationFile && (
                            <div className="mt-4 text-left w-full bg-muted p-3 rounded-md">
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-primary" />
                                <span className="text-sm font-medium" id="regulation-file-name">
                                  {uploadedRegulationFile.fileName}
                                </span>
                                <Badge className="ml-auto bg-green-500">Uploaded</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {Math.round(uploadedRegulationFile.fileSize / 1024)} KB
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Add regulation categories section */}
                        <div className="grid gap-2 mt-4">
                          <Label>Regulation Categories</Label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {regulationCategories.map((tag) => (
                              <Badge
                                key={tag}
                                variant={newRegulationTags.includes(tag) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => toggleRegulationTag(tag)}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {addRegulationMethod === "link" && (
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="reg-name-link">Regulation Name</Label>
                          <Input
                            id="reg-name-link"
                            value={newRegulation.name}
                            onChange={(e) => setNewRegulation({ ...newRegulation, name: e.target.value })}
                            placeholder="e.g., Regulation (EU) 10/2011"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-short-name-link">Short Name</Label>
                          <Input
                            id="reg-short-name-link"
                            value={newRegulation.shortName}
                            onChange={(e) => setNewRegulation({ ...newRegulation, shortName: e.target.value })}
                            placeholder="e.g., EU 10/2011"
                          />
                          <p className="text-xs text-muted-foreground">
                            A shorter version of the regulation name to display in tables
                          </p>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-country-link">Country/Authority</Label>
                          <Input
                            id="reg-country-link"
                            value={newRegulation.country}
                            onChange={(e) => setNewRegulation({ ...newRegulation, country: e.target.value })}
                            placeholder="e.g., European Union"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-region-link">Region</Label>
                          {showCustomRegion ? (
                            <div className="flex gap-2">
                              <Input
                                id="reg-custom-region-link"
                                value={customRegion}
                                onChange={(e) => setCustomRegion(e.target.value)}
                                placeholder="e.g., Southeast Asia"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (customRegion.trim()) {
                                    setNewRegulation({ ...newRegulation, region: customRegion })
                                    setShowCustomRegion(false)
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Select
                                value={newRegulation.region}
                                onValueChange={(value) => setNewRegulation({ ...newRegulation, region: value })}
                              >
                                <SelectTrigger id="reg-region-link">
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                                <SelectContent>
                                  {predefinedRegions.map((region) => (
                                    <SelectItem key={region} value={region}>
                                      {region}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCustomRegion(true)}
                              >
                                Custom
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-url">Regulation URL</Label>
                          <div className="flex gap-2">
                            <Input
                              id="reg-url"
                              value={newRegulation.link}
                              onChange={(e) => setNewRegulation({ ...newRegulation, link: e.target.value })}
                              placeholder="e.g., https://eur-lex.europa.eu/..."
                            />
                            <Button
                              variant="outline"
                              className="shrink-0"
                              onClick={() => {
                                if (newRegulation.link) {
                                  window.open(newRegulation.link, '_blank');
                                }
                              }}
                            >
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Verify
                            </Button>
                          </div>
                        </div>

                        {/* Add regulation categories section */}
                        <div className="grid gap-2 mt-4">
                          <Label>Regulation Categories</Label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {regulationCategories.map((tag) => (
                              <Badge
                                key={tag}
                                variant={newRegulationTags.includes(tag) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => toggleRegulationTag(tag)}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add custom category"
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (customCategory.trim()) {
                                  if (
                                    !regulationCategories.includes(customCategory) &&
                                    !newRegulationTags.includes(customCategory)
                                  ) {
                                    setNewRegulationTags([...newRegulationTags, customCategory])
                                  }
                                  setCustomCategory("")
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
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
                        setAddRegulationMethod("form");
                        setCustomCategory("");

                        // Hide the form
                        setShowAddRegulationForm(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddRegulation}
                      disabled={loading.addRegulation}
                    >
                      {loading.addRegulation ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        'Add Regulation'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ) : null}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Regulation Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading.regulations ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex justify-center items-center">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          <span>Loading regulations...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : regulations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <p className="text-muted-foreground">No regulations found. Add your first regulation to get started.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    regulations.map((regulation) => (
                      <TableRow
                        key={regulation._id}
                        data-regulation-id={regulation._id.toString()}
                        className={highlightedRegulationId === regulation._id.toString() ? "bg-yellow-50 border-l-4 border-yellow-500" : ""}
                      >
                        <TableCell className="font-medium">
                          {highlightedRegulationId === regulation._id.toString() && (
                            <Badge className="mr-2 bg-yellow-500">Linked from Search</Badge>
                          )}
                          {regulation.name}
                          {regulation.shortName && (
                            <div className="text-xs font-bold text-green-600 mt-1">
                              Short name: {regulation.shortName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{regulation.country}</TableCell>
                        <TableCell>{regulation.region}</TableCell>
                        <TableCell>
                          {regulation.lastUpdated
                            ? new Date(regulation.lastUpdated).toLocaleDateString()
                            : new Date(regulation.createdAt || Date.now()).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {regulation.categories?.map((tag) => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {regulation.fileId && (
                              <a
                                href={`/api/files/${regulation.fileId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-blue-500 hover:text-blue-700"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                <span className="text-xs">{regulation.fileName || 'Download file'}</span>
                              </a>
                            )}
                            {regulation.link && (
                              <a
                                href={regulation.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-blue-500 hover:text-blue-700"
                              >
                                <LinkIcon className="h-4 w-4 mr-1" />
                                <span className="text-xs">Official link</span>
                              </a>
                            )}
                            {!regulation.fileId && !regulation.link && (
                              <span className="text-xs text-muted-foreground">No file or link</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleFeatured(regulation._id)}
                            className={regulation.featured ? "text-yellow-500" : "text-muted-foreground"}
                            disabled={loading.updateRegulation}
                          >
                            {loading.updateRegulation ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Star className="h-4 w-4" fill={regulation.featured ? "currentColor" : "none"} />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              title="View Details"
                              asChild
                            >
                              <Link href={`/regulations/details?id=${regulation._id}`}>
                                <FileText className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              title="Edit Regulation"
                              onClick={() => openUpdateRegulationDialog(regulation)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              title="Delete Regulation"
                              onClick={() => handleDeleteRegulation(regulation._id, regulation.name)}
                              disabled={loading.deleteRegulation}
                            >
                              {loading.deleteRegulation ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Database</CardTitle>
              <CardDescription>Upload Excel files with chemical data to match with existing database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="mb-2 text-sm text-muted-foreground">Drag and drop files here, or click to select files</p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                />
                <label htmlFor="file-upload">
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    Select File
                  </Button>
                </label>

                {isFileUploaded && (
                  <div className="mt-6 w-full">
                    <div className="bg-muted p-4 rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-primary" />
                          <span className="font-medium">{uploadedFileName}</span>
                        </div>
                        <Badge className="bg-green-500">Processed</Badge>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button variant="outline" className="gap-2" onClick={handleExportMatched}>
                          <Download className="h-4 w-4" />
                          Export Matched Data
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-lg font-medium mb-2">Matching Summary</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-muted p-3 rounded-md text-center">
                          <p className="text-2xl font-bold">25</p>
                          <p className="text-sm text-muted-foreground">Total Chemicals</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-md text-center">
                          <p className="text-2xl font-bold text-green-700">18</p>
                          <p className="text-sm text-green-700">Matched</p>
                        </div>
                        <div className="bg-yellow-100 p-3 rounded-md text-center">
                          <p className="text-2xl font-bold text-yellow-700">7</p>
                          <p className="text-sm text-yellow-700">Not Found</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>History of changes made to the system</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="admin">
                <TabsList className="mb-4">
                  <TabsTrigger value="admin">Admin Activity</TabsTrigger>
                  <TabsTrigger value="user">User Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="admin">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Admin Activity (Latest 50 Entries)</h3>
                    <Button variant="outline" onClick={() => handleExportHistory("admin")} className="gap-2">
                      <Download className="h-4 w-4" />
                      Export History
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Show only the latest 50 entries */}
                      {mockHistory.slice(0, 50).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.user}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.action}</Badge>
                          </TableCell>
                          <TableCell>{item.details}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="user">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">User Activity (Latest 50 Entries)</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="h-3 w-3" /> Total Views: 247
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="h-3 w-3" /> Total Searches: 128
                      </Badge>
                      <Button variant="outline" onClick={() => handleExportHistory("user")} className="gap-2 ml-2">
                        <Download className="h-4 w-4" />
                        Export History
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Show only the latest 50 entries */}
                      {mockUserActivity.slice(0, 50).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.user}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.action}</Badge>
                          </TableCell>
                          <TableCell>{item.details}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={showAddChemicalDialog} onOpenChange={setShowAddChemicalDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Chemical</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="file">Import from File</TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="chemical-name">Chemical Name</Label>
                    <Input
                      id="chemical-name"
                      value={newChemical.name}
                      onChange={(e) => setNewChemical({ ...newChemical, name: e.target.value })}
                      placeholder="e.g., Bisphenol A"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="chemical-cas">CAS Number</Label>
                    <Input
                      id="chemical-cas"
                      value={newChemical.casNumber}
                      onChange={(e) => setNewChemical({ ...newChemical, casNumber: e.target.value })}
                      placeholder="e.g., 80-05-7"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="chemical-status">Status</Label>
                    <Select
                      value={newChemical.status}
                      onValueChange={(value) => setNewChemical({ ...newChemical, status: value })}
                    >
                      <SelectTrigger id="chemical-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allowed">Allowed</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                        <SelectItem value="prohibited">Prohibited</SelectItem>
                        <SelectItem value="unknown">Not Specified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="chemical-risk">Risk Level</Label>
                    <Select
                      value={newChemical.riskLevel}
                      onValueChange={(value) => setNewChemical({ ...newChemical, riskLevel: value })}
                    >
                      <SelectTrigger id="chemical-risk">
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                        <SelectItem value="unknown">Not Specified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-4">
                    <Label>Related Regulations</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-1" /> Custom Regulation
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium">Add Custom Regulation</h4>
                              <div className="grid gap-2">
                                <Label htmlFor="custom-regulation">Regulation Name</Label>
                                <Input
                                  id="custom-regulation"
                                  placeholder="e.g., New Local Regulation"
                                  value={customRegulationName}
                                  onChange={(e) => setCustomRegulationName(e.target.value)}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="custom-region">Region</Label>
                                <Select
                                  value={excelImportSettings.region}
                                  onValueChange={(value) =>
                                    setExcelImportSettings({ ...excelImportSettings, region: value })
                                  }
                                >
                                  <SelectTrigger id="custom-region">
                                    <SelectValue placeholder="Select region" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {predefinedRegions.map((region) => (
                                      <SelectItem key={region} value={region}>
                                        {region}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="custom-category">Category</Label>
                                <Select
                                  value={excelImportSettings.category}
                                  onValueChange={(value) =>
                                    setExcelImportSettings({ ...excelImportSettings, category: value })
                                  }
                                >
                                  <SelectTrigger id="custom-category">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {regulationCategories.map((category) => (
                                      <SelectItem key={category} value={category}>
                                        {category}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                className="w-full mt-2"
                                size="sm"
                                onClick={async () => {
                                  if (customRegulationName.trim()) {
                                    try {
                                      // First add the custom regulation to the database
                                      const newReg = await addRegulation({
                                        name: customRegulationName,
                                        country: 'Custom',
                                        region: excelImportSettings.region || 'Global',
                                        description: 'Custom regulation added from chemical form',
                                        categories: [excelImportSettings.category || 'General'],
                                        featured: false
                                      });

                                      // Then set it as the current regulation
                                      if (newReg && newReg.data) {
                                        setCurrentRegulation({
                                          id: newReg.data._id,
                                          name: newReg.data.name,
                                          sml: "",
                                        });

                                        // Refresh regulations list
                                        await fetchRegulationsData();

                                        setShowRegulationSelector(true);
                                        setCustomRegulationName("");
                                      }
                                    } catch (err) {
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
                            <TableRow key={reg.id || `reg-${index}`}>
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

