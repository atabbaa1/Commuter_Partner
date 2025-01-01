"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {APIProvider, Pin, AdvancedMarker} from '@vis.gl/react-google-maps'; // later add Map if necessary
import {MarkerClusterer} from '@googlemaps/markerclusterer';
import type {Marker} from '@googlemaps/markerclusterer';
import {Circle} from './circle';
import { Loader } from '@googlemaps/js-api-loader';

// Adding advanced marker locations
type Poi ={ key: string, location: google.maps.LatLngLiteral }
const locations: Poi[] = [
  {key: 'operaHouse', location: { lat: -33.8567844, lng: 151.213108  }},
  {key: 'tarongaZoo', location: { lat: -33.8472767, lng: 151.2188164 }},
  {key: 'manlyBeach', location: { lat: -33.8209738, lng: 151.2563253 }},
  {key: 'hyderPark', location: { lat: -33.8690081, lng: 151.2052393 }},
  {key: 'theRocks', location: { lat: -33.8587568, lng: 151.2058246 }},
  {key: 'circularQuay', location: { lat: -33.858761, lng: 151.2055688 }},
  {key: 'harbourBridge', location: { lat: -33.852228, lng: 151.2038374 }},
  {key: 'kingsCross', location: { lat: -33.8737375, lng: 151.222569 }},
  {key: 'botanicGardens', location: { lat: -33.864167, lng: 151.216387 }},
  {key: 'museumOfSydney', location: { lat: -33.8636005, lng: 151.2092542 }},
  {key: 'maritimeMuseum', location: { lat: -33.869395, lng: 151.198648 }},
  {key: 'kingStreetWharf', location: { lat: -33.8665445, lng: 151.1989808 }},
  {key: 'aquarium', location: { lat: -33.869627, lng: 151.202146 }},
  {key: 'darlingHarbour', location: { lat: -33.87488, lng: 151.1987113 }},
  {key: 'barangaroo', location: { lat: - 33.8605523, lng: 151.1972205 }},
];

const PoiMarkers = (props: {pois: Poi[]}) => {
    const [markers, setMarkers] = useState<{[key: string]: Marker}>({}); // Creating a list of markers to store in a state
    const clusterer = useRef<MarkerClusterer | null>(null); // Store the clusterer as a reference
    const [circleCenter, setCircleCenter] = useState(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const mapRef = useRef<HTMLDivElement>(null); // The <HTMLDivElement> is casting the mapRef which can be null to type HTMLDivElement

    const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        version: "weekly",
    });

    // Initialize the map
    useEffect(() => {
        const initMap = async () => {
            const { Map } = await loader.importLibrary("maps");
            const defPos = { lat: -33.860664, lng: 151.208138 };

            // Map Options
            const mapOptions: google.maps.MapOptions = ({
                center: defPos,
                zoom: 13,
                mapId: process.env.NEXT_PUBLIC_MAP_ID,
            })
            // Setup the Map
            setMap( new Map(mapRef.current as HTMLDivElement, mapOptions));
        }
        initMap();
    }, []);
    
    // Initialize MarkerClusterer, if the map has changed
    useEffect(() => {
        if (!map) return;
        if (!clusterer.current) {
          clusterer.current = new MarkerClusterer({map});
          console.log('clusterer created');
        }
    }, [map]);

    // Update markers, if the markers array has changed
    useEffect(() => {
        clusterer.current?.clearMarkers();
        clusterer.current?.addMarkers(Object.values(markers));
    }, [markers]);

    const setMarkerRef = (marker: Marker | null, key: string) => {
        if (marker && markers[key]) return;
        if (!marker && !markers[key]) return;

        setMarkers(prev => {
            if (marker) {
                return {...prev, [key]: marker};
            } else {
                const newMarkers = {...prev};
                delete newMarkers[key];
                return newMarkers;
            }
        });
    };

    // Change the markers array, if the pois array has changed
    useEffect(() => {
        props.pois.map( async (poi: Poi) => {
            const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as typeof google.maps.marker;
            const marker = new AdvancedMarkerElement({
                map: map,
                position: poi.location,
                title: poi.key,
            });
            setMarkerRef(marker, poi.key);
        })
    }, [props.pois]);

    // A click handler to pan the map to where the marker is
    const handleClick = useCallback((ev: google.maps.MapMouseEvent) => {
        if(!map) return;
        if(!ev.latLng) return;
        console.log('marker clicked:', ev.latLng.toString());
        map.panTo(ev.latLng);
        console.log('circleCenter:', circleCenter);
        if (circleCenter?.equals(ev.latLng)) {
            setCircleCenter(null);
        } else {
            setCircleCenter(ev.latLng);
        }
    }, [map, circleCenter]);

    /**
     * Since the Map object is modified in this component with a lot of properties, we want to
     * make sure to pass on the mapRef we have created. On the other hand, we don't need to pass
     * on the circleRef. Read the comments in circle.tsx for more information.
    */

    return (
      <>
        <Circle
            radius={800}
            center={circleCenter}
            strokeColor={'#0c4cb3'}
            strokeOpacity={1}
            strokeWeight={3}
            fillColor={'#3b82f6'}
            fillOpacity={0.3}
        />
        <div ref={mapRef} style={{ height: "100vh", width: "100%" }}>
            {props.pois.map( (poi: Poi) => (
            <AdvancedMarker
                key={poi.key}
                position={poi.location}
                clickable={true}
                onClick={handleClick}>
                <Pin background={'#FBBC04'} glyphColor={'#000'} borderColor={'#000'} />
            </AdvancedMarker>
            ))}
        </div>
      </>
    );
  };

export function Map() {
    console.log("Inside Map component")
    return (
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} onLoad={() => console.log('Maps API has loaded inside map.tsx.')}>
            <PoiMarkers pois={locations} />
        </APIProvider>
    );
};