'use client'; // Required for Next.js App Router

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

// Props interface for Tailwind support
interface IndiaMapProps {
    className?: string;
}

const IndiaMap = ({ className }: IndiaMapProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null); // Weak typing for Leaflet instance to avoid unneeded dependency errors

    useEffect(() => {
        // 1. Check if map is already initialized
        if (mapInstanceRef.current || !mapContainerRef.current) return;

        // 2. Dynamic Import of Leaflet (Fixes "window is not defined" in Next.js SSR)
        import('leaflet').then((L) => {

            // 3. Initialize Map
            const map = L.map(mapContainerRef.current!, {
                zoomControl: true,       // Show +/- buttons
                scrollWheelZoom: true,   // Allow scroll zooming
                background: 'transparent', // Match site theme
                attributionControl: false // Clean look
            }).setView([23.5937, 78.9629], 5);

            mapInstanceRef.current = map;

            // 4. Load & Render Data (Survey of India Official)
            fetch('https://raw.githubusercontent.com/datameet/maps/master/Country/india-soi.geojson')
                .then(res => {
                    if (!res.ok) throw new Error("Failed to load map data");
                    return res.json();
                })
                .then(data => {
                    // Merge Logic: Combine disjoint separate states into one MultiPolygon
                    // This ensures the gradient fills the entire country continuously
                    const multiPolygonCoordinates: any[] = [];

                    data.features.forEach((feature: any) => {
                        if (feature.geometry.type === 'Polygon') {
                            multiPolygonCoordinates.push(feature.geometry.coordinates);
                        } else if (feature.geometry.type === 'MultiPolygon') {
                            feature.geometry.coordinates.forEach((coords: any) => {
                                multiPolygonCoordinates.push(coords);
                            });
                        }
                    });

                    const unifiedFeature = {
                        "type": "Feature",
                        "properties": {},
                        "geometry": {
                            "type": "MultiPolygon",
                            "coordinates": multiPolygonCoordinates
                        }
                    };

                    // Render Base Layer (Tricolor)
                    const indiaLayer = L.geoJSON(unifiedFeature as any, {
                        style: {
                            fillColor: '#FF9933', // Fallback color
                            fillOpacity: 1,
                            color: "none",
                            weight: 0
                        }
                    }).addTo(map);

                    // Apply Gradient (Leaflet internal workaround)
                    // Note: The SVG Defs must exist in the DOM (see return statement)
                    (indiaLayer as any).setStyle({ fillColor: 'url(#india-flag)' });

                    // Auto-Fit View
                    map.fitBounds(indiaLayer.getBounds(), { padding: [20, 20] });
                })
                .catch(err => console.error("Map Data Error:", err));

            // 5. Overlay Layer: State Boundaries
            fetch('https://raw.githubusercontent.com/datameet/maps/master/website/docs/data/geojson/states.geojson')
                .then(res => res.json())
                .then(data => {
                    L.geoJSON(data, {
                        style: {
                            fillColor: 'transparent',
                            color: "#000000",
                            weight: 1,
                            opacity: 0.5
                        },
                        onEachFeature: (feature, layer) => {
                            if (feature.properties && feature.properties.ST_NM) {
                                layer.bindTooltip(feature.properties.ST_NM, {
                                    direction: 'center',
                                    className: 'font-bold text-gray-800 bg-transparent shadow-none border-none' // Tailwind-ish tooltip classes
                                });
                            }
                        }
                    }).addTo(map);
                });
        });

        // Cleanup
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    return (
        <div className={`relative w-full h-full min-h-[500px] ${className}`}>
            {/* Invisible SVG Defs for the Gradient (Required for 'url(#india-flag)' to work) */}
            <svg className="absolute w-0 h-0" aria-hidden="true">
                <defs>
                    <linearGradient id="india-flag" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#FF671F', stopOpacity: 1 }} />
                        <stop offset="33%" style={{ stopColor: '#FF671F', stopOpacity: 1 }} />
                        <stop offset="33%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
                        <stop offset="66%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
                        <stop offset="66%" style={{ stopColor: '#046A38', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#046A38', stopOpacity: 1 }} />
                    </linearGradient>
                </defs>
            </svg>

            {/* Map Container */}
            <div ref={mapContainerRef} className="w-full h-full bg-transparent z-10" />
        </div>
    );
};

export default IndiaMap;
