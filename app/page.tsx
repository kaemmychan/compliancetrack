"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { AlertCircle, Calculator, Globe, Search, Loader2 } from "lucide-react"

// Define the regulation type
type Regulation = {
  _id: string;
  name: string;
  description?: string;
  country: string;
  featured: boolean;
  region: string;
  color?: string;
}

export default function Home() {
  const [featuredRegulations, setFeaturedRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Colors for different regulations
  const colors = ["yellow-500", "blue-500", "green-500", "purple-500"];

  // Fetch featured regulations from the API
  useEffect(() => {
    const fetchFeaturedRegulations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch regulations with featured=true, sorted by lastUpdated
        const response = await fetch('/api/regulations?featured=true');

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        const regulations = data.success ? data.data : data;

        // Sort regulations by lastUpdated (newest first)
        const sortedRegulations = [...regulations].sort((a, b) => {
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        });

        // Limit to the 4 most recently updated regulations
        const limitedRegulations = sortedRegulations.slice(0, 4);

        // Assign colors to each regulation for styling
        const coloredRegulations = limitedRegulations.map((reg, idx) => ({
          ...reg,
          color: colors[idx % colors.length],
        }));

        setFeaturedRegulations(coloredRegulations);
      } catch (err) {
        console.error('Error fetching featured regulations:', err);
        setError('Failed to load regulations updates');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedRegulations();

    // Set up an interval to refresh the regulations every minute
    const intervalId = setInterval(fetchFeaturedRegulations, 60000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="container px-4 py-12 md:py-24 relative">
      <section className="flex flex-col items-center text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">Compliance Track</h1>
        <p className="max-w-[700px] text-lg text-muted-foreground">
          Track and verify chemical compliance with regulations across different countries
        </p>
      </section>

      <section className="mb-12">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Regulations Updates</h2>
          <p className="text-sm text-muted-foreground">Showing the 4 most recently updated regulations</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading regulations...</span>
            </div>
          ) : error ? (
            <div className="col-span-full text-center py-8 text-red-500">{error}</div>
          ) : featuredRegulations.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">No featured regulations found</div>
          ) : (
            featuredRegulations.map((regulation) => (
              <Card
                key={regulation._id}
                className={`border-l-4 border-l-${regulation.color} flex flex-col h-full`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <AlertCircle className={`h-5 w-5 mr-2 text-${regulation.color}`} />
                    New Regulation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{regulation.description || 'No description available'}</CardDescription>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">{regulation.country}</span>
                    <Link
                      href={`/regulations/details?id=${regulation._id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View Details
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Search & Matching
            </CardTitle>
            <CardDescription>
              Search for chemicals in the database and check compliance with regulations
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild className="w-full">
              <Link href="/search">Go to Search</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Calculate Worst Case Scenario
            </CardTitle>
            <CardDescription>Calculate M value and compare with SML according to regulations</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild className="w-full">
              <Link href="/calculation">Go to Calculator</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Compliance Library
            </CardTitle>
            <CardDescription>Search and explore all chemical compliance regulations in one place</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild className="w-full">
              <Link href="/regulations">View Regulations</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

