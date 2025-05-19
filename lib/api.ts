// API functions for interacting with the backend

// Chemical API functions
export async function fetchChemicals() {
  try {
    console.log('Client: Fetching chemicals from API');
    // Use the new V2 API route that includes ChemicalRegulationV2 relationships
    const response = await fetch('/api/chemicals-v2');

    // Get the response text first to help with debugging
    const responseText = await response.text();
    console.log('Client: Raw API response:', responseText);

    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Client: Failed to parse API response as JSON:', parseError);
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}...`);
    }

    // Check if the response was successful
    if (!response.ok) {
      const errorMessage = data.error || `Server error: ${response.status}`;
      console.error('Client: API error:', errorMessage);
      throw new Error(errorMessage);
    }

    // Check if data has the expected structure
    if (data && data.success && Array.isArray(data.data)) {
      console.log('Client: Successfully fetched chemicals:', data.data.length || 0);
      return data.data;
    } else {
      console.error('Client: Unexpected API response structure:', data);
      return [];
    }
  } catch (error) {
    console.error('Client: Error fetching chemicals:', error);
    return []; // Return empty array instead of throwing to prevent cascading errors
  }
}

export async function addChemical(chemicalData: any) {
  try {
    const response = await fetch('/api/chemicals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chemicalData),
    });

    // Get the response text first to help with debugging
    const responseText = await response.text();
    let data;

    try {
      // Try to parse the response as JSON
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse API response as JSON:', parseError);
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}...`);
    }

    // If the response was not successful, throw an error with the specific message
    if (!response.ok) {
      // For 409 Conflict, provide a more specific error message
      if (response.status === 409) {
        throw new Error(`A chemical with CAS number "${chemicalData.casNumber}" already exists in the database.`);
      } else {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
    }

    return data;
  } catch (error) {
    console.error('Error adding chemical:', error);
    throw error;
  }
}

export async function updateChemical(id: string, chemicalData: any) {
  try {
    const response = await fetch(`/api/chemicals/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chemicalData),
    });

    // Get the response text first to help with debugging
    const responseText = await response.text();
    let data;

    try {
      // Try to parse the response as JSON
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse API response as JSON:', parseError);
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}...`);
    }

    // If the response was not successful, throw an error with the specific message
    if (!response.ok) {
      // For 409 Conflict, provide a more specific error message
      if (response.status === 409) {
        throw new Error(`Another chemical with CAS number "${chemicalData.casNumber}" already exists in the database.`);
      } else {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
    }

    return data;
  } catch (error) {
    console.error('Error updating chemical:', error);
    throw error;
  }
}

export async function deleteChemical(id: string) {
  try {
    const response = await fetch(`/api/chemicals/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting chemical:', error);
    throw error;
  }
}

// Regulation API functions
export async function fetchRegulations() {
  try {
    console.log('Client: Fetching regulations from API');
    const response = await fetch('/api/regulations');

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    // Get the response text first to help with debugging
    const responseText = await response.text();
    console.log('Client: Raw regulations API response:', responseText.substring(0, 200) + '...');

    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Client: Failed to parse regulations API response as JSON:', parseError);
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}...`);
    }

    // Log the first regulation to check if shortName is present
    if (data.success && data.data && data.data.length > 0) {
      console.log('Client: First regulation from API:', {
        id: data.data[0]._id,
        name: data.data[0].name,
        shortName: data.data[0].shortName,
        shortNameType: typeof data.data[0].shortName
      });

      // Log all regulations with shortName
      const regsWithShortName = data.data.filter((reg: any) => reg.shortName);
      console.log('Client: Regulations with shortName:',
        regsWithShortName.map((reg: any) => ({
          id: reg._id,
          name: reg.name,
          shortName: reg.shortName
        }))
      );
    }

    return data.success ? data.data : data;
  } catch (error) {
    console.error('Client: Error fetching regulations:', error);
    throw error;
  }
}

export async function addRegulation(regulationData: any) {
  try {
    console.log('Client: Sending regulation data to API:', regulationData);

    const response = await fetch('/api/regulations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(regulationData),
    });

    // Get the response text first to help with debugging
    const responseText = await response.text();
    console.log('Client: Raw API response:', responseText);

    let data;

    try {
      // Try to parse the response as JSON
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Client: Failed to parse API response as JSON:', parseError);
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}...`);
    }

    // If the response was not successful, throw an error with the specific message
    if (!response.ok) {
      console.error('Client: API error response:', data);
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    console.log('Client: Successfully added regulation:', data);
    return data;
  } catch (error) {
    console.error('Client: Error adding regulation:', error);
    throw error;
  }
}

export async function fetchRegulationById(id: string) {
  try {
    const response = await fetch(`/api/regulations/${id}`);

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    // Get the response text first to help with debugging
    const responseText = await response.text();
    console.log('Client: Raw regulation API response:', responseText.substring(0, 200) + '...');

    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Client: Failed to parse regulation API response as JSON:', parseError);
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}...`);
    }

    // Log the regulation data to check if updateHistory is present
    if (data.success && data.data) {
      console.log('Client: Regulation data from API:', {
        id: data.data._id,
        name: data.data.name,
        updateHistory: data.data.updateHistory,
        updateHistoryType: typeof data.data.updateHistory,
        isArray: Array.isArray(data.data.updateHistory),
        updateHistoryLength: data.data.updateHistory ? data.data.updateHistory.length : 0
      });
    }

    return data.success ? data.data : data;
  } catch (error) {
    console.error('Error fetching regulation by ID:', error);
    throw error;
  }
}

export async function deleteRegulation(id: string) {
  try {
    const response = await fetch(`/api/regulations/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting regulation:', error);
    throw error;
  }
}

/**
 * Upload a file for a regulation
 * @param file - The file to upload
 * @returns The file details
 */
export async function uploadRegulationFile(file: File) {
  try {
    // Create a FormData object
    const formData = new FormData();
    formData.append('file', file);

    // Upload the file
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    // Get the response text first to help with debugging
    const responseText = await response.text();
    let data;

    try {
      // Try to parse the response as JSON
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse API response as JSON:', parseError);
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}...`);
    }

    // If the response was not successful, throw an error with the specific message
    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Chemical-Regulation relationship API functions
export async function addChemicalRegulation(chemicalId: string, regulationId: string, smlValue?: string) {
  try {
    const response = await fetch('/api/chemical-regulations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chemicalId,
        regulationId,
        smlValue
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding chemical-regulation relationship:', error);
    throw error;
  }
}

export async function fetchChemicalRegulations(chemicalId?: string, regulationId?: string) {
  try {
    let url = '/api/chemical-regulations';
    const params = new URLSearchParams();

    if (chemicalId) {
      params.append('chemicalId', chemicalId);
    }

    if (regulationId) {
      params.append('regulationId', regulationId);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching chemical regulations:', error);
    throw error;
  }
}

/**
 * Search for chemicals by name, CAS number, region, and categories
 * @param query - Search query for name or CAS number
 * @param region - Region filter
 * @param categories - Category filters
 * @returns Search results
 */
export async function searchChemicals(query: string, region?: string, categories?: string[]) {
  try {
    console.log('Client: Starting chemical search with parameters:', { query, region, categories });

    // Build the URL with search parameters
    const params = new URLSearchParams();

    // Always include the query parameter, even if it's empty
    // This ensures consistent behavior between empty searches and searches with terms
    params.append('query', query);

    if (region && region !== 'all') {
      params.append('region', region);
    }

    if (categories && categories.length > 0) {
      categories.forEach(category => {
        params.append('category', category);
      });
    }

    // Use the new V2 API route
    const url = `/api/search-v2?${params.toString()}`;
    console.log('Client: Searching chemicals with URL:', url);

    // Make the request with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Make the request
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      // Get the response text first to help with debugging
      const responseText = await response.text();
      console.log('Client: Raw search API response:', responseText.substring(0, 200) + '...');

      let data;
      try {
        // Try to parse the response as JSON
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Client: Failed to parse search API response as JSON:', parseError);
        console.error('Client: Raw response that failed to parse:', responseText);
        return { success: false, data: [], error: 'Failed to parse server response' };
      }

      // If the response was not successful, log error and return structured error
      if (!response.ok) {
        console.error('Client: Search API error:', data.error || `Server error: ${response.status}`);
        return {
          success: false,
          data: [],
          error: data.error || `Server error: ${response.status}`
        };
      }

      // Check if data has the expected structure
      if (data && data.success && Array.isArray(data.data)) {
        console.log('Client: Successfully searched chemicals:', data.data.length || 0);
        return { success: true, data: data.data, error: null };
      } else if (Array.isArray(data)) {
        // Some endpoints might return the array directly
        console.log('Client: API returned direct array of', data.length, 'items');
        return { success: true, data: data, error: null };
      } else {
        console.error('Client: Unexpected search API response structure:', data);
        return {
          success: false,
          data: [],
          error: 'Unexpected response format from server'
        };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Client: Search request timed out after 30 seconds');
        return {
          success: false,
          data: [],
          error: 'Search request timed out. Please try again.'
        };
      }
      throw fetchError; // Re-throw to be caught by the outer try/catch
    }
  } catch (error) {
    console.error('Client: Error searching chemicals:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// Note: The importChemicals function has been moved directly into the component
// to provide better error handling and debugging
