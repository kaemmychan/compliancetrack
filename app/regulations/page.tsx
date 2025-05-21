"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, FileText, ExternalLink, Filter, Clock, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchRegulations } from "@/lib/api"

// Define update history type
interface UpdateHistory {
  date: Date;
  description: string;
}

// Define regulation type
interface Regulation {
  _id: string
  name: string
  country: string
  region: string
  description: string
  link?: string
  lastUpdated: string
  featured: boolean
  categories: string[]
  updateDetails?: string
  updateHistory?: UpdateHistory[]
  fileId?: string
  fileName?: string
  fileSize?: number
  fileType?: string
}

// Categories for filtering
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

export default function RegulationsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [allRegulations, setAllRegulations] = useState<Regulation[]>([])
  const [filteredRegulations, setFilteredRegulations] = useState<{
    Europe: Regulation[]
    "North America": Regulation[]
    "South America": Regulation[]
    Asia: Regulation[]
    Africa: Regulation[]
    Oceania: Regulation[]
    Global: Regulation[]
  }>({
    Europe: [],
    "North America": [],
    "South America": [],
    Asia: [],
    Africa: [],
    Oceania: [],
    Global: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpdatesOnly, setShowUpdatesOnly] = useState(false)
  const [viewMode, setViewMode] = useState<"region" | "category">("region")
  const [selectedRegion, setSelectedRegion] = useState<string>("All")

  // Fetch regulations from the API
  useEffect(() => {
    const getRegulations = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchRegulations()
        setAllRegulations(data)

        // Group regulations by region
        const groupedByRegion = {
          Europe: data.filter((reg: Regulation) => reg.region === 'Europe'),
          "North America": data.filter((reg: Regulation) => reg.region === 'North America'),
          "South America": data.filter((reg: Regulation) => reg.region === 'South America'),
          Asia: data.filter((reg: Regulation) => reg.region === 'Asia'),
          Africa: data.filter((reg: Regulation) => reg.region === 'Africa'),
          Oceania: data.filter((reg: Regulation) => reg.region === 'Oceania'),
          Global: data.filter((reg: Regulation) => reg.region === 'Global')
        }

        setFilteredRegulations(groupedByRegion)
      } catch (err) {
        console.error('Error fetching regulations:', err)
        setError('Failed to load regulations. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    getRegulations()
  }, [])

  // Update filtered regulations whenever selected categories change
  useEffect(() => {
    if (!loading) {
      handleSearch();
    }
  }, [selectedCategories, selectedRegion, showUpdatesOnly, searchTerm])

  const handleSearch = () => {
    // Filter regulations based on search term, selected categories, and updates filter
    const filtered = {
      Europe: filterRegulationsBySearchAndCategory(allRegulations.filter(reg => reg.region === 'Europe')),
      "North America": filterRegulationsBySearchAndCategory(allRegulations.filter(reg => reg.region === 'North America')),
      "South America": filterRegulationsBySearchAndCategory(allRegulations.filter(reg => reg.region === 'South America')),
      Asia: filterRegulationsBySearchAndCategory(allRegulations.filter(reg => reg.region === 'Asia')),
      Africa: filterRegulationsBySearchAndCategory(allRegulations.filter(reg => reg.region === 'Africa')),
      Oceania: filterRegulationsBySearchAndCategory(allRegulations.filter(reg => reg.region === 'Oceania')),
      Global: filterRegulationsBySearchAndCategory(allRegulations.filter(reg => reg.region === 'Global'))
    }

    setFilteredRegulations(filtered)
  }

  const filterRegulationsBySearchAndCategory = (regulations: Regulation[]) => {
    return regulations.filter((reg) => {
      // Filter by search term if provided
      const matchesSearch =
        !searchTerm.trim() ||
        reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.country.toLowerCase().includes(searchTerm.toLowerCase())

      // Filter by selected categories if any
      // When categories are selected (checked), only show regulations that have at least one of those categories
      let matchesCategory = true;
      if (selectedCategories.length > 0) {
        // Only include regulations that have at least one of the selected categories
        matchesCategory = false;
        if (reg.categories && reg.categories.length > 0) {
          for (const cat of selectedCategories) {
            if (reg.categories.includes(cat)) {
              matchesCategory = true;
              break;
            }
          }
        }
      }

      // Filter by updates if the toggle is on
      const hasUpdateHistory = reg.updateHistory && reg.updateHistory.length > 0;
      const matchesUpdates = !showUpdatesOnly || reg.updateDetails || hasUpdateHistory;

      return matchesSearch && matchesCategory && matchesUpdates
    })
  }



  // Render a regulation card
  const renderRegulationCard = (regulation: Regulation, highlightCategory?: string) => (
    <Card key={regulation._id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex mb-3">
          <div className="flex-shrink-0 w-6 h-6 mr-3 flex items-center justify-center self-start mt-1 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="regulation-name-container">
              {regulation.name}
            </div>
            <div className="regulation-badges">
              {(regulation.updateHistory && regulation.updateHistory.length > 0) &&
                <Badge className="bg-yellow-500 hover:bg-yellow-600">Updated</Badge>}
              {regulation.updateDetails && !regulation.updateHistory &&
                <Badge className="bg-yellow-500 hover:bg-yellow-600">Updated</Badge>}
              {regulation.featured && <Badge className="bg-blue-500 hover:bg-blue-600">Featured</Badge>}
            </div>
          </div>
        </CardTitle>
        <CardDescription className="ml-9 card-content-spacing">
          <p className="mb-3">{regulation.description}</p>
          <div className="text-xs text-muted-foreground font-medium">
            {regulation.country} ({regulation.region})
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2 mb-4 ml-9">
          {regulation.categories && regulation.categories.map((cat: string, index: number) => (
            <Badge
              key={index}
              variant={cat === highlightCategory ? "default" : "secondary"}
              className={`category-badge ${cat === highlightCategory ? 'bg-primary/20 text-primary font-medium' : ''}`}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Show update history if available */}
        {regulation.updateHistory && regulation.updateHistory.length > 0 && (
          <div className="info-box bg-muted">
            <div className="flex items-center text-sm font-medium mb-2">
              <AlertCircle className="h-4 w-4 mr-2 text-yellow-500 flex-shrink-0" />
              <span>Updated on {new Date(regulation.updateHistory[regulation.updateHistory.length - 1].date).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 ml-6 card-content-spacing">
              {regulation.updateHistory[regulation.updateHistory.length - 1].description}
            </p>
          </div>
        )}

        {/* Fallback for legacy data */}
        {regulation.updateDetails && !regulation.updateHistory && (
          <div className="info-box bg-muted">
            <div className="flex items-center text-sm font-medium mb-2">
              <AlertCircle className="h-4 w-4 mr-2 text-yellow-500 flex-shrink-0" />
              <span>Updated on {new Date(regulation.lastUpdated).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 ml-6 card-content-spacing">
              {regulation.updateDetails}
            </p>
          </div>
        )}

        {regulation.fileName && (
          <div className="info-box bg-muted">
            <div className="flex items-center text-sm font-medium">
              <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>Attached file: {regulation.fileName}</span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4 pb-4 border-t border-border/30">
        <div>
          {regulation.lastUpdated && !regulation.updateDetails && (
            <span className="text-xs text-muted-foreground font-medium">
              Last updated: {new Date(regulation.lastUpdated).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline" className="px-5 h-9 font-medium">
            <Link href={`/regulations/details?id=${regulation._id}`}>View Details</Link>
          </Button>
          {regulation.link && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-primary/10 transition-colors"
              asChild
            >
              <a
                href={regulation.link}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${regulation.name} external link`}
                aria-label={`Open ${regulation.name} external link`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )

  return (
    <div className="container py-12">
      <div className="flex flex-col items-center space-y-4 text-center mb-8">
        <h1 className="text-3xl font-bold">Compliance Library</h1>
        <p className="text-muted-foreground max-w-[700px]">
          Search and explore all chemical compliance regulations in one place
        </p>
        <div className="text-sm">
          <Link href="/admin" className="text-blue-500 hover:underline">
            Go to Admin Panel to manage regulations
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 mb-10 items-center">
        <div className="flex items-center space-x-3 flex-1">
          <div className="relative max-w-sm w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search regulations..."
              className="pl-10 h-11 border-primary/20 focus:border-primary"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setTimeout(handleSearch, 300); // Live search
              }}
            />
          </div>
          <Button type="submit" onClick={handleSearch} className="h-11 px-5 font-medium">
            Search
          </Button>
        </div>

        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-11 px-4 border-primary/20">
                <Filter className="h-4 w-4" />
                Categories {selectedCategories.length > 0 && (
                  <span className="ml-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                    {selectedCategories.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-1">
              <DropdownMenuLabel className="px-3 py-2 text-sm font-medium">Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              {regulationCategories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={(checked) => {
                    // If checked is true, add the category; if false, remove it
                    if (checked) {
                      setSelectedCategories(prev => [...prev, category]);
                    } else {
                      setSelectedCategories(prev => prev.filter(c => c !== category));
                    }
                  }}
                  className="py-1.5 px-3 cursor-pointer"
                >
                  <div className="pl-6">{category}</div>
                </DropdownMenuCheckboxItem>
              ))}
              {selectedCategories.length > 0 && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <div className="p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-9 text-xs font-medium"
                      onClick={() => {
                        setSelectedCategories([]);
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={showUpdatesOnly ? "default" : "outline"}
            className="gap-2 h-11 px-4 border-primary/20"
            onClick={() => {
              setShowUpdatesOnly(!showUpdatesOnly);
            }}
          >
            <Clock className="h-4 w-4" />
            Recent Updates
          </Button>

          <Button
            variant="outline"
            className="gap-2 h-11 px-4 border-primary/20"
            onClick={() => {
              setViewMode(viewMode === "region" ? "category" : "region");
            }}
          >
            <Filter className="h-4 w-4" />
            View by {viewMode === "region" ? "Category" : "Region"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading regulations...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-xl font-semibold mb-2">Error Loading Regulations</p>
          <p className="text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      ) : viewMode === "region" ? (
        <Tabs
          defaultValue="All"
          className="space-y-8"
          onValueChange={(value) => {
            setSelectedRegion(value);
          }}
        >
          <div className="overflow-x-auto pb-2 flex justify-center">
            <TabsList className="inline-flex h-auto flex-nowrap gap-2 p-1 bg-background border border-border/30 rounded-lg min-w-max">
              <TabsTrigger value="All" className="h-10 px-5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md whitespace-nowrap">All Regions</TabsTrigger>
              <TabsTrigger value="Europe" className="h-10 px-5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md whitespace-nowrap">Europe</TabsTrigger>
              <TabsTrigger value="North America" className="h-10 px-5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md whitespace-nowrap">North America</TabsTrigger>
              <TabsTrigger value="Asia" className="h-10 px-5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md whitespace-nowrap">Asia</TabsTrigger>
              <TabsTrigger value="Global" className="h-10 px-5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md whitespace-nowrap">Global</TabsTrigger>
              <TabsTrigger value="South America" className="h-10 px-5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md whitespace-nowrap">South America</TabsTrigger>
              <TabsTrigger value="Africa" className="h-10 px-5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md whitespace-nowrap">Africa</TabsTrigger>
              <TabsTrigger value="Oceania" className="h-10 px-5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md whitespace-nowrap">Oceania</TabsTrigger>
            </TabsList>
          </div>

          {/* All regions tab content */}
          <TabsContent key="All" value="All" className="space-y-6 pt-2">
            {filterRegulationsBySearchAndCategory(allRegulations).length > 0 ? (
              filterRegulationsBySearchAndCategory(allRegulations).map((regulation) => renderRegulationCard(regulation))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No regulations found matching your criteria
              </div>
            )}
          </TabsContent>

          {Object.entries(filteredRegulations).map(([region, regulations]) => (
            <TabsContent key={region} value={region} className="space-y-6 pt-2">
              {regulations.length > 0 ? (
                regulations.map((regulation) => renderRegulationCard(regulation))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No regulations found in {region} matching your criteria
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Tabs
          defaultValue="All"
          className="space-y-8"
          onValueChange={(value) => {
            // When a category tab is selected, update the selected categories
            if (value === "All") {
              setSelectedCategories([]);
            } else {
              setSelectedCategories([value]);
            }
            // Apply the filter
            setTimeout(handleSearch, 0);
          }}
        >
          <div className="overflow-x-auto pb-2 flex justify-center">
            <TabsList className="inline-flex h-auto flex-nowrap gap-1 p-1 bg-background border border-border/30 rounded-lg min-w-max">
              <TabsTrigger
                key="All"
                value="All"
                className="h-10 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md whitespace-nowrap"
              >
                All Categories
              </TabsTrigger>
              {regulationCategories.map(category => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="h-10 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md whitespace-nowrap"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* All categories tab content */}
          <TabsContent key="All" value="All" className="space-y-6 pt-2">
            {filterRegulationsBySearchAndCategory(allRegulations).length > 0 ? (
              filterRegulationsBySearchAndCategory(allRegulations).map((regulation) => renderRegulationCard(regulation))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No regulations found matching your criteria
              </div>
            )}
          </TabsContent>

          {/* Category view tabs content */}
          {regulationCategories.map(category => (
            <TabsContent key={category} value={category} className="space-y-6 pt-2">
              {/* Combine all regulations from all regions that match this category */}
              {(() => {
                // Get all regulations that match this category
                const matchingRegulations = allRegulations.filter(
                  reg => reg.categories && reg.categories.includes(category)
                );

                return matchingRegulations.length > 0 ? (
                  matchingRegulations.map((regulation) => renderRegulationCard(regulation, category))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No regulations found in this category
                  </div>
                );
              })()}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}

