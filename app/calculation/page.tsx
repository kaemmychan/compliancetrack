"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Calculator,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Plus,
  Trash2,
  Search,
  Loader2,
  FileSpreadsheet,
  FileText,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { searchChemicals } from "@/lib/api"
import { debounce } from "lodash"
import * as XLSX from 'xlsx'

// Define types for database chemicals
interface ChemicalRegulation {
  id: string
  name: string
  shortName?: string
  country: string
  region: string
  categories: string[]
  smlValue?: string
}

interface DatabaseChemical {
  id: string
  name: string
  casNumber: string
  status: string
  riskLevel: string
  riskDescription?: string
  regulations: ChemicalRegulation[]
}



interface RegulationResult {
  regulation: ChemicalRegulation
  smlValue: number | null
  passed: boolean | null
}

interface Substance {
  id: string
  name: string
  casNumber: string
  q: number // Contamination in mg/kg
  fromDatabase: boolean
  sml?: number
  regulations?: ChemicalRegulation[] // Store all regulations when from database
}

interface CalculationResult {
  substance: Substance
  mValue: number
  regulationResults: RegulationResult[]
}

export default function CalculationPage() {
  const [activeStep, setActiveStep] = useState(1)
  const [calculationCase, setCalculationCase] = useState<1 | 2>(1)
  const [packagingParams, setPackagingParams] = useState({
    a: 600, // Surface area in cm²
    lp: 0.1, // Thickness in cm
    d: 1, // Density in g/cm³
    f: 1000, // Food weight in g
  })
  const [substances, setSubstances] = useState<Substance[]>([
    { id: crypto.randomUUID(), name: "", casNumber: "", q: 1, fromDatabase: false },
  ])
  const [results, setResults] = useState<CalculationResult[]>([])
  const [hasCalculated, setHasCalculated] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<DatabaseChemical[]>([])
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const [currentSubstanceIndex, setCurrentSubstanceIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPackagingParams((prev) => ({
      ...prev,
      [name]: Number.parseFloat(value) || 0,
    }))
  }

  const handleSubstanceInputChange = (index: number, field: keyof Substance, value: string | number) => {
    const newSubstances = [...substances]
    newSubstances[index] = {
      ...newSubstances[index],
      [field]: field === "q" ? Number(value) || 0 : value,
    }
    setSubstances(newSubstances)
  }

  const handleCaseChange = (value: string) => {
    const caseNumber = Number.parseInt(value) as 1 | 2
    setCalculationCase(caseNumber)

    // Set default values based on case
    if (caseNumber === 2) {
      setPackagingParams((prev) => ({
        ...prev,
        a: 600,
        f: 1000,
      }))
    }
  }

  const addNewSubstance = () => {
    setSubstances([...substances, { id: crypto.randomUUID(), name: "", casNumber: "", q: 1, fromDatabase: false }])
  }

  const removeSubstance = (index: number) => {
    if (substances.length === 1) {
      // Don't remove the last substance, just clear it
      setSubstances([{ id: crypto.randomUUID(), name: "", casNumber: "", q: 1, fromDatabase: false }])
    } else {
      const newSubstances = [...substances]
      newSubstances.splice(index, 1)
      setSubstances(newSubstances)
    }
  }

  // Create a debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      try {
        setIsSearching(true)
        setSearchError(null)

        // Call the API to search for chemicals
        const result = await searchChemicals(term)

        // Update the search results
        setSearchResults(result.data || [])
      } catch (err) {
        console.error('Error searching chemicals:', err)
        setSearchError('Failed to search chemicals. Please try again.')
        // Fallback to mock data if API fails
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300),
    []
  )

  // Handle search input change with live search
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    if (!value.trim()) {
      // If search term is empty, clear results
      setSearchResults([])
      return
    }

    // Trigger the debounced search
    debouncedSearch(value)
  }

  // Extract SML values from regulations
  const getSmlValues = (chemical: DatabaseChemical) => {
    // Default value if no regulations found
    let smlValue: number | undefined = undefined

    if (chemical.regulations && chemical.regulations.length > 0) {
      // Get the first regulation's SML value as the default SML
      const firstRegWithSml = chemical.regulations.find(reg => reg.smlValue)
      if (firstRegWithSml && firstRegWithSml.smlValue) {
        smlValue = parseFloat(firstRegWithSml.smlValue)
      }
    }

    return { sml: smlValue }
  }

  const selectChemicalFromDatabase = (chemical: DatabaseChemical) => {
    const { sml } = getSmlValues(chemical)

    const newSubstances = [...substances]
    newSubstances[currentSubstanceIndex] = {
      id: crypto.randomUUID(),
      name: chemical.name,
      casNumber: chemical.casNumber,
      q: substances[currentSubstanceIndex].q,
      fromDatabase: true,
      sml,
      regulations: chemical.regulations,
    }
    setSubstances(newSubstances)
    setIsSearchDialogOpen(false)
  }

  // Load initial chemicals when dialog opens
  const loadInitialChemicals = useCallback(async () => {
    try {
      setIsSearching(true)
      setSearchError(null)

      // Call the API to get recent/popular chemicals (empty query returns recent chemicals)
      const result = await searchChemicals("")

      // Update the search results
      setSearchResults(result.data || [])
    } catch (err) {
      console.error('Error loading initial chemicals:', err)
      setSearchError('Failed to load chemicals. Please try searching by name or CAS number.')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const openSearchDialog = (index: number) => {
    setCurrentSubstanceIndex(index)
    setSearchTerm("")
    setSearchResults([])
    setSearchError(null)
    setIsSearchDialogOpen(true)

    // Load initial chemicals
    loadInitialChemicals()
  }

  const calculateM = () => {
    // Calculate M value for each substance using formula: M = (Q × A × Lp × D) / F
    const { a, lp, d, f } = packagingParams

    const calculatedResults = substances.map((substance) => {
      const mValue = (substance.q * a * lp * d) / f

      // Create regulation results for all regulations
      const regulationResults: RegulationResult[] = []

      if (substance.fromDatabase && substance.regulations && substance.regulations.length > 0) {
        // Process all regulations with SML values
        substance.regulations.forEach(regulation => {
          if (regulation.smlValue) {
            const smlValue = parseFloat(regulation.smlValue)
            const passed = !isNaN(smlValue) ? mValue < smlValue : null

            regulationResults.push({
              regulation,
              smlValue: !isNaN(smlValue) ? smlValue : null,
              passed
            })
          }
        })
      }

      return {
        substance,
        mValue,
        regulationResults
      }
    })

    setResults(calculatedResults)
    setHasCalculated(true)
    setActiveStep(3)
  }

  const getStatusBadge = (passed: boolean | null) => {
    if (passed === null) {
      return (
        <Badge className="bg-gray-500">
          <HelpCircle className="h-3 w-3 mr-1" /> Unknown
        </Badge>
      )
    } else if (passed) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" /> Pass
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-red-500">
          <AlertTriangle className="h-3 w-3 mr-1" /> Fail
        </Badge>
      )
    }
  }

  const isCalculationReady = () => {
    // Check if all required packaging parameters are valid
    const validPackaging =
      packagingParams.a > 0 && packagingParams.lp > 0 && packagingParams.d > 0 && packagingParams.f > 0

    // Check if at least one substance is properly defined
    const validSubstances = substances.some((s) => s.name.trim() !== "" && s.q > 0)

    return validPackaging && validSubstances
  }



  // Function to download results as Excel or CSV file
  const handleDownloadResults = (format: 'xlsx' | 'csv') => {
    try {
      // Create header row
      const headerRow = [
        'Chemical Name',
        'CAS Number',
        'Q Value (mg/kg)',
        'M Value (mg/kg)',
        'Regulation Name',
        'SML (mg/kg)',
        'Result'
      ];

      // Create data rows
      const dataRows: any[][] = [];

      // For each result, create one or more rows
      results.forEach(result => {
        if (result.regulationResults.length > 0) {
          // Create one row for each regulation
          result.regulationResults.forEach((regResult, index) => {
            const row = [
              index === 0 ? result.substance.name || 'Unnamed' : '', // Only show name in first row
              index === 0 ? result.substance.casNumber || '-' : '',  // Only show CAS in first row
              index === 0 ? result.substance.q : '',                 // Only show Q in first row
              index === 0 ? result.mValue : '',                      // Only show M in first row
              regResult.regulation.shortName || regResult.regulation.name,
              regResult.smlValue !== null && !isNaN(regResult.smlValue) ? regResult.smlValue : '-',
              regResult.passed === null ? 'Unknown' : regResult.passed ? 'Pass' : 'Fail'
            ];
            dataRows.push(row);
          });
        } else {
          // If no regulations, create a single row
          const row = [
            result.substance.name || 'Unnamed',
            result.substance.casNumber || '-',
            result.substance.q,
            result.mValue,
            'No regulation data',
            '-',
            '-'
          ];
          dataRows.push(row);
        }
      });

      // Combine all data
      const wsData = [
        // Header row
        headerRow,
        // Data rows
        ...dataRows,
        // Empty row
        [],
        // Calculation parameters
        ['Calculation Parameters'],
        ['Case Type:', `Case ${calculationCase}`],
        ['A (Surface Area):', `${packagingParams.a} cm²`],
        ['Lp (Thickness):', `${packagingParams.lp} cm`],
        ['D (Density):', `${packagingParams.d} g/cm³`],
        ['F (Food Weight):', `${packagingParams.f} g`],
        // Formula
        ['Formula:', 'M = (Q × A × Lp × D) / F'],
      ];

      // Generate filename with date
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (format === 'xlsx') {
        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths
        const colWidths = [
          { wch: 25 }, // Chemical Name
          { wch: 15 }, // CAS Number
          { wch: 15 }, // Q Value
          { wch: 15 }, // M Value
          { wch: 30 }, // Regulation Name
          { wch: 15 }, // SML
          { wch: 10 }, // Result
        ];
        ws['!cols'] = colWidths;

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Calculation Results');

        // Download Excel file
        const filename = `m_value_calculation_${dateStr}.xlsx`;
        XLSX.writeFile(wb, filename);
      } else if (format === 'csv') {
        // Convert data to CSV
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const csv = XLSX.utils.sheet_to_csv(ws);

        // Create a Blob with the CSV data
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

        // Create a download link
        const link = document.createElement('a');
        const filename = `m_value_calculation_${dateStr}.csv`;

        // Create a URL for the Blob
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', filename);

        // Append the link to the body, click it, and remove it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Release the URL object
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (error) {
      console.error(`Error generating ${format.toUpperCase()} file:`, error);
      alert(`Failed to generate ${format.toUpperCase()} file. Please try again.`);
    }
  }

  return (
    <div className="container py-12">
      <div className="flex flex-col items-center space-y-4 text-center mb-8">
        <h1 className="text-3xl font-bold">Calculate Worst Case Scenario</h1>
        <p className="text-muted-foreground max-w-[700px]">
          Calculate M value according to the formula and compare with SML (Specific Migration Limit)
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="flex items-center">
          <div
            className={`rounded-full w-10 h-10 flex items-center justify-center ${activeStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            1
          </div>
          <div className={`h-1 w-16 ${activeStep >= 2 ? "bg-primary" : "bg-muted"}`}></div>
          <div
            className={`rounded-full w-10 h-10 flex items-center justify-center ${activeStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            2
          </div>
          <div className={`h-1 w-16 ${activeStep >= 3 ? "bg-primary" : "bg-muted"}`}></div>
          <div
            className={`rounded-full w-10 h-10 flex items-center justify-center ${activeStep >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            3
          </div>
        </div>
      </div>

      <div className="grid gap-8">
        {activeStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Step 1: Select Calculation Case
              </CardTitle>
              <CardDescription>Choose the appropriate case for your calculation</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={calculationCase.toString()} onValueChange={handleCaseChange} className="space-y-4">
                <div className="flex items-start space-x-2 border p-4 rounded-md">
                  <RadioGroupItem value="1" id="case1" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="case1" className="font-medium">
                      Case 1: Known packaging contact area and food weight
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Use this when you know the specific surface area of the packaging that contacts food and the
                      weight of the food.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2 border p-4 rounded-md">
                  <RadioGroupItem value="2" id="case2" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="case2" className="font-medium">
                      Case 2: Unknown packaging contact area and food weight
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Use this when you don't know the specific surface area or food weight. Default values will be used
                      (A = 600 cm², F = 1000 g).
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={() => setActiveStep(2)}>
                Next Step <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {activeStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Step 2: Enter Parameters for Calculation
              </CardTitle>
              <CardDescription>Enter packaging parameters and add substances to calculate M value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Packaging Parameters Section */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Packaging Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="a">A (Contact Surface Area, cm²)</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>พื้นที่ผิวของบรรจุภัณฑ์ที่สัมผัสกับอาหาร (unit: cm²)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="a"
                        name="a"
                        type="number"
                        value={packagingParams.a}
                        onChange={handleInputChange}
                        min="0"
                        step="0.1"
                        disabled={calculationCase === 2}
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="lp">Lp (Thickness, cm)</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>ความหนาของวัสดุบรรจุภัณฑ์ (unit: cm)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="lp"
                        name="lp"
                        type="number"
                        value={packagingParams.lp}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="d">D (Density, g/cm³)</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>ความหนาแน่นของวัสดุบรรจุภัณฑ์ (unit: g/cm³)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="d"
                        name="d"
                        type="number"
                        value={packagingParams.d}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="f">F (Food Weight, g)</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>น้ำหนักของอาหารที่สัมผัสกับบรรจุภัณฑ์ (unit: g)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="f"
                        name="f"
                        type="number"
                        value={packagingParams.f}
                        onChange={handleInputChange}
                        min="0"
                        step="1"
                        disabled={calculationCase === 2}
                      />
                    </div>
                  </div>
                </div>

                {/* Substances Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Substances</h3>
                    <Button onClick={addNewSubstance} size="sm" className="gap-1">
                      <Plus className="h-4 w-4" /> Add Substance
                    </Button>
                  </div>

                  {substances.map((substance, index) => (
                    <div key={substance.id} className="border rounded-md p-4 mb-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Substance {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSubstance(index)}
                          aria-label="Remove substance"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="flex items-center justify-between h-6 mb-2">
                            <Label htmlFor={`substance-${index}-name`}>Chemical Name</Label>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openSearchDialog(index)}
                              title="Search from database"
                              className="h-6 w-6 p-0"
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            id={`substance-${index}-name`}
                            value={substance.name}
                            onChange={(e) => handleSubstanceInputChange(index, "name", e.target.value)}
                            placeholder="e.g., Bisphenol A"
                          />
                        </div>

                        <div>
                          <div className="h-6 mb-2">
                            <Label htmlFor={`substance-${index}-cas`}>CAS Number</Label>
                          </div>
                          <Input
                            id={`substance-${index}-cas`}
                            value={substance.casNumber}
                            onChange={(e) => handleSubstanceInputChange(index, "casNumber", e.target.value)}
                            placeholder="e.g., 80-05-7"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between h-6 mb-2">
                            <Label htmlFor={`substance-${index}-q`}>Q (Contamination, mg/kg)</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>ปริมาณการปนเปื้อนในวัสดุ (unit: mg/kg)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Input
                            id={`substance-${index}-q`}
                            type="number"
                            value={substance.q}
                            onChange={(e) => handleSubstanceInputChange(index, "q", e.target.value)}
                            min="0"
                            step="0.1"
                          />
                        </div>
                      </div>

                      {substance.fromDatabase && (
                        <div className="mt-2 bg-secondary p-2 rounded-md">
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-muted-foreground">
                              From database: {substance.sml ? `SML = ${substance.sml} mg/kg` : 'No SML specified'}
                            </p>
                            {substance.regulations && substance.regulations.length > 0 && (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {substance.regulations.slice(0, 2).map((reg, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {(reg.shortName || reg.name).length > 15
                                      ? (reg.shortName || reg.name).substring(0, 15) + '...'
                                      : (reg.shortName || reg.name)}
                                  </Badge>
                                ))}
                                {substance.regulations.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{substance.regulations.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveStep(1)}>
                Back
              </Button>
              <Button onClick={calculateM} disabled={!isCalculationReady()}>
                Calculate
              </Button>
            </CardFooter>
          </Card>
        )}

        {activeStep === 3 && hasCalculated && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Compare M Value with Regulations</CardTitle>
              <CardDescription>
                Comparing calculated M values with SML for each substance across regulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="table" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="table">Table View</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                </TabsList>
                <TabsContent value="table" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chemical</TableHead>
                        <TableHead>CAS Number</TableHead>
                        <TableHead>M Value (mg/kg)</TableHead>
                        <TableHead>Regulation</TableHead>
                        <TableHead>SML (mg/kg)</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        result.regulationResults.length > 0 ? (
                          // If the substance has regulations, show one row per regulation
                          result.regulationResults.map((regResult, regIndex) => (
                            <TableRow key={`${result.substance.id}-${regIndex}`}>
                              {regIndex === 0 ? (
                                // Only show substance info in the first row
                                <>
                                  <TableCell className="font-medium" rowSpan={result.regulationResults.length}>
                                    {result.substance.name || "Unnamed"}
                                  </TableCell>
                                  <TableCell rowSpan={result.regulationResults.length}>
                                    {result.substance.casNumber || "—"}
                                  </TableCell>
                                  <TableCell rowSpan={result.regulationResults.length}>
                                    {result.mValue.toFixed(4)}
                                  </TableCell>
                                </>
                              ) : null}
                              <TableCell className="max-w-[200px] truncate" title={regResult.regulation.shortName || regResult.regulation.name}>
                                {regResult.regulation.shortName || regResult.regulation.name}
                              </TableCell>
                              <TableCell>{regResult.smlValue !== null && !isNaN(regResult.smlValue) ? regResult.smlValue : '-'}</TableCell>
                              <TableCell>{getStatusBadge(regResult.passed)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          // If no regulations, show a single row
                          <TableRow key={result.substance.id}>
                            <TableCell className="font-medium">{result.substance.name || "Unnamed"}</TableCell>
                            <TableCell>{result.substance.casNumber || "—"}</TableCell>
                            <TableCell>{result.mValue.toFixed(4)}</TableCell>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              No regulation data available
                            </TableCell>
                          </TableRow>
                        )
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="summary" className="mt-4">
                  <div className="space-y-4">
                    <div className="p-4 border rounded-md">
                      <h3 className="text-lg font-medium mb-2">Calculation Parameters</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-sm font-medium">Case Type:</p>
                          <p className="text-sm text-muted-foreground">Case {calculationCase}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">A (Surface Area):</p>
                          <p className="text-sm text-muted-foreground">{packagingParams.a} cm²</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Lp (Thickness):</p>
                          <p className="text-sm text-muted-foreground">{packagingParams.lp} cm</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">D (Density):</p>
                          <p className="text-sm text-muted-foreground">{packagingParams.d} g/cm³</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">F (Food Weight):</p>
                          <p className="text-sm text-muted-foreground">{packagingParams.f} g</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-md">
                      <h3 className="text-lg font-medium mb-2">Results Summary</h3>
                      <div className="space-y-2">
                        {results.map((result) => (
                          <div
                            key={result.substance.id}
                            className="p-3 border rounded"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <p className="font-medium">{result.substance.name || "Unnamed"}</p>
                                <p className="text-sm text-muted-foreground">M Value: {result.mValue.toFixed(4)} mg/kg</p>
                              </div>
                              <div>
                                <Badge className={result.regulationResults.some(r => r.passed === false) ? "bg-red-500" :
                                       result.regulationResults.some(r => r.passed === true) ? "bg-green-500" : "bg-gray-500"}>
                                  {result.regulationResults.some(r => r.passed === false) ? "Failed" :
                                   result.regulationResults.some(r => r.passed === true) ? "Passed" : "No Data"}
                                </Badge>
                              </div>
                            </div>

                            {result.regulationResults.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                {result.regulationResults.map((regResult, idx) => (
                                  <div key={idx} className="border rounded p-2 text-center">
                                    <p className="text-xs text-muted-foreground max-w-[150px] truncate mx-auto"
                                       title={regResult.regulation.shortName || regResult.regulation.name}>
                                      {regResult.regulation.shortName || regResult.regulation.name}
                                    </p>
                                    <div className="flex flex-col items-center mt-1">
                                      {getStatusBadge(regResult.passed)}
                                      <span className="text-xs text-muted-foreground mt-1">
                                        SML: {regResult.smlValue !== null && !isNaN(regResult.smlValue) ? `${regResult.smlValue} mg/kg` : '-'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center mt-2">
                                No regulation data available
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 border rounded-md bg-muted/50">
                      <h3 className="text-lg font-medium mb-2">Calculation Process</h3>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Select calculation case (Case {calculationCase})</li>
                        <li>Enter packaging parameters</li>
                        <li>Add substances with Q values</li>
                        <li>Calculate M = (Q × A × Lp × D) / F for each substance</li>
                        <li>Compare M with SML values from regulations</li>
                        <li>
                          Determine compliance:
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li className="text-green-600">If M &lt;= SML → Pass</li>
                            <li className="text-red-600">If M &gt; SML → Fail (requires further consideration)</li>
                            <li className="text-gray-600">If SML unknown → Further investigation needed</li>
                          </ul>
                        </li>
                      </ol>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div>
                <Button variant="outline" onClick={() => setActiveStep(2)} className="mr-2">
                  Back to Parameters
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleDownloadResults('xlsx')} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={() => handleDownloadResults('csv')} className="gap-2">
                    <FileText className="h-4 w-4" />
                    CSV
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveStep(1)
                  setHasCalculated(false)
                }}
              >
                Start New Calculation
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      {/* Chemical Search Dialog */}
      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Search Chemical Database</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <Input
              value={searchTerm}
              onChange={handleSearchInputChange}
              placeholder="Search by chemical name or CAS number"
              className="w-full"
              autoFocus
            />
            {searchTerm.trim() && searchTerm.length < 2 && (
              <p className="text-xs text-muted-foreground mt-1">Type at least 2 characters to search</p>
            )}
          </div>

          {searchError && (
            <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md mb-4">
              {searchError}
            </div>
          )}

          <div className="max-h-[400px] overflow-y-auto">
            {isSearching ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Searching chemicals...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[55%]">Chemical Name</TableHead>
                    <TableHead className="w-[30%]">CAS Number</TableHead>
                    <TableHead className="w-[15%] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((chemical) => (
                      <TableRow key={chemical.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{chemical.name}</TableCell>
                        <TableCell>{chemical.casNumber}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white font-medium"
                            onClick={() => selectChemicalFromDatabase(chemical)}
                          >
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : searchTerm.length >= 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                No chemicals found matching "{searchTerm}"
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Start typing to search for chemicals
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

