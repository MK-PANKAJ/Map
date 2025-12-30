var map = L.map('map', {
    center: [22.5, 82.0],
    zoom: 5,
    minZoom: 4,
    attributionControl: false,
    zoomControl: false,
    scrollWheelZoom: true,
    background: 'transparent'
});

// Define renderers
// Create a custom pane for states to ensure they render ON TOP of the SVG base layer
map.createPane('statesPane');
map.getPane('statesPane').style.zIndex = 450; // Higher than default overlayPane (400)

const svgRenderer = L.svg({ padding: 0.5 });
const canvasRenderer = L.canvas({ padding: 0.5, pane: 'statesPane' });

// 1. Base Layer
fetch('https://raw.githubusercontent.com/datameet/maps/master/Country/india-soi.geojson')
    .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
    })
    .then(data => {
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
        var unifiedFeature = {
            "type": "Feature", "properties": {},
            "geometry": { "type": "MultiPolygon", "coordinates": multiPolygonCoordinates }
        };
        var indiaLayer = L.geoJSON(unifiedFeature, {
            renderer: svgRenderer, // Use SVG to support 'url(#india-flag)' gradient
            style: { fillColor: 'url(#india-flag)', fillOpacity: 1, color: "none", weight: 0 }
        }).addTo(map);
        var bounds = indiaLayer.getBounds();
        map.fitBounds(bounds, { padding: [50, 50] }); // Increased padding to show full map with space
        map.setMaxBounds(bounds.pad(0.5)); // Relaxed bounds (50% buffer) to avoid hard cropping
        map.options.minZoom = map.getZoom() - 1; // Allow zooming out slightly more
    })
    .catch(error => console.error('Error loading India GeoJSON:', error));

// 2. Overlay Layer
fetch('https://raw.githubusercontent.com/datameet/maps/master/website/docs/data/geojson/states.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            renderer: canvasRenderer, // Use Canvas for performance on complex state borders
            style: { fillColor: 'transparent', fillOpacity: 0, color: "#000000", weight: 1, opacity: 0.5 },
            onEachFeature: function (feature, layer) {
                if (feature.properties && feature.properties.ST_NM) {
                    layer.bindTooltip(feature.properties.ST_NM, { direction: 'center', className: 'state-label' });
                }
            }
        }).addTo(map);
    })
    .catch(error => console.error('Error loading States GeoJSON:', error));


// --- GIF POINTER RENDERING ---

function addRealVideoFlag(lat, lng, targetUrl, locationName) {
    const height = 35; // Reduced height to make it smaller

    // IMG tag for Animation.gif directly, no cropping wrapper
    const htmlStr = `
        <img src="Animation.gif" style="height:${height}px; width:auto; border:none; outline:none; display:block;">
    `;

    const icon = L.divIcon({
        className: 'custom-video-icon',
        html: htmlStr,
        iconSize: null, // Let size be dynamic based on content
        iconAnchor: [2, height], // Anchor at bottom-left
        tooltipAnchor: [20, -height]
    });

    const marker = L.marker([lat, lng], { icon: icon }).addTo(map);

    marker.on('click', function () {
        window.location.href = targetUrl;
    });

    marker.bindTooltip(locationName, { permanent: false, direction: "top" });
}


// Add markers
addRealVideoFlag(28.7041, 77.1025, 'https://delhi-site.com', 'Delhi');
addRealVideoFlag(19.0760, 72.8777, 'https://mumbai-site.com', 'Mumbai');
addRealVideoFlag(12.9716, 77.5946, 'https://bangalore-site.com', 'Bangalore');

