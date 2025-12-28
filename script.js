var map = L.map('map', {
    center: [22.5, 82.0],
    zoom: 5,
    minZoom: 4,
    attributionControl: false,
    zoomControl: true, // Enable +/- zoom buttons
    scrollWheelZoom: true, // 'scrollWheelZoom: false' is crucial for embedded maps to allow page scrolling without getting stuck.
    background: 'transparent' // Allow host site background to show through
});

// REMOVED: L.tileLayer(...) - We do not want the world map background.

// 1. Base Layer: Country Outline with Tricolor Gradient Fill
// Fetching the Survey of India (SOI) Official Boundary
fetch('https://raw.githubusercontent.com/datameet/maps/master/Country/india-soi.geojson')
    .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
    })
    .then(data => {
        // MERGE LOGIC: Combine all state polygons into a single MultiPolygon
        // This ensures the gradient fills the entire country bounding box continuously.
        var multiPolygonCoordinates = [];

        data.features.forEach(feature => {
            if (feature.geometry.type === 'Polygon') {
                multiPolygonCoordinates.push(feature.geometry.coordinates);
            } else if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach(polyCoords => {
                    multiPolygonCoordinates.push(polyCoords);
                });
            }
        });

        // Create a single unified feature
        var unifiedFeature = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": multiPolygonCoordinates
            }
        };

        // Render the unified official shape
        var indiaLayer = L.geoJSON(unifiedFeature, {
            style: {
                fillColor: 'url(#india-flag)',
                fillOpacity: 1,
                color: "none",
                weight: 0
            }
        }).addTo(map);

        // AUTO-FIT: Zoom the map to perfectly fit the India boundary
        map.fitBounds(indiaLayer.getBounds(), {
            padding: [20, 20] // Add slight padding so borders aren't touching screen edges
        });
    })
    .catch(error => {
        console.error('Error loading India GeoJSON:', error);
        // Fallback if datameet fails (unlikely, but good practice)
        alert("Failed to load map data. Please check connection.");
    });

// 2. Overlay Layer: State Boundaries
fetch('https://raw.githubusercontent.com/datameet/maps/master/website/docs/data/geojson/states.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: {
                fillColor: 'transparent',
                fillOpacity: 0,
                color: "#000000", // Black state borders
                weight: 1,
                opacity: 0.5
            },
            onEachFeature: function (feature, layer) {
                // Optional: Add tooltips for state names if available
                if (feature.properties && feature.properties.ST_NM) {
                    layer.bindTooltip(feature.properties.ST_NM, { direction: 'center', className: 'state-label' });
                }
            }
        }).addTo(map);
    })
    .catch(error => console.error('Error loading States GeoJSON:', error));

// Official Color Hex Codes (kept for markers)
const COLOR_SAFFRON = '#FF671F';
const COLOR_GREEN = '#046A38';

// Custom IDN Flag Icon definition
var flagIcon = L.divIcon({
    className: 'custom-flag-icon',
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30">
             <!-- Pole -->
             <line x1="2" y1="2" x2="2" y2="22" stroke="black" stroke-width="2" />
             <!-- Flag -->
             <rect x="2" y="2" width="16" height="4" fill="#FF671F" />
             <rect x="2" y="6" width="16" height="4" fill="#FFFFFF" />
             <rect x="2" y="10" width="16" height="4" fill="#046A38" />
             <!-- Chakra (Symbolic) -->
             <circle cx="10" cy="8" r="1.5" fill="navy" />
           </svg>`,
    iconSize: [30, 30],
    iconAnchor: [2, 22], // Anchor at the bottom of the pole
    tooltipAnchor: [10, -15]
});

// Function to add a marker with a custom flag icon and redirect URL
function addRedirectMarker(lat, lng, targetUrl, locationName) {
    // Use the custom flag icon
    var marker = L.marker([lat, lng], { icon: flagIcon }).addTo(map);

    // One-click redirect behavior
    marker.on('click', function () {
        window.location.href = targetUrl; // Redirects the current page
    });

    // Add a tooltip that appears on hover
    marker.bindTooltip(locationName, { permanent: false, direction: "top" });
}

// Markers for specific locations
addRedirectMarker(28.7041, 77.1025, 'https://delhi-site.com', 'Delhi');
addRedirectMarker(19.0760, 72.8777, 'https://mumbai-site.com', 'Mumbai');
addRedirectMarker(12.9716, 77.5946, 'https://bangalore-site.com', 'Bangalore');
