"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, AlertTriangle, CheckCircle, Filter, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { searchChemicals } from "@/lib/api"
import { debounce } from "lodash"

// Define types for our data
type ChemicalRegulation = {
  id: string;
  name: string;
  shortName?: string;
  country: string;
  region: string;
  categories: string[];
  smlValue?: string;
  smlUnit?: string;
  notes?: string;
  restrictions?: string;
  additionalInfo?: Record<string, any>;
  relationId?: string;
};

type Chemical = {
  id: string;
  name: string;
  casNumber: string;
  status: string;
  riskLevel: string;
  riskDescription?: string;
  regulations: ChemicalRegulation[];
};

// Regulation categories for filtering
const regulationTags = ["Food Contact", "Electronic Equipment", "Drinking Water", "Medical Devices", "Cosmetics", "General"]

// Regions for filtering
const regions = ["Europe", "North America", "South America", "Asia", "Africa", "Oceania", "Global"]

export default function SearchPage() {
  // Initialize with empty string to avoid hydration mismatch
  const [searchTerm, setSearchTerm] = useState("")

  // Use useEffect to load from sessionStorage after hydration
  useEffect(() => {
    const savedTerm = sessionStorage.getItem("lastSearchTerm") || ""
    if (savedTerm) {
      setSearchTerm(savedTerm)
    }
  }, [])
  const [searchResults, setSearchResults] = useState<Chemical[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  // Function to perform the search
  const performSearch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Save search term to sessionStorage if it's not empty
      if (searchTerm.trim()) {
        sessionStorage.setItem("lastSearchTerm", searchTerm);
      } else {
        // Clear the saved search term if the current search is empty
        sessionStorage.removeItem("lastSearchTerm");
      }

      console.log('Search page: Performing search with parameters:', {
        searchTerm: searchTerm || '(empty)',
        selectedRegion,
        selectedTags: selectedTags.length > 0 ? selectedTags : undefined
      });

      // Call the API to search for chemicals
      // Always pass the searchTerm even if it's empty - this will return all chemicals when empty
      const result = await searchChemicals(
        searchTerm,
        selectedRegion || undefined,
        selectedTags.length > 0 ? selectedTags : undefined
      );

      // Check if the search was successful
      if (!result.success) {
        console.error('Search page: Search failed with error:', result.error);
        setError(result.error || 'Failed to search chemicals. Please try again.');
        setSearchResults([]);
        return;
      }

      // Log the search results for debugging
      console.log('Search page: Search results:', result.data.length, 'items found');

      // Check if we got any results
      if (result.data.length === 0) {
        console.log('Search page: No results found for the search criteria');
        setSearchResults([]);

        // If this was a search with criteria and we found no results,
        // we still want to mark initialDataLoaded as true to prevent infinite loading
        if (searchTerm || selectedRegion || selectedTags.length > 0) {
          setInitialDataLoaded(true);
        }

        return;
      }

      // Process each chemical to ensure regulations are properly formatted
      const processedResults = result.data.map((chemical: Chemical) => {
        // Ensure regulations is always an array, even if it's undefined or null
        const regulations = Array.isArray(chemical.regulations)
          ? chemical.regulations.filter((reg: ChemicalRegulation | null | undefined) =>
              reg !== null && reg !== undefined)
          : [];

        // Return the chemical with properly formatted regulations
        return {
          ...chemical,
          regulations: regulations
        };
      });

      // Update the search results
      setSearchResults(processedResults);
    } catch (err) {
      console.error('Search page: Error searching chemicals:', err);
      setError('An unexpected error occurred. Please try again.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedRegion, selectedTags, setInitialDataLoaded]);

  // Create a debounced version of the search function
  // This will wait 300ms after the user stops typing before performing the search
  const debouncedSearch = useCallback(
    debounce(() => {
      performSearch();
    }, 300),
    [performSearch]
  );

  // Function to load initial data when the component first mounts
  const loadInitialData = useCallback(async () => {
    try {
      // If we've already loaded initial data, don't try again
      if (initialDataLoaded) {
        console.log('Search page: Initial data already loaded, skipping');
        return;
      }

      console.log('Search page: Loading initial data');
      setIsLoading(true);

      // Call the API to get all chemicals (empty search returns all)
      const result = await searchChemicals('', undefined, undefined);

      // Mark that we've attempted to load initial data, even if it failed or returned no results
      setInitialDataLoaded(true);

      if (!result.success) {
        console.error('Search page: Failed to load initial data:', result.error);
        return;
      }

      // Get all chemicals but limit display to 20 for better performance
      const initialData = result.data.slice(0, 20);
      console.log('Search page: Loaded initial data:', initialData.length, 'items');

      // If no chemicals were found, just set empty results and don't try again
      if (initialData.length === 0) {
        console.log('Search page: No chemicals found in database');
        setSearchResults([]);
        return;
      }

      // Process the data
      const processedResults = initialData.map((chemical: Chemical) => {
        const regulations = Array.isArray(chemical.regulations)
          ? chemical.regulations.filter((reg: ChemicalRegulation | null | undefined) =>
              reg !== null && reg !== undefined)
          : [];

        return {
          ...chemical,
          regulations: regulations
        };
      });

      // Update the search results
      setSearchResults(processedResults);
    } catch (err) {
      console.error('Search page: Error loading initial data:', err);
      // Mark as loaded even if there was an error to prevent infinite retries
      setInitialDataLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [initialDataLoaded]);

  // Effect to trigger search when search term, region, or tags change
  useEffect(() => {
    // Only trigger search if user has entered search criteria
    // or if we've already loaded initial data (to prevent unnecessary searches)
    if (searchTerm || selectedRegion || selectedTags.length > 0 || initialDataLoaded) {
      debouncedSearch();
    }

    // Cleanup function to cancel any pending debounced searches
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, selectedRegion, selectedTags, debouncedSearch, initialDataLoaded]);

  // Effect to load initial data when the component first mounts
  useEffect(() => {
    // Only attempt to load initial data once when the component mounts
    // and only if we haven't already loaded data
    if (!initialDataLoaded && !isLoading) {
      loadInitialData();
    }
  }, [loadInitialData, initialDataLoaded, isLoading]);

  // This function is now handled directly in the checkbox onChange handler

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
      <div className="flex flex-col items-center space-y-4 text-center mb-8">
        <h1 className="text-3xl font-bold">Search & Match Chemicals</h1>
        <p className="text-muted-foreground max-w-[700px]">
          Search for chemicals by name or CAS number to check their status and relevant regulations
        </p>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by chemical name or CAS number"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 pr-10"
                />
                {isLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                title={filtersExpanded ? "Hide Filters" : "Show Filters"}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {filtersExpanded && (
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  Region
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedRegion || ""}
                  onValueChange={(value) => setSelectedRegion(value === "all" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedTags.length > 0 ? `${selectedTags.length} selected` : "Select categories"}
                      <Filter className="h-4 w-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px]" align="start">
                    <div className="p-4 space-y-3">
                      {regulationTags.map((tag) => (
                        <div key={tag} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag}`}
                            checked={selectedTags.includes(tag)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTags([...selectedTags, tag])
                              } else {
                                setSelectedTags(selectedTags.filter((t) => t !== tag))
                              }
                            }}
                          />
                          <Label htmlFor={`tag-${tag}`} className="cursor-pointer">
                            {tag}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {selectedRegion && `Region: ${selectedRegion}`}
              {selectedRegion && selectedTags.length > 0 && " | "}
              {selectedTags.length > 0 && `Categories: ${selectedTags.length} selected`}
            </div>
            <Button variant="outline" size="sm" onClick={() => setFiltersExpanded(false)}>
              Hide Filters
            </Button>
          </div>
        </div>
      )}

      {/* Admin button removed as requested */}

      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </div>
            ) : (
              <div>
                {`Found ${searchResults.length} items`}
                {searchTerm ? ` for "${searchTerm}"` : ''}
                {selectedRegion ? ` in ${selectedRegion}` : ''}
                {selectedTags.length > 0 ? ` with categories: ${selectedTags.join(", ")}` : ''}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && searchResults.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Searching for chemicals...</span>
            </div>
          ) : searchResults.length > 0 ? (
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
                {searchResults.map((chemical) => (
                  <TableRow key={chemical.id}>
                    <TableCell className="font-medium">
                      <Link href={`/search/details?id=${chemical.id}`} className="hover:underline hover:text-primary">
                        {chemical.name}
                      </Link>
                    </TableCell>
                    <TableCell>{chemical.casNumber}</TableCell>
                    <TableCell>{getStatusBadge(chemical.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {chemical.regulations && Array.isArray(chemical.regulations) && chemical.regulations.length > 0 ? (
                          chemical.regulations.map((reg, index) => {
                            // Skip null or undefined regulations
                            if (!reg) return null;

                            console.log(`Rendering regulation ${index}:`, reg, 'shortName:', reg?.shortName);
                            return (
                              <Link
                                key={index}
                                href={`/regulations/details?id=${reg.id}`}
                                className="no-underline"
                              >
                                <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                                  {reg.shortName || reg.name}
                                </Badge>
                              </Link>
                            );
                          })
                        ) : (
                          <span className="text-xs text-muted-foreground">No regulations</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Button asChild variant="link" size="sm">
                        <Link href={`/search/details?id=${chemical.id}`}>View Details</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || selectedRegion || selectedTags.length > 0
                  ? "No chemicals found matching your search criteria"
                  : "Enter a search term to find chemicals"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

