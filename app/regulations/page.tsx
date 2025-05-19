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
      const matchesCategory =
        selectedCategories.length === 0 ||
        (reg.categories && selectedCategories.some((cat) => reg.categories.includes(cat)))

      // Filter by updates if the toggle is on
      const hasUpdateHistory = reg.updateHistory && reg.updateHistory.length > 0;
      const matchesUpdates = !showUpdatesOnly || reg.updateDetails || hasUpdateHistory;

      return matchesSearch && matchesCategory && matchesUpdates
    })
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  // Render a regulation card
  const renderRegulationCard = (regulation: Regulation, highlightCategory?: string) => (
    <Card key={regulation._id}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          {regulation.name}
          {(regulation.updateHistory && regulation.updateHistory.length > 0) &&
            <Badge className="ml-2 bg-yellow-500">Updated</Badge>}
          {regulation.updateDetails && !regulation.updateHistory &&
            <Badge className="ml-2 bg-yellow-500">Updated</Badge>}
          {regulation.featured && <Badge className="ml-2 bg-blue-500">Featured</Badge>}
        </CardTitle>
        <CardDescription>
          {regulation.description}
          <div className="text-xs mt-1 text-muted-foreground">
            {regulation.country} ({regulation.region})
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-2">
          {regulation.categories && regulation.categories.map((cat: string, index: number) => (
            <Badge key={index} variant={cat === highlightCategory ? "default" : "outline"}>
              {cat}
            </Badge>
          ))}
        </div>

        {/* Show update history if available */}
        {regulation.updateHistory && regulation.updateHistory.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <div className="flex items-center text-sm font-medium mb-1">
              <AlertCircle className="h-4 w-4 mr-1 text-yellow-500" />
              <span>Updated on {new Date(regulation.updateHistory[regulation.updateHistory.length - 1].date).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {regulation.updateHistory[regulation.updateHistory.length - 1].description}
            </p>
          </div>
        )}

        {/* Fallback for legacy data */}
        {regulation.updateDetails && !regulation.updateHistory && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <div className="flex items-center text-sm font-medium mb-1">
              <AlertCircle className="h-4 w-4 mr-1 text-yellow-500" />
              <span>Updated on {new Date(regulation.lastUpdated).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{regulation.updateDetails}</p>
          </div>
        )}

        {regulation.fileName && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <div className="flex items-center text-sm font-medium">
              <FileText className="h-4 w-4 mr-1" />
              <span>Attached file: {regulation.fileName}</span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div>
          {regulation.lastUpdated && !regulation.updateDetails && (
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date(regulation.lastUpdated).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/regulations/details?id=${regulation._id}`}>View Details</Link>
          </Button>
          {regulation.link && (
            <Button variant="ghost" size="icon" asChild>
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

      <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center">
        <div className="flex items-center space-x-2 flex-1">
          <Input
            placeholder="Search regulations..."
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setTimeout(handleSearch, 300); // Live search
            }}
          />
          <Button type="submit" onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Categories {selectedCategories.length > 0 && `(${selectedCategories.length})`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {regulationCategories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => {
                    toggleCategory(category);
                    setTimeout(handleSearch, 0);
                  }}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
              {selectedCategories.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedCategories([]);
                        setTimeout(handleSearch, 0);
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={showUpdatesOnly ? "default" : "outline"}
            className="gap-2"
            onClick={() => {
              setShowUpdatesOnly(!showUpdatesOnly);
              setTimeout(handleSearch, 0);
            }}
          >
            <Clock className="h-4 w-4" />
            Recent Updates
          </Button>

          <Button
            variant="outline"
            className="gap-2"
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
        <Tabs defaultValue="Europe" className="space-y-4">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="Europe">Europe</TabsTrigger>
            <TabsTrigger value="North America">North America</TabsTrigger>
            <TabsTrigger value="Asia">Asia</TabsTrigger>
            <TabsTrigger value="Global">Global</TabsTrigger>
            <TabsTrigger value="South America">South America</TabsTrigger>
            <TabsTrigger value="Africa">Africa</TabsTrigger>
            <TabsTrigger value="Oceania">Oceania</TabsTrigger>
          </TabsList>

          {Object.entries(filteredRegulations).map(([region, regulations]) => (
            <TabsContent key={region} value={region} className="space-y-4">
              {regulations.length > 0 ? (
                regulations.map((regulation) => renderRegulationCard(regulation))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No regulations found in {region} matching your criteria
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Tabs defaultValue={regulationCategories[0]} className="space-y-4">
          <TabsList className="flex flex-wrap gap-2">
            {regulationCategories.map(category => (
              <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
            ))}
          </TabsList>

          {/* Category view tabs content */}
          {regulationCategories.map(category => (
            <TabsContent key={category} value={category} className="space-y-4">
              {/* Combine all regulations from all regions that match this category */}
              {(() => {
                // Get all regulations that match this category
                const matchingRegulations = allRegulations.filter(
                  reg => reg.categories && reg.categories.includes(category)
                );

                return matchingRegulations.length > 0 ? (
                  matchingRegulations.map((regulation) => renderRegulationCard(regulation, category))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
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

