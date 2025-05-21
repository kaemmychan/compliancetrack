"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, FileText, ExternalLink, Calculator, AlertCircle, Clock, Loader2 } from "lucide-react"

// Import interfaces for type safety
import { RegulationType } from "@/types/regulation";

export default function RegulationDetailsPage() {
  const searchParams = useSearchParams()
  const regulationId = searchParams.get("id")
  const chemicalId = searchParams.get("chemical")
  const [regulation, setRegulation] = useState<RegulationType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper function to validate MongoDB ObjectId using regex pattern
  const isValidObjectId = (id: string): boolean => {
    if (!id) return false;
    // MongoDB ObjectId is a 24-character hex string
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    return objectIdPattern.test(id);
  }

  // Fetch regulation data when the component mounts
  useEffect(() => {
    async function fetchRegulationData() {
      if (!regulationId) return

      try {
        setLoading(true)
        setError(null)

        // Validate the regulation ID format before making the API request
        if (!isValidObjectId(regulationId)) {
          throw new Error('Invalid regulation ID format')
        }

        // Import the fetchRegulationById function
        const { fetchRegulationById, fetchChemicalRegulations } = await import('@/lib/api')

        // Fetch the regulation data
        const regulationData = await fetchRegulationById(regulationId)

        // Fetch chemicals associated with this regulation
        const chemicalRegulationsResponse = await fetchChemicalRegulations(undefined, regulationId)
        const chemicalRegulations = chemicalRegulationsResponse.data || []

        // Log the regulation data for debugging
        console.log('Regulation data from API:', {
          id: regulationData._id,
          name: regulationData.name,
          updateHistory: regulationData.updateHistory,
          updateHistoryLength: regulationData.updateHistory ? regulationData.updateHistory.length : 0
        });

        // Combine the data
        setRegulation({
          ...regulationData,
          chemicals: chemicalRegulations
        })
      } catch (err: any) {
        console.error('Error fetching regulation details:', err)
        setError(err.message || 'Failed to load regulation details')
      } finally {
        setLoading(false)
      }
    }

    fetchRegulationData()
  }, [regulationId])

  // If a chemical ID is provided, redirect to the chemical details page
  if (chemicalId) {
    // We'll redirect to the chemical details page instead of showing mock data
    useEffect(() => {
      if (chemicalId) {
        window.location.href = `/search/details?id=${chemicalId}`;
      }
    }, [chemicalId]);

    // Show loading state while redirecting
    return (
      <div className="container py-12">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <h1 className="text-2xl font-bold mb-2">Redirecting to Chemical Details</h1>
          <p className="text-muted-foreground mb-6">Please wait while we redirect you to the chemical details page...</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="container py-12">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <h1 className="text-2xl font-bold mb-2">Loading Regulation Details</h1>
          <p className="text-muted-foreground mb-6">Please wait while we fetch the regulation information...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="container py-12">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error Loading Regulation</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild>
            <Link href="/regulations">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Regulations
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // If a regulation ID is provided and data is loaded, show details for that regulation
  if (regulationId && regulation) {

    return (
      <div className="container py-12">
        <div className="mb-8">
          <Button asChild variant="outline" className="mb-4">
            <Link href="/regulations">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Regulations
            </Link>
          </Button>

          <div className="flex flex-col space-y-4">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold mr-2">{regulation.name}</h1>
              <Badge>{regulation.country}</Badge>
              {regulation.updateHistory && regulation.updateHistory.length > 0 && <Badge className="ml-2 bg-yellow-500">Recently Updated</Badge>}
            </div>
            <p className="text-muted-foreground">{regulation.description}</p>
            <p className="text-sm text-muted-foreground">Last updated: {regulation.lastUpdated ? new Date(regulation.lastUpdated).toLocaleDateString() : 'Unknown'}</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="inline-flex h-auto">
            <TabsTrigger value="overview" className="h-10">Overview</TabsTrigger>
            <TabsTrigger value="chemicals" className="h-10">Regulated Chemicals</TabsTrigger>
            <TabsTrigger value="updates" id="updates-tab" className="h-10">Update History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Regulation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Show the most recent update from updateHistory if available */}
                {(() => {
                  // Debug the updateHistory field
                  console.log('Update history in overview tab:', {
                    exists: !!regulation.updateHistory,
                    length: regulation.updateHistory ? regulation.updateHistory.length : 0,
                    data: regulation.updateHistory,
                    type: typeof regulation.updateHistory
                  });

                  // Initialize updateHistory if it doesn't exist
                  if (!regulation.updateHistory) {
                    regulation.updateHistory = [{
                      date: regulation.lastUpdated || new Date(),
                      description: `Initial version of ${regulation.name}`
                    }];
                  }

                  // Check if updateHistory exists and is an array
                  if (regulation.updateHistory && Array.isArray(regulation.updateHistory) && regulation.updateHistory.length > 0) {
                    try {
                      // Make a copy of the array to avoid modifying the original
                      const historyArray = [...regulation.updateHistory];

                      // Sort the update history to get the most recent entry
                      const sortedHistory = historyArray.sort((a, b) => {
                        // Safely handle date conversion
                        const dateA = a.date ? new Date(a.date).getTime() : 0;
                        const dateB = b.date ? new Date(b.date).getTime() : 0;
                        return dateB - dateA;
                      });

                      const mostRecent = sortedHistory[0];

                      if (mostRecent && mostRecent.description) {
                        return (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                            <div className="flex items-center text-sm font-medium mb-2">
                              <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                              <span>Recent Update ({mostRecent.date ? new Date(mostRecent.date).toLocaleDateString() : 'Unknown date'})</span>
                            </div>
                            <p className="font-medium">{mostRecent.description}</p>
                            <div className="mt-2 text-right">
                              <Button variant="link" size="sm" asChild>
                                <Link href="#" onClick={(e) => {
                                  e.preventDefault();
                                  document.getElementById('updates-tab')?.click();
                                }}>
                                  View all updates
                                </Link>
                              </Button>
                            </div>
                          </div>
                        );
                      }
                    } catch (error) {
                      console.error('Error processing update history:', error);
                    }
                  }
                  return null;
                })()}

                {/* Removed legacy fallback for currentUpdateDetails */}


                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Overview</h3>
                    <p>{regulation.description}</p>
                  </div>

                  {regulation.updateDetails ? (
                    <div className="prose max-w-none">
                      <h3 className="text-lg font-medium mb-2">Detailed Information</h3>
                      <div className="whitespace-pre-wrap">{regulation.updateDetails}</div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-lg font-medium mb-2">Scope & Application</h3>
                        <p>This regulation applies to materials and products that are intended to come into contact with food or that can reasonably be expected to come into contact with food under normal or foreseeable conditions of use.</p>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium mb-2">Key Requirements</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Materials must be manufactured in compliance with good manufacturing practice.</li>
                          <li>Materials must not transfer their constituents to food in quantities that could endanger human health.</li>
                          <li>Materials must not change food composition, taste or odor in an unacceptable way.</li>
                          <li>Specific migration limits (SML) must be respected for substances listed in the regulation.</li>
                          <li>Appropriate documentation must be maintained to demonstrate compliance.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium mb-2">Compliance Requirements</h3>
                        <p>Manufacturers and importers must ensure that their products comply with this regulation by:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Conducting appropriate migration testing</li>
                          <li>Maintaining technical documentation</li>
                          <li>Issuing declarations of compliance</li>
                          <li>Ensuring traceability throughout the supply chain</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 mt-6 border-t">
                  <p className="text-sm text-muted-foreground">Reference Source</p>
                  <div className="flex gap-2">
                    {regulation.fileId && (
                      <Button asChild variant="outline" className="gap-2">
                        <a href={`/api/files/${regulation.fileId}`} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4" />
                          Download Document
                        </a>
                      </Button>
                    )}
                    {regulation.link && (
                      <Button asChild variant="outline" className="gap-2">
                        <a href={regulation.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Official Website
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chemicals">
            <Card>
              <CardHeader>
                <CardTitle>Chemicals Regulated Under This Regulation</CardTitle>
                <CardDescription>List of chemicals and their SML (Specific Migration Limit) values</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chemical Name</TableHead>
                      <TableHead>CAS Number</TableHead>
                      <TableHead>SML Value</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regulation.chemicals && regulation.chemicals
                      .filter((chemical: any) => {
                        const chemicalId = chemical.chemical?._id || chemical.chemical || chemical.id;
                        return isValidObjectId(chemicalId);
                      })
                      .map((chemical: any, index: number) => {
                        const chemicalId = chemical.chemical?._id || chemical.chemical || chemical.id;
                        return (
                          <TableRow
                            key={chemical._id || chemical.id || `chemical-${index}`}
                            className={chemical.updated ? "bg-yellow-50" : ""}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/search/details?id=${chemicalId}`}
                                className="hover:underline hover:text-primary"
                              >
                                {chemical.name || (chemical.chemical && chemical.chemical.name) || "Unknown Chemical"}
                                {chemical.updated && <Badge className="ml-2 bg-yellow-500">Updated</Badge>}
                              </Link>
                            </TableCell>
                            <TableCell>{chemical.casNumber || (chemical.chemical && chemical.chemical.casNumber) || "N/A"}</TableCell>
                            <TableCell>
                              {chemical.smlValue || chemical.sml || "N/A"} {chemical.smlUnit || chemical.unit || "mg/kg"}
                            </TableCell>
                            <TableCell>{chemical.notes || "N/A"}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/search/details?id=${chemicalId}`}>
                                    <FileText className="h-4 w-4 mr-1" />
                                    Details
                                  </Link>
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/calculation?chemical=${chemicalId}`}>
                                    <Calculator className="h-4 w-4 mr-1" />
                                    Calculate
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="updates">
            <Card>
              <CardHeader>
                <CardTitle>Update History</CardTitle>
                <CardDescription>History of changes to this regulation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Show updateDetails in the update history tab if it exists */}
                  {regulation.updateDetails && (
                    <div className="relative pl-6 pb-4 border-l-2 border-blue-500">
                      <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px]"></div>
                      <div className="flex items-center mb-1">
                        <Clock className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="font-medium">
                          {regulation.lastUpdated ? new Date(regulation.lastUpdated).toLocaleDateString() : 'Unknown date'} (Initial Version)
                        </span>
                      </div>
                      <p className="text-sm">{regulation.updateDetails}</p>
                    </div>
                  )}

                  {/* Show update history entries */}
                  {(() => {
                    // Debug the updateHistory field
                    console.log('Update history in render:', {
                      exists: !!regulation.updateHistory,
                      length: regulation.updateHistory ? regulation.updateHistory.length : 0,
                      data: regulation.updateHistory,
                      type: typeof regulation.updateHistory
                    });

                    // Initialize updateHistory if it doesn't exist
                    if (!regulation.updateHistory) {
                      regulation.updateHistory = [{
                        date: regulation.lastUpdated || new Date(),
                        description: `Initial version of ${regulation.name}`
                      }];
                    }

                    // Check if updateHistory exists and is an array
                    if (regulation.updateHistory && Array.isArray(regulation.updateHistory) && regulation.updateHistory.length > 0) {
                      // Make a copy of the array to avoid modifying the original
                      const historyArray = [...regulation.updateHistory];

                      // Sort the update history to show the most recent first
                      return historyArray
                        .sort((a, b) => {
                          // Safely handle date conversion
                          const dateA = a.date ? new Date(a.date).getTime() : 0;
                          const dateB = b.date ? new Date(b.date).getTime() : 0;
                          return dateB - dateA;
                        })
                        .map((update, index) => {
                          console.log('Rendering update entry:', update);
                          return (
                            <div key={index} className="relative pl-6 pb-4 border-l-2 border-yellow-500">
                              <div className="absolute w-3 h-3 bg-yellow-500 rounded-full -left-[7px]"></div>
                              <div className="flex items-center mb-1">
                                <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                                <span className="font-medium">
                                  {update.date ? new Date(update.date).toLocaleDateString() : 'Unknown date'}
                                </span>
                              </div>
                              <p className="text-sm font-medium">{update.description || 'No description provided'}</p>
                            </div>
                          );
                        });
                    }

                    // If updateHistory is not an array or is empty, return null
                    return null;
                  })()}

                  {/* Removed legacy fallback for previousUpdates */}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // If no valid ID is provided, show an error message
  return (
    <div className="container py-12">
      <Card>
        <CardHeader>
          <CardTitle>Data Not Found</CardTitle>
          <CardDescription>The specified regulation or chemical information was not found</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/regulations">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Regulations
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

