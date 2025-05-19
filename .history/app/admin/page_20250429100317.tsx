"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
// First, import the Download icon if it's not already imported
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
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { useAuth } from "@/lib/auth-provider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DateRange } from 'react-day-picker'
import { IChemical } from "@/models/Chemical"
import { IRegulation } from "@/models/Regulation"

// Mock data for demonstration while implementing DB connection
const mockChemicals = [
  { id: 1, name: "Bisphenol A", casNumber: "80-05-7", status: "restricted", riskLevel: "high" },
  { id: 2, name: "Titanium Dioxide", casNumber: "13463-67-7", status: "allowed", riskLevel: "low" },
  { id: 3, name: "Diethylhexyl Phthalate", casNumber: "117-81-7", status: "prohibited", riskLevel: "high" },
  { id: 4, name: "Polyethylene Terephthalate", casNumber: "25038-59-9", status: "allowed", riskLevel: "low" },
  { id: 5, name: "Formaldehyde", casNumber: "50-00-0", status: "restricted", riskLevel: "medium" },
]

// Modified mockRegulations to match IRegulation interface as close as possible
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

// Add category tags to the regulations
const regulationCategories = [
  "General",
  "Food Contact",
  "Electronic Equipment",
  "Drinking Water",
  "Medical Devices",
  "Cosmetics",
]

// Add regions for regulations
const predefinedRegions = ["Europe", "North America", "South America", "Asia", "Africa", "Oceania", "Global"]

// Mock data for regulation tags
const regulationToTags: Record<number, string[]> = {
  1: ["Food Contact", "General"],
  4: ["Food Contact", "Electronic Equipment"],
  7: ["Food Contact", "Drinking Water"],
  9: ["Food Contact"],
  2: ["Food Contact", "General"],
}

// First, add these mock data for regulations with SML values
const mockRegulationsWithSML = [
  { id: 1, name: "Regulation (EU) 10/2011", country: "European Union", region: "Europe", category: "Food Contact" },
  { id: 2, name: "FDA 21 CFR 175-178", country: "United States", region: "North America", category: "Food Contact" },
  { id: 3, name: "GB 9685-2016", country: "China", region: "Asia", category: "Food Contact" },
  { id: 4, name: "SVHC List", country: "European Union", region: "Europe", category: "General" },
  { id: 5, name: "RoHS Directive", country: "European Union", region: "Europe", category: "Electronic Equipment" },
  { id: 6, name: "Japan JHOSPA", country: "Japan", region: "Asia", category: "Food Contact" },
]

// Add an export function for the activity history

export default function AdminPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(tabParam || "chemicals")
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [showAddRegulationForm, setShowAddRegulationForm] = useState(false)
  const [addRegulationMethod, setAddRegulationMethod] = useState<"form" | "upload" | "link">("form")

  const [showAddChemicalDialog, setShowAddChemicalDialog] = useState(false)
  // Update the newChemical state to include "unknown" as an option
  const [newChemical, setNewChemical] = useState({
    name: "",
    casNumber: "",
    status: "allowed",
    riskLevel: "low",
  })

  // New state for database data
  const [chemicals, setChemicals] = useState<IChemical[]>([])
  const [regulations, setRegulations] = useState<IRegulation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data from the database on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch chemicals
        const chemicalsResponse = await fetch('/api/chemicals');
        if (!chemicalsResponse.ok) {
          throw new Error('Failed to fetch chemicals');
        }
        const chemicalsData = await chemicalsResponse.json();
        setChemicals(chemicalsData);

        // Fetch regulations
        const regulationsResponse = await fetch('/api/regulations');
        if (!regulationsResponse.ok) {
          throw new Error('Failed to fetch regulations');
        }
        const regulationsData = await regulationsResponse.json();
        setRegulations(regulationsData);

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch data if authenticated
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // New regulation form state
  const [newRegulation, setNewRegulation] = useState({
    name: "",
    country: "",
    region: "",
    description: "",
    link: "",
    featured: false,
  })

  const [newRegulationTags, setNewRegulationTags] = useState<string[]>([])
  const [customRegion, setCustomRegion] = useState("")
  const [showCustomRegion, setShowCustomRegion] = useState(false)

  // Add this state for the new chemical form
  const [selectedRegulations, setSelectedRegulations] = useState<{ id: number; name: string; sml: string }[]>([])
  const [showRegulationSelector, setShowRegulationSelector] = useState(false)
  const [currentRegulation, setCurrentRegulation] = useState<{ id: number; name: string; sml: string } | null>(null)

  // Update the Add New Regulation form to allow custom category input
  // Add this state for custom category
  const [customCategory, setCustomCategory] = useState("")
  const [customRegulationName, setCustomRegulationName] = useState("")

  // Add state for Excel import settings
  // Update the excelImportSettings state to include "unknown" as an option
  const [excelImportSettings, setExcelImportSettings] = useState({
    status: "allowed",
    riskLevel: "low",
    regulation: 1, // Default to EU 10/2011
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

  // Mock editing functionality
  const startEditing = (id: number) => {
    setEditingId(id)
  }

  const cancelEditing = () => {
    setEditingId(null)
  }

  const saveEditing = () => {
    setEditingId(null)
    // In a real app, save changes to database
  }

  const handleAddRegulation = async () => {
    try {
      const response = await fetch('/api/regulations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
  const handleAddRegulation = () => {
    // In a real app, this would add the regulation to the database
    alert("Regulation would be added to the database")
    setShowAddRegulationForm(false)
    setNewRegulation({
      name: "",
      country: "",
      region: "",
      description: "",
      link: "",
      featured: false,
    })
    setNewRegulationTags([])
    setCustomRegion("")
    setShowCustomRegion(false)
  }

  // Add this function to handle adding a regulation to a chemical
  const addRegulationToChemical = () => {
    if (currentRegulation) {
      setSelectedRegulations([...selectedRegulations, currentRegulation])
      setCurrentRegulation(null)
      setShowRegulationSelector(false)
    }
  }

  // Add this function to remove a regulation from a chemical
  const removeRegulationFromChemical = (index: number) => {
    const newRegulations = [...selectedRegulations]
    newRegulations.splice(index, 1)
    setSelectedRegulations(newRegulations)
  }

  // Update the handleAddChemical function
  const handleAddChemical = async () => {
    try {
      // First add the chemical
      const chemicalResponse = await fetch('/api/chemicals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newChemical.name,
          casNumber: newChemical.casNumber,
          status: newChemical.status,
          riskLevel: newChemical.riskLevel
        }),
      });

      if (!chemicalResponse.ok) {
        const error = await chemicalResponse.json();
        alert(`Error adding chemical: ${error.error}`);
        return;
      }

      const addedChemical = await chemicalResponse.json();

      // Then add relationships to regulations if any
      if (selectedRegulations.length > 0) {
        for (const reg of selectedRegulations) {
          await fetch('/api/chemical-regulations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chemicalId: addedChemical._id,
              regulationId: reg.id,
              smlValue: reg.sml
            }),
          });
        }
      }

      alert('Chemical added successfully');
      setShowAddChemicalDialog(false);
      setNewChemical({
        name: "",
        casNumber: "",
        status: "allowed",
        riskLevel: "low",
      });
      setSelectedRegulations([]);
      setCustomRegulationName("");
    } catch (error) {
      console.error('Error adding chemical:', error);
      alert('Failed to add chemical');
    }
  }

  // Add this function to handle file upload for chemicals
  const handleChemicalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // In a real app, this would process the file and match with the database
      alert(
        `File ${e.target.files[0].name} would be processed and chemicals would be added to the database with status: ${excelImportSettings.status}, risk level: ${excelImportSettings.riskLevel}, and assigned to the selected regulation and category`,
      )
    }
  }

  const toggleFeatured = (id: number) => {
    // In a real app, this would update the database
    alert(`Regulation ${id} featured status would be toggled`)
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

  // Check authentication on component mount
  useEffect(() => {
    checkAuthentication()
  }, [checkAuthentication])

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

  // Add after the other function declarations
  const openUpdateRegulationDialog = (regulation: any) => {
    setCurrentRegulationToUpdate(regulation)
    setShowUpdateRegulationDialog(true)
  }

  const handleUpdateRegulation = () => {
    // In a real app, this would update the regulation in the database
    // and store the previous version in history
    alert(`Regulation ${currentRegulationToUpdate.id} would be updated and previous version stored in history`)
    setShowUpdateRegulationDialog(false)
    setCurrentRegulationToUpdate(null)
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
                <Input placeholder="Search chemicals..." className="max-w-sm" />
                <Button variant="outline">Search</Button>
              </div>

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
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading chemicals data...
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-red-500">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : chemicals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No chemicals found. Add your first chemical using the "Add New Chemical" button.
                      </TableCell>
                    </TableRow>
                  ) : (
                    chemicals.map((chemical) => (
                      <TableRow key={chemical._id.toString()}>
                        {editingId === chemical._id.toString() ? (
                          <>
                            <TableCell>
                              <Input defaultValue={chemical.name} className="w-full" />
                            </TableCell>
                            <TableCell>
                              <Input defaultValue={chemical.casNumber} className="w-full" />
                            </TableCell>
                            <TableCell>
                              <select className="w-full p-2 rounded-md border">
                                <option value="allowed" selected={chemical.status === "allowed"}>
                                  Allowed
                                </option>
                                <option value="restricted" selected={chemical.status === "restricted"}>
                                  Restricted
                                </option>
                                <option value="prohibited" selected={chemical.status === "prohibited"}>
                                  Prohibited
                                </option>
                                <option value="unknown" selected={chemical.status === "unknown"}>
                                  Not Specified
                                </option>
                              </select>
                            </TableCell>
                            <TableCell>
                              <select className="w-full p-2 rounded-md border">
                                <option value="low" selected={chemical.riskLevel === "low"}>
                                  Low Risk
                                </option>
                                <option value="medium" selected={chemical.riskLevel === "medium"}>
                                  Medium Risk
                                </option>
                                <option value="high" selected={chemical.riskLevel === "high"}>
                                  High Risk
                                </option>
                                <option value="unknown" selected={chemical.riskLevel === "unknown"}>
                                  Not Specified
                                </option>
                              </select>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {chemical.chemicalRegulations && chemical.chemicalRegulations.length > 0 ? (
                                  chemical.chemicalRegulations.map((regId: any, index: number) => (
                                    <Badge key={index} variant="outline">
                                      {regId.regulation ? regId.regulation.name : 'Unknown Regulation'}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">No regulations</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="icon" variant="outline" onClick={saveEditing}>
                                  <Save className="h-4 w-4" />
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
                                      : "bg-red-500"
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
                                  chemical.chemicalRegulations.map((regId: any, index: number) => (
                                    <Badge key={index} variant="outline">
                                      {regId.regulation ? regId.regulation.name : 'Unknown Regulation'}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">No regulations</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="icon" variant="outline" onClick={() => startEditing(chemical._id)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="outline">
                                  <Trash2 className="h-4 w-4" />
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
                  <CardDescription>Add, edit, or delete regulations in the system</CardDescription>
                </div>
                <Button className="gap-2" onClick={() => setShowAddRegulationForm(true)}>
                  <Plus className="h-4 w-4" />
                  Add New Regulation
                </Button>
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
                      <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center">
                        <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          Drag and drop regulation file here, or click to select file
                        </p>
                        <input type="file" id="regulation-upload" className="hidden" accept=".pdf,.docx,.xlsx" />
                        <label htmlFor="regulation-upload">
                          <Button
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => document.getElementById("regulation-upload")?.click()}
                          >
                            Select File
                          </Button>
                        </label>
                      </div>
                    )}

                    {addRegulationMethod === "link" && (
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="reg-name-link">Regulation Name</Label>
                          <Input id="reg-name-link" placeholder="e.g., Regulation (EU) 10/2011" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-url">Regulation URL</Label>
                          <div className="flex gap-2">
                            <Input id="reg-url" placeholder="e.g., https://eur-lex.europa.eu/..." />
                            <Button variant="outline" className="shrink-0">
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Verify
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddRegulationForm(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddRegulation}>Add Regulation</Button>
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
                    <TableHead>Featured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regulations.map((regulation) => (
                    <TableRow key={regulation.id}>
                      <TableCell className="font-medium">{regulation.name}</TableCell>
                      <TableCell>{regulation.country}</TableCell>
                      <TableCell>{regulation.region}</TableCell>
                      <TableCell>{regulation.lastUpdated}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {regulationToTags[regulation.id]?.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFeatured(regulation.id)}
                          className={regulation.featured ? "text-yellow-500" : "text-muted-foreground"}
                        >
                          <Star className="h-4 w-4" fill={regulation.featured ? "currentColor" : "none"} />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="outline" onClick={() => openUpdateRegulationDialog(regulation)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
      ;
      <Dialog open={showAddChemicalDialog} onOpenChange={setShowAddChemicalDialog}>
        <DialogContent className="max-w-4xl">
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
                    // Update the Status dropdown in the manual entry form
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
                    // Update the Risk Level dropdown in the manual entry form
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
                                onClick={() => {
                                  if (customRegulationName.trim()) {
                                    setCurrentRegulation({
                                      id: 999, // Temporary ID for custom regulation
                                      name: customRegulationName,
                                      sml: "",
                                    })
                                    setShowRegulationSelector(true)
                                    setCustomRegulationName("")
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
                          const regulationInfo = mockRegulationsWithSML.find((r) => r.id === reg.id)
                          return (
                            <TableRow key={index}>
                              <TableCell>{reg.name}</TableCell>
                              <TableCell>{reg.sml}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {regulationInfo?.category || excelImportSettings.category || "General"}
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

              <TabsContent value="file" className="space-y-4 pt-4">
                <div className="border rounded-md p-4 mb-4">
                  <h3 className="text-lg font-medium mb-4">Default Settings for Imported Chemicals</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    All chemicals imported from the file will be assigned these default values. You can edit individual
                    chemicals later.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="default-status">Default Status</Label>
                      // Update the Default Status dropdown in the import from file settings
                      <Select
                        value={excelImportSettings.status}
                        onValueChange={(value) => setExcelImportSettings({ ...excelImportSettings, status: value })}
                      >
                        <SelectTrigger id="default-status">
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
                      <Label htmlFor="default-risk">Default Risk Level</Label>
                      // Update the Default Risk Level dropdown in the import from file settings
                      <Select
                        value={excelImportSettings.riskLevel}
                        onValueChange={(value) => setExcelImportSettings({ ...excelImportSettings, riskLevel: value })}
                      >
                        <SelectTrigger id="default-risk">
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

                    <div className="grid gap-2">
                      <Label htmlFor="default-regulation">Default Regulation</Label>
                      <div className="flex gap-2">
                        <Select
                          value={excelImportSettings.regulation.toString()}
                          onValueChange={(value) =>
                            setExcelImportSettings({ ...excelImportSettings, regulation: Number.parseInt(value) })
                          }
                          className="flex-1"
                        >
                          <SelectTrigger id="default-regulation">
                            <SelectValue placeholder="Select regulation" />
                          </SelectTrigger>
                          <SelectContent>
                            {mockRegulationsWithSML.map((reg) => (
                              <SelectItem key={reg.id} value={reg.id.toString()}>
                                {reg.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              Custom
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-60">
                            <div className="grid gap-2">
                              <Label htmlFor="custom-reg-name">Custom Regulation</Label>
                              <Input
                                id="custom-reg-name"
                                placeholder="Enter regulation name"
                                value={customRegulationName}
                                onChange={(e) => setCustomRegulationName(e.target.value)}
                              />
                              <Button
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                  if (customRegulationName.trim()) {
                                    alert(
                                      `Custom regulation "${customRegulationName}" would be created and set as default`,
                                    )
                                    setCustomRegulationName("")
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="default-category">Default Category</Label>
                      <div className="flex gap-2">
                        <Select
                          value={excelImportSettings.category}
                          onValueChange={(value) => setExcelImportSettings({ ...excelImportSettings, category: value })}
                          className="flex-1"
                        >
                          <SelectTrigger id="default-category">
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
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              Custom
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-60">
                            <div className="grid gap-2">
                              <Label htmlFor="custom-category-name">Custom Category</Label>
                              <Input
                                id="custom-category-name"
                                placeholder="Enter category name"
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                              />
                              <Button
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                  if (customCategory.trim()) {
                                    setExcelImportSettings({ ...excelImportSettings, category: customCategory })
                                    setCustomCategory("")
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="default-region">Default Region</Label>
                      <div className="flex gap-2">
                        <Select
                          value={excelImportSettings.region}
                          onValueChange={(value) => setExcelImportSettings({ ...excelImportSettings, region: value })}
                          className="flex-1"
                        >
                          <SelectTrigger id="default-region">
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
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              Custom
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-60">
                            <div className="grid gap-2">
                              <Label htmlFor="custom-region-name">Custom Region</Label>
                              <Input
                                id="custom-region-name"
                                placeholder="Enter region name"
                                value={customRegion}
                                onChange={(e) => setCustomRegion(e.target.value)}
                              />
                              <Button
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                  if (customRegion.trim()) {
                                    setExcelImportSettings({ ...excelImportSettings, region: customRegion })
                                    setCustomRegion("")
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="mb-2 text-sm text-muted-foreground">Upload Excel or CSV file with chemical data</p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    File should contain columns for: Chemical Name, CAS Number
                  </p>
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
                    >
                      Select File
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
            <Button onClick={handleAddChemical}>Add Chemical</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      ;
      <Dialog open={showRegulationSelector} onOpenChange={setShowRegulationSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Regulation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!currentRegulation ? (
              <div className="grid gap-2">
                <Label htmlFor="regulation-select">Select Regulation</Label>
                <Select
                  onValueChange={(value) => {
                    const regId = Number.parseInt(value)
                    const reg = mockRegulationsWithSML.find((r) => r.id === regId)
                    if (reg) {
                      setCurrentRegulation({
                        id: reg.id,
                        name: reg.name,
                        sml: "",
                      })
                    }
                  }}
                >
                  <SelectTrigger id="regulation-select">
                    <SelectValue placeholder="Select a regulation" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockRegulationsWithSML.map((reg) => (
                      <SelectItem key={reg.id} value={reg.id.toString()}>
                        {reg.name} ({reg.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <Button onClick={addRegulationToChemical} disabled={!currentRegulation || !currentRegulation.sml}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showUpdateRegulationDialog} onOpenChange={setShowUpdateRegulationDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Update Regulation</DialogTitle>
          </DialogHeader>
          {currentRegulationToUpdate && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="update-reg-name">Regulation Name</Label>
                <Input id="update-reg-name" defaultValue={currentRegulationToUpdate.name} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="update-reg-country">Country/Authority</Label>
                <Input id="update-reg-country" defaultValue={currentRegulationToUpdate.country} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="update-reg-description">Description</Label>
                <Textarea
                  id="update-reg-description"
                  placeholder="Brief description of the regulation update"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="update-reg-changes">Changes Made</Label>
                <Textarea id="update-reg-changes" placeholder="Describe the changes in this update" rows={3} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="update-reg-date">Update Date</Label>
                <Input id="update-reg-date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <Switch id="update-featured-regulation" defaultChecked={currentRegulationToUpdate.featured} />
                <Label htmlFor="update-featured-regulation">Feature on homepage</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="update-show-in-updates" defaultChecked={true} />
                <Label htmlFor="update-show-in-updates">Show in Regulations Updates</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateRegulationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRegulation}>Update Regulation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                      if (range) {
                        setDateRange({
                          from: range.from,
                          to: range.to
                        });
                      } else {
                        setDateRange({ from: undefined, to: undefined });
                      }
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

