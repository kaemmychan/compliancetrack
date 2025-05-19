"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, AlertTriangle, CheckCircle, Plus, FileSpreadsheet, Download } from "lucide-react"

// Mock data for demonstration
const mockUploadResults = [
  { id: 1, name: "Bisphenol A", casNumber: "80-05-7", matched: true, regulations: ["EU 10/2011", "FDA CFR 177.1580"] },
  { id: 2, name: "Titanium Dioxide", casNumber: "13463-67-7", matched: true, regulations: ["EU 10/2011", "GB 9685"] },
  {
    id: 3,
    name: "Diethylhexyl Phthalate",
    casNumber: "117-81-7",
    matched: true,
    regulations: ["EU 10/2011", "Japan JHOSPA"],
  },
  {
    id: 4,
    name: "Polyethylene Terephthalate",
    casNumber: "25038-59-9",
    matched: true,
    regulations: ["EU 10/2011", "FDA CFR 177.1630"],
  },
  { id: 5, name: "Formaldehyde", casNumber: "50-00-0", matched: true, regulations: ["GB 9685", "FDA CFR 175.105"] },
  { id: 6, name: "New Chemical X", casNumber: "12345-67-8", matched: false, regulations: [] },
  { id: 7, name: "New Chemical Y", casNumber: "98765-43-2", matched: false, regulations: [] },
]

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploaded, setIsUploaded] = useState(false)
  const [uploadResults, setUploadResults] = useState<typeof mockUploadResults>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = () => {
    if (!file) return

    // Simulate upload and processing
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setIsUploaded(true)
      setUploadResults(mockUploadResults)
    }, 2000)
  }

  const handleExport = () => {
    // In a real app, this would generate and download a CSV/Excel file
    alert(`File would be exported as ${file?.name || "processed_data.csv"}`)
  }

  const matchedCount = uploadResults.filter((item) => item.matched).length
  const unmatchedCount = uploadResults.filter((item) => !item.matched).length

  const handleAddAllNewChemicals = () => {
    // In a real app, this would add all unmatched chemicals to the database
    alert("All new chemicals would be added to the database")
  }

  return (
    <div className="container py-12">
      <div className="flex flex-col items-center space-y-4 text-center mb-8">
        <h1 className="text-3xl font-bold">Upload Database</h1>
        <p className="text-muted-foreground max-w-[700px]">
          Upload Excel files with chemical data to match with existing database
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Excel File</CardTitle>
          <CardDescription>Supports .xlsx or .csv files with chemical data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="mb-2 text-sm text-muted-foreground">Drag and drop files here, or click to select files</p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
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
            {file && (
              <div className="mt-4">
                <p className="text-sm">Selected file: {file.name}</p>
                <Button onClick={handleUpload} className="mt-2 gap-2" disabled={isProcessing}>
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload and Process
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isUploaded && (
        <>
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Upload Successful</AlertTitle>
            <AlertDescription>
              Found {uploadResults.length} chemicals, {matchedCount} matched successfully, {unmatchedCount} not found in
              database
            </AlertDescription>
          </Alert>

          <div className="flex justify-between mb-4">
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Processed File
            </Button>

            {unmatchedCount > 0 && (
              <Button onClick={handleAddAllNewChemicals} className="gap-2">
                <Plus className="h-4 w-4" />
                Add All New Chemicals
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Matching Results</CardTitle>
              <CardDescription>List of uploaded chemicals and matching results with existing database</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chemical Name</TableHead>
                    <TableHead>CAS Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Related Regulations</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadResults.map((chemical) => (
                    <TableRow key={chemical.id}>
                      <TableCell className="font-medium">{chemical.name}</TableCell>
                      <TableCell>{chemical.casNumber}</TableCell>
                      <TableCell>
                        {chemical.matched ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" /> Matched
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Not Found
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {chemical.matched ? (
                          <div className="flex flex-wrap gap-1">
                            {chemical.regulations.map((reg, index) => (
                              <Badge key={index} variant="outline">
                                {reg}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No data</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!chemical.matched && (
                          <Button size="sm" variant="outline" className="gap-1">
                            <Plus className="h-3 w-3" />
                            Add New Chemical
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

