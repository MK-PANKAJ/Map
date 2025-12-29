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


// --- SVG SEQUENCE RENDERER (DOM BASED) ---

class SvgSequenceRenderer {
    constructor(imgElement) {
        this.imgElement = imgElement;

        // Path to the copied SVGs
        this.basePath = 'svg_sequence/';
        this.totalFrames = 86;
        this.frames = [];
        this.imagesLoaded = 0;

        this.loadFrames();
    }

    pad(num) {
        let s = num + "";
        while (s.length < 4) s = "0" + s;
        return s;
    }

    loadFrames() {
        console.log("Starting to load 86 SVG frames...");

        for (let i = 1; i <= this.totalFrames; i++) {
            const src = this.basePath + this.pad(i) + ".svg";
            // Preload isn't strictly necessary for local files but good practice
            const img = new Image();
            img.src = src;

            this.frames.push(src);
        }
    }

    updateAndRender(time) {
        if (this.frames.length < this.totalFrames) return;

        // Playback: 86 frames over 6 seconds
        const msPerFrame = 6000 / this.totalFrames;
        const frameIdx = Math.floor(time / msPerFrame) % this.totalFrames;

        const nextSrc = this.frames[frameIdx];

        // Update DOM only if changed
        // We use a custom attribute to track current src to avoid readingDOM if possible,
        // or just check src. 
        // Note: img.src returns full URL (file:///...), nextSrc is relative.
        // So we blindly update or store index.

        if (this.currentIndex !== frameIdx) {
            this.imgElement.src = nextSrc;
            this.currentIndex = frameIdx;
        }
    }
}

const activeServices = [];
let animationFrameId;

function startAnimationLoop() {
    if (animationFrameId) return;
    function loop(time) {
        activeServices.forEach(s => s.updateAndRender(time));
        animationFrameId = requestAnimationFrame(loop);
    }
    animationFrameId = requestAnimationFrame(loop);
}

function addRealVideoFlag(lat, lng, targetUrl, locationName) {
    const viewH = 40; // Visible height (smaller size)
    const imgH = 55;  // Actual rendered image height (larger to allow cropping)

    const uid = 'flag-img-' + Math.random().toString(36).substr(2, 9);

    // IMG tag for Animation
    // using width:auto to maintain aspect ratio
    // Wrapper uses overflow:hidden to crop the bottom of the image (pole)
    // Anchored at bottom-left [1, viewH]
    const htmlStr = `
        <div class="video-flag-wrapper" style="height:${viewH}px; overflow:hidden; display:inline-block;">
             <img id="${uid}" src="svg_sequence/0001.svg" style="height:${imgH}px; width:auto; border:none; outline:none; display:block;">
        </div>
    `;

    const icon = L.divIcon({
        className: 'custom-video-icon',
        html: htmlStr,
        iconSize: null, // Let size be dynamic based on content
        iconAnchor: [1, viewH], // Box bottom-left + 1px
        tooltipAnchor: [20, -viewH]
    });

    const marker = L.marker([lat, lng], { icon: icon }).addTo(map);

    setTimeout(() => {
        const imgEl = document.getElementById(uid);
        if (imgEl) {
            const renderer = new SvgSequenceRenderer(imgEl);
            activeServices.push(renderer);
            startAnimationLoop();
        }
    }, 100);

    marker.on('click', function () {
        window.location.href = targetUrl;
    });

    marker.bindTooltip(locationName, { permanent: false, direction: "top" });
}


// Add markers
addRealVideoFlag(28.7041, 77.1025, 'https://delhi-site.com', 'Delhi');
addRealVideoFlag(19.0760, 72.8777, 'https://mumbai-site.com', 'Mumbai');
addRealVideoFlag(12.9716, 77.5946, 'https://bangalore-site.com', 'Bangalore');
