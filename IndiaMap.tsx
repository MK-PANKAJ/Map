'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface IndiaMapProps {
    className?: string;
}

export default function IndiaMap({ className }: IndiaMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const animationFrameRef = useRef<number>();
    const activeServicesRef = useRef<any[]>([]);

    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        // --- 1. Map Initialization ---
        const map = L.map(mapContainerRef.current, {
            center: [22.5, 82.0],
            zoom: 5,
            minZoom: 4,
            attributionControl: false,
            zoomControl: false, // User requested no zoom buttons
            scrollWheelZoom: true,
            background: 'transparent', // User requested transparency
        });

        mapInstanceRef.current = map;

        // --- 2. Styles Injection (for custom markers) ---
        // Injecting styles dynamically since we don't have a global CSS file here
        const styleId = 'india-map-styles';
        if (!document.getElementById(styleId)) {
            const styleSheet = document.createElement('style');
            styleSheet.id = styleId;
            styleSheet.innerText = `
        .leaflet-container { background: transparent !important; }
        .leaflet-marker-icon.custom-video-icon { background: transparent; border: none; }
        .video-flag-wrapper { overflow: hidden; display: inline-block; }
        .state-label { background: transparent; border: none; box-shadow: none; font-weight: bold; color: #333; }
      `;
            document.head.appendChild(styleSheet);
        }

        // --- 3. Rendering Configuration (Hybrid) ---
        // Create a custom pane for states to ensure they render ON TOP of the SVG base layer
        map.createPane('statesPane');
        map.getPane('statesPane')!.style.zIndex = '450';

        const svgRenderer = L.svg({ padding: 0.5 });
        const canvasRenderer = L.canvas({ padding: 0.5, pane: 'statesPane' });

        // --- 4. Layers ---

        // Define the SVG Gradient for the Flag
        const svgGradient = `
      <svg style="height: 0; width: 0; position: absolute;" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="india-flag" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#FF671F;stop-opacity:1" />
            <stop offset="33%" style="stop-color:#FF671F;stop-opacity:1" />
            <stop offset="33%" style="stop-color:#FFFFFF;stop-opacity:1" />
            <stop offset="66%" style="stop-color:#FFFFFF;stop-opacity:1" />
            <stop offset="66%" style="stop-color:#046A38;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#046A38;stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>
    `;
        // Append SVG defs to the container
        const defsContainer = document.createElement('div');
        defsContainer.innerHTML = svgGradient;
        mapContainerRef.current.appendChild(defsContainer);

        // Fetch Base Layer (India)
        fetch('https://raw.githubusercontent.com/datameet/maps/master/Country/india-soi.geojson')
            .then(res => res.json())
            .then(data => {
                let multiPolygonCoordinates: any[] = [];
                data.features.forEach((feature: any) => {
                    if (feature.geometry.type === 'Polygon') {
                        multiPolygonCoordinates.push(feature.geometry.coordinates);
                    } else if (feature.geometry.type === 'MultiPolygon') {
                        feature.geometry.coordinates.forEach((polyCoords: any) => {
                            multiPolygonCoordinates.push(polyCoords);
                        });
                    }
                });

                const unifiedFeature = {
                    "type": "Feature", "properties": {},
                    "geometry": { "type": "MultiPolygon", "coordinates": multiPolygonCoordinates }
                };

                const indiaLayer = L.geoJSON(unifiedFeature as any, {
                    renderer: svgRenderer, // Use SVG for Gradient support
                    style: { fillColor: 'url(#india-flag)', fillOpacity: 1, color: "none", weight: 0 }
                }).addTo(map);

                const bounds = indiaLayer.getBounds();
                map.fitBounds(bounds, { padding: [50, 50] });
                map.setMaxBounds(bounds.pad(0.5));
                map.options.minZoom = map.getZoom() - 1;
            })
            .catch(e => console.error(e));

        // Fetch Overlay Layer (States)
        fetch('https://raw.githubusercontent.com/datameet/maps/master/website/docs/data/geojson/states.geojson')
            .then(res => res.json())
            .then(data => {
                L.geoJSON(data, {
                    renderer: canvasRenderer, // Use Canvas for performance
                    style: { fillColor: 'transparent', fillOpacity: 0, color: "#000000", weight: 1, opacity: 0.5 },
                    onEachFeature: (feature, layer) => {
                        if (feature.properties && feature.properties.ST_NM) {
                            layer.bindTooltip(feature.properties.ST_NM, { direction: 'center', className: 'state-label' });
                        }
                    }
                }).addTo(map);
            })
            .catch(e => console.error(e));


        // --- 5. Animation Logic ---

        class SvgSequenceRenderer {
            imgElement: HTMLImageElement;
            basePath: string = '/svg_sequence/'; // Assuming public/svg_sequence in Next.js
            totalFrames: number = 86;
            frames: string[] = [];
            currentIndex: number = -1;

            constructor(imgElement: HTMLImageElement) {
                this.imgElement = imgElement;
                this.loadFrames();
            }

            pad(num: number) {
                let s = num + "";
                while (s.length < 4) s = "0" + s;
                return s;
            }

            loadFrames() {
                for (let i = 1; i <= this.totalFrames; i++) {
                    const src = this.basePath + this.pad(i) + ".svg";
                    // Preload
                    const img = new Image();
                    img.src = src;
                    this.frames.push(src);
                }
            }

            updateAndRender(time: number) {
                if (this.frames.length < this.totalFrames) return;
                const msPerFrame = 6000 / this.totalFrames; // Slow motion 6s loop
                const frameIdx = Math.floor(time / msPerFrame) % this.totalFrames;

                if (this.currentIndex !== frameIdx) {
                    this.imgElement.src = this.frames[frameIdx];
                    this.currentIndex = frameIdx;
                }
            }
        }

        // Animation Loop
        function startAnimationLoop() {
            function loop(time: number) {
                activeServicesRef.current.forEach(s => s.updateAndRender(time));
                animationFrameRef.current = requestAnimationFrame(loop);
            }
            animationFrameRef.current = requestAnimationFrame(loop);
        }

        // --- 6. Add Flags ---

        function addRealVideoFlag(lat: number, lng: number, targetUrl: string, locationName: string) {
            const viewH = 40;
            const imgH = 55;
            const uid = 'flag-img-' + Math.random().toString(36).substr(2, 9);

            // Using /svg_sequence/... assuming public folder structure
            const htmlStr = `
          <div class="video-flag-wrapper" style="height:${viewH}px;">
               <img id="${uid}" src="/svg_sequence/0001.svg" style="height:${imgH}px; width:auto; border:none; outline:none; display:block;">
          </div>
      `;

            const icon = L.divIcon({
                className: 'custom-video-icon',
                html: htmlStr,
                iconSize: undefined, // Dynamic
                iconAnchor: [1, viewH], // Bottom-Left [1, 40]
                tooltipAnchor: [20, -viewH]
            });

            const marker = L.marker([lat, lng], { icon: icon }).addTo(map);

            // Initialize Renderer after DOM update
            setTimeout(() => {
                const imgEl = document.getElementById(uid) as HTMLImageElement;
                if (imgEl) {
                    const renderer = new SvgSequenceRenderer(imgEl);
                    activeServicesRef.current.push(renderer);
                    if (!animationFrameRef.current) startAnimationLoop();
                }
            }, 100);

            marker.on('click', () => {
                window.location.href = targetUrl;
            });
            marker.bindTooltip(locationName, { permanent: false, direction: "top" });
        }

        // Add Markers
        addRealVideoFlag(28.7041, 77.1025, 'https://delhi-site.com', 'Delhi');
        addRealVideoFlag(19.0760, 72.8777, 'https://mumbai-site.com', 'Mumbai');
        addRealVideoFlag(12.9716, 77.5946, 'https://bangalore-site.com', 'Bangalore');


        // Cleanup
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    return <div ref={mapContainerRef} className={className} />;
}
