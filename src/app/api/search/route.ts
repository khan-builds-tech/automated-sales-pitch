import { NextRequest } from "next/server";
import { Business } from "@/lib/types";

interface PlacePhoto {
  name: string;
}

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  businessStatus?: string;
  photos?: PlacePhoto[];
  currentOpeningHours?: { openNow: boolean };
  location?: { latitude: number; longitude: number };
  websiteUri?: string;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return Response.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey === "YOUR_GOOGLE_PLACES_API_KEY") {
    return Response.json({ error: "Google Places API key not configured" }, { status: 500 });
  }

  try {
    const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.businessStatus,places.photos,places.currentOpeningHours,places.location,places.websiteUri",
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 20 }),
    });

    if (!searchRes.ok) {
      const err = await searchRes.json();
      return Response.json({ error: `Google API error: ${err.error?.message || searchRes.statusText}` }, { status: 502 });
    }

    const searchData = await searchRes.json();
    const places: PlaceResult[] = searchData.places || [];

    const businesses: Business[] = places.map((place) => ({
      place_id: place.id,
      name: place.displayName?.text || "",
      address: place.formattedAddress || "",
      rating: place.rating,
      total_ratings: place.userRatingCount,
      types: place.types,
      business_status: place.businessStatus,
      photo_url: place.photos?.[0]
        ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxWidthPx=400&key=${apiKey}`
        : undefined,
      opening_hours: place.currentOpeningHours ? { open_now: place.currentOpeningHours.openNow } : undefined,
      website: place.websiteUri,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    }));

    return Response.json({ businesses, total: businesses.length });
  } catch (err) {
    console.error("Search error:", err);
    return Response.json({ error: "Failed to search businesses" }, { status: 500 });
  }
}
