/**
 * Intelligently parses Google Maps URL / Share URL / iframe embed code 
 * and returns a robust URL suitable for standard iframe embedding.
 * 
 * It supports:
 * 1. Complete iframe HTML markup (e.g., copied from Google Maps Embed Share tab).
 * 2. Explicit maps embed URL containing '/maps/embed'.
 * 3. Standard coordinates query URL.
 * 4. Places search URL (extracts place name and formats as safe query).
 * 5. Latitude and Longitude values directly from contactSettings.
 * 6. Use the configured physical address.
 */
export function getGoogleMapsEmbedUrl(contactSettings) {
  if (!contactSettings) {
    return "";
  }

  const { googleMaps, address, latitude, longitude } = contactSettings;

  // 1. If googleMaps is an HTML iframe tag (pasted embed code)
  if (googleMaps && typeof googleMaps === 'string') {
    const trimmed = googleMaps.trim();
    if (trimmed.startsWith("<iframe")) {
      const srcMatch = trimmed.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        return srcMatch[1];
      }
    }

    // 2. Already an embed URL
    if (trimmed.includes("/maps/embed") || trimmed.includes("output=embed")) {
      return trimmed;
    }

    // 3. If it's a full Google Maps place/search/coords URL
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      // Check for coordinates in URL like @28.5708,77.3259
      const coordMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&z=15&output=embed`;
      }

      // Check for query parameters with coordinates: q=28.5708,77.3259 or ll=28.5708,77.3259
      const qCoordMatch = trimmed.match(/[?&](q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qCoordMatch) {
        return `https://maps.google.com/maps?q=${qCoordMatch[2]},${qCoordMatch[3]}&z=15&output=embed`;
      }

      // Extract place name (e.g. /place/Sector+18,+Noida/)
      const placeMatch = trimmed.match(/\/place\/([^\/]+)/);
      if (placeMatch && placeMatch[1]) {
        try {
          const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
          return `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&z=15&output=embed`;
        } catch (e) {
          // Fallback to raw place substring
          return `https://maps.google.com/maps?q=${encodeURIComponent(placeMatch[1])}&z=15&output=embed`;
        }
      }
    }
  }

  // 4. Use precise latitude and longitude if they are validly defined
  if (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) {
    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    if (!isNaN(latNum) && !isNaN(lngNum) && latNum !== 0 && lngNum !== 0) {
      return `https://maps.google.com/maps?q=${latNum},${lngNum}&z=15&output=embed`;
    }
  }

  // 5. If googleMaps has an input query that is not a URL (e.g. text address / name)
  if (googleMaps && typeof googleMaps === 'string' && googleMaps.trim().length > 0) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(googleMaps.trim())}&z=15&output=embed`;
  }

  // 6. Use the database-configured physical address only.
  return address ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed` : "";
}
