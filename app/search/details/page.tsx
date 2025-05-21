"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, Loader2, ExternalLink, Sparkles, Info } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import mongoose from "mongoose"

// Define types for our data
interface Regulation {
  _id: string;
  name: string;
  shortName?: string;
  country?: string;
  link?: string;
}

interface ChemicalRegulation {
  id: string;
  regulation: Regulation;
  smlValue?: string;
  smlUnit?: string;
  notes?: string;
  restrictions?: string;
}

interface AISummary {
  regulationId: string;
  regulationName: string;
  summary: string;
  keyPoints: string[];
  lastUpdated: string;
  confidence: number; // 0-1 value representing AI confidence
}

interface Chemical {
  _id: string;
  name: string;
  casNumber: string;
  status: string;
  riskLevel: string;
  riskDescription?: string;
  chemicalRegulations?: ChemicalRegulation[];
  additionalInfo?: Record<string, string>;
  aiSummaries?: AISummary[]; // AI-generated summaries
  createdAt: string;
  updatedAt: string;
}

interface RecentSearch {
  id: string;
  name: string;
  casNumber: string;
}

export default function ChemicalDetailsPage() {
  const searchParams = useSearchParams()
  const chemicalId = searchParams.get("id")
  const [chemical, setChemical] = useState<Chemical | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [aiSummaries, setAiSummaries] = useState<AISummary[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Helper function to validate MongoDB ObjectId
  const isValidObjectId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id);
  }

  // Function to fetch AI summaries
  const fetchAiSummaries = async (id: string) => {
    try {
      setAiLoading(true)
      setAiError(null)

      // In a real implementation, this would call an actual AI service
      // For now, we'll use mock data
      const response = await fetch(`/api/ai-summary/${id}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch AI summaries')
      }

      setAiSummaries(result.data)
    } catch (err: unknown) {
      console.error('Error fetching AI summaries:', err)
      setAiError(err instanceof Error ? err.message : 'Failed to fetch AI summaries')
    } finally {
      setAiLoading(false)
    }
  }

  // Fetch chemical details
  useEffect(() => {
    if (!chemicalId) return

    const fetchChemicalDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        // Validate the chemical ID format before making the API request
        if (!isValidObjectId(chemicalId)) {
          throw new Error('Invalid chemical ID format')
        }

        const response = await fetch(`/api/chemicals/${chemicalId}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch chemical details')
        }

        const chemicalData = result.data
        setChemical(chemicalData)

        // Fetch AI summaries after getting chemical details
        fetchAiSummaries(chemicalId)

        // Get recent searches from session storage and update with current chemical
        try {
          let recentSearchList = []
          const storedSearches = sessionStorage.getItem('recentChemicalSearches')

          if (storedSearches) {
            recentSearchList = JSON.parse(storedSearches)

            // Remove this chemical if it already exists in the list
            recentSearchList = recentSearchList.filter((item: RecentSearch) => item.id !== chemicalData._id)
          }

          // Add current chemical to the beginning of the list
          recentSearchList.unshift({
            id: chemicalData._id,
            name: chemicalData.name,
            casNumber: chemicalData.casNumber
          })

          // Limit to 5 recent searches
          if (recentSearchList.length > 5) {
            recentSearchList = recentSearchList.slice(0, 5)
          }

          // Save back to session storage
          sessionStorage.setItem('recentChemicalSearches', JSON.stringify(recentSearchList))

          // Update state
          setRecentSearches(recentSearchList)
        } catch (storageError) {
          console.error('Error accessing session storage:', storageError)
        }
      } catch (err: unknown) {
        console.error('Error fetching chemical details:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch chemical details')
      } finally {
        setLoading(false)
      }
    }

    fetchChemicalDetails()
  }, [chemicalId])

  if (!chemicalId) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>Chemical Not Found</CardTitle>
            <CardDescription>No chemical ID was provided</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/search">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container py-12">
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Loading chemical details...</p>
        </div>
      </div>
    )
  }

  if (error || !chemical) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Chemical</CardTitle>
            <CardDescription>{error || 'Chemical not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/search">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "low":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" /> Low Risk
          </Badge>
        )
      case "medium":
        return (
          <Badge className="bg-yellow-500">
            <AlertTriangle className="h-3 w-3 mr-1" /> Medium Risk
          </Badge>
        )
      case "high":
        return (
          <Badge className="bg-red-500">
            <AlertTriangle className="h-3 w-3 mr-1" /> High Risk
          </Badge>
        )
      default:
        return <Badge>Unknown Risk</Badge>
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "allowed":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" /> Allowed
          </Badge>
        )
      case "restricted":
        return (
          <Badge className="bg-yellow-500">
            <AlertTriangle className="h-3 w-3 mr-1" /> Restricted
          </Badge>
        )
      case "prohibited":
        return (
          <Badge className="bg-red-500">
            <AlertTriangle className="h-3 w-3 mr-1" /> Prohibited
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="container py-12">
      <div className="mb-6">
        <Button asChild variant="outline" className="mb-4">
          <Link href="/search">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold">{chemical.name}</h1>
                  <div className="flex gap-2">
                    {getStatusBadge(chemical.status)}
                    {getRiskBadge(chemical.riskLevel)}
                  </div>
                </div>
                <p className="text-muted-foreground">CAS Number: {chemical.casNumber}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {chemical.riskDescription && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Risk Assessment</h3>
                  <p>{chemical.riskDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="regulations" className="space-y-4">
            <TabsList>
              <TabsTrigger value="regulations">Regulations</TabsTrigger>
              <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
              <TabsTrigger value="details">Chemical Details</TabsTrigger>
              {chemical.additionalInfo && Object.keys(chemical.additionalInfo).length > 0 && (
                <TabsTrigger value="additional">Additional Information</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="regulations">
              <Card>
                <CardHeader>
                  <CardTitle>Related Regulations</CardTitle>
                  <CardDescription>List of regulations related to {chemical.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  {chemical.chemicalRegulations && chemical.chemicalRegulations.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Regulation</TableHead>
                          <TableHead>SML Value</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Restrictions</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chemical.chemicalRegulations.map((relation: ChemicalRegulation) => (
                          <TableRow key={relation.id}>
                            <TableCell className="font-medium">
                              {relation.regulation.name}
                              {relation.regulation.country && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {relation.regulation.country}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {relation.smlValue ? (
                                <Badge variant="secondary" className="bg-blue-100">
                                  {relation.smlValue} {relation.smlUnit}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Not specified</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {relation.notes ? relation.notes : (
                                <span className="text-muted-foreground text-sm">No notes</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {relation.restrictions ? relation.restrictions : (
                                <span className="text-muted-foreground text-sm">No restrictions</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/regulations/details?id=${relation.regulation._id}`}>
                                    <FileText className="h-4 w-4 mr-1" />
                                    Details
                                  </Link>
                                </Button>
                                {relation.regulation.link && (
                                  <Button asChild variant="outline" size="sm">
                                    <a href={relation.regulation.link} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4 mr-1" />
                                      Official
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No regulations found for this chemical</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-analysis">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
                    AI Analysis
                  </CardTitle>
                  <CardDescription>
                    AI-generated summaries and insights about {chemical.name} in various regulations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                      <p className="text-muted-foreground">Analyzing regulations...</p>
                    </div>
                  ) : aiError ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-4" />
                      <p className="text-muted-foreground">{aiError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => fetchAiSummaries(chemicalId!)}
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : aiSummaries.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                      {aiSummaries.map((summary, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center">
                                <Info className="h-4 w-4 mr-2 text-primary" />
                                <span>
                                  {summary.regulationName}
                                  {summary.confidence >= 0.8 && (
                                    <Badge variant="secondary" className="ml-2 bg-green-100">High Confidence</Badge>
                                  )}
                                </span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <div className="text-sm text-muted-foreground">
                                Last updated: {new Date(summary.lastUpdated).toLocaleDateString()}
                              </div>
                              <div className="text-sm">
                                {summary.summary}
                              </div>
                              {summary.keyPoints.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="text-sm font-medium mb-2">Key Points:</h4>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {summary.keyPoints.map((point, i) => (
                                      <li key={i} className="text-sm">{point}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No AI analysis available for this chemical</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Chemical Details</CardTitle>
                  <CardDescription>Detailed information about {chemical.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Chemical Name</h3>
                        <p className="text-lg">{chemical.name}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">CAS Number</h3>
                        <p className="text-lg">{chemical.casNumber}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                        <div>{getStatusBadge(chemical.status)}</div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Risk Level</h3>
                        <div>{getRiskBadge(chemical.riskLevel)}</div>
                      </div>
                    </div>

                    {chemical.riskDescription && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Risk Description</h3>
                        <p>{chemical.riskDescription}</p>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Created At</h3>
                      <p>{new Date(chemical.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
                      <p>{new Date(chemical.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {chemical.additionalInfo && Object.keys(chemical.additionalInfo).length > 0 && (
              <TabsContent value="additional">
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                    <CardDescription>Other data related to {chemical.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(chemical.additionalInfo).map(([key, value]: [string, string]) => (
                        <div key={key}>
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">{key}</h3>
                          <p>{value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="md:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Recent Searches</CardTitle>
              <CardDescription>Your recent chemical searches</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSearches.length > 0 ? (
                <div className="space-y-2">
                  {recentSearches.map((result: RecentSearch) => (
                    <Link key={result.id} href={`/search/details?id=${result.id}`} className="block">
                      <div
                        className={`p-3 rounded-md border hover:bg-muted transition-colors ${result.id === chemical._id ? "bg-muted border-primary" : ""}`}
                      >
                        <div className="font-medium">{result.name}</div>
                        <div className="text-sm text-muted-foreground">CAS: {result.casNumber}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent searches found</p>
              )}
              <div className="mt-4">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/search">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Search
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

