"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {APIProvider, Pin, AdvancedMarker} from '@vis.gl/react-google-maps'; // later add Map if necessary
import {MarkerClusterer} from '@googlemaps/markerclusterer';
import type {Marker} from '@googlemaps/markerclusterer';
import {Circle} from './circle';
import { Loader } from '@googlemaps/js-api-loader';

type Poi ={ key: string, location: google.maps.LatLngLiteral }

export function Map (props: {pois: Poi[]})  {
    const [markers, setMarkers] = useState<{[key: string]: Marker}>({}); // Creating a list of markers to store in a state
    const clusterer = useRef<MarkerClusterer | null>(null); // Store the clusterer as a reference
    const [circleCenter, setCircleCenter] = useState<google.maps.LatLngLiteral | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const mapRef = useRef<HTMLDivElement>(null); // The <HTMLDivElement> is casting the mapRef which can be null to type HTMLDivElement
    const activeMarker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

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
            console.log("Map initialized");
        }
        initMap();
    }, []);

    // Center the map on the user's location once the map is initialized
    useEffect(() => {
        if (!map) return; 
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position: GeolocationPosition) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    map.setCenter(pos);
                }
            );
        }
    }, [map]);

    // Initialize MarkerClusterer once the markers have changed
    // which only occurs after the map has changed
    useEffect(() => {
        if (!map) return;
        if (!markers) return;
        if (!clusterer.current) {
            clusterer.current = new MarkerClusterer({map});
            console.log('clusterer created');
            clusterer.current?.clearMarkers();
            clusterer.current?.addMarkers(Object.values(markers));
        }
    }, [markers]);

    const setMarkerRef = (marker: Marker | null, key: string) => {
        if (marker && markers[key]) {
            console.log("Marker already exists for key:", key);
            return;
        }
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

    
    /**
     * Change the markers array, if the pois array has changed
     * 
     * Having map in the AdvancedMarkerElementOptions adds the markers to the map.
     * However, adding marker customizations in the return statement doesn't apply them unless
     * the customizations are referenced in some way. We resolve this by initializing the markers
     * with the customizations and adding the marker to the map.
     * We could add the listeners to the markers as follows:
     * 
     * marker.addListener('click', (ev) => handleClick(ev, map));
     * 
     * However, the listeners being attached to the markers means the handleClick() method has no
     * access to the mapRef, which is kind of necessary to display the Circles later on in the Map
     * return statement. So, we just make a listener for the map which checks if the click event is on a marker.
    */
    useEffect(() => {
        if (!map) return;
        props.pois.map( async (poi: Poi) => {
            const { AdvancedMarkerElement, AdvancedMarkerClickEvent, PinElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
            const pin = new PinElement({
                background: '#FBBC04',
                glyphColor: '#000',
                borderColor: '#000',
            });
            const marker = new AdvancedMarkerElement({
                map: map,
                position: poi.location,
                title: poi.key,
                content: pin.element,
                gmpClickable: true,
            });
            marker.addListener('click', (ev: google.maps.MapMouseEvent) => { // 'gmp-click' with AdvancedMarkerClickEvent
                handleClick(ev, marker);
            });
            setMarkerRef(marker, poi.key);
        })
        console.log("Advanced Markers have been initialized");
    // Do NOT add map to the dependencies array, or else there will be duplicate Advanced markers.
    // The Advanced markers will be added once when props.pois is initialized, and then again when map is initialized.
    // Marker clustering will continue to work, but it will be ineffective.
    }, [map]);

    
    
    // A click handler to pan the map to where the marker is and change the circleCenter
    const handleClick = (ev: google.maps.MapMouseEvent, clickedMarker: google.maps.marker.AdvancedMarkerElement) => { // ev: google.maps.marker.AdvancedMarkerClickEvent
        if (!map) return;
        const pos: google.maps.LatLngLiteral = {lat: ev.latLng.lat(), lng: ev.latLng.lng()};
        map.panTo(pos);
        if (!activeMarker.current || clickedMarker.title !== activeMarker.current.title) { // Add circle around clickedMarker.
            activeMarker.current = clickedMarker;
            setCircleCenter(pos);
            return;
        } else { // The clicked marker is now inactive. Remove the Circle
            activeMarker.current = null;
            setCircleCenter(null);
            return;
        }
    };

    /**
     * Since the Map object is modified in this component with a lot of properties, we want to
     * make sure to pass on the mapRef we have created.
     * Meanwhile, the Circle object is not instantiated here, bor are there important methods
     * for it here. Therefore, we don't need a circleRef 
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
            map={map}
        />
        <div ref={mapRef} style={{ height: "100vh", width: "100%" }}>
        </div>
      </>
    );
  };