"use client"

import React, { useState, useRef, useEffect } from 'react';
import {MarkerClusterer} from '@googlemaps/markerclusterer';
import type {Marker} from '@googlemaps/markerclusterer';
import Circle from './circle';
import { Loader } from '@googlemaps/js-api-loader';

type Poi ={ key: string, location: google.maps.LatLngLiteral }

export function Map (props: {pois: Poi[]})  {
    const [markers, setMarkers] = useState<{[key: string]: Marker}>({}); // Creating a list of markers to store in a state
    const clusterer = useRef<MarkerClusterer | null>(null); // Store the clusterer as a reference
    const [circleCenter, setCircleCenter] = useState<google.maps.LatLngLiteral | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const mapRef = useRef<HTMLDivElement>(null); // The <HTMLDivElement> is casting the mapRef which can be null to type HTMLDivElement
    const activeMarker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const watchId = useRef<number | null>(null);
    const MAX_TIMEOUT = 10000; // Upper limit on how often position gets updated in milliseconds
    const targetAcquired = useRef<boolean>(false); // A boolean revealing whether a marker has been designated for notification
    const DEFAULT_RADIUS = 800; // The radius of the circle around the designated marker
    const circleRef = useRef<google.maps.Circle | null>(null); // The circle around the designated marker
    const RIGHT_CLICK = 2; // The right click button on the mouse

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
    }, [loader]);

    // Center the map on the user's location once the map is initialized
    // Also, add a button to designate a marker for notification
    // Monitor the user's location in the button's event listener
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
            const targetAcquiredBtn = document.createElement("button");
            targetAcquiredBtn.textContent = "Notify Me Upon Arrival";
            targetAcquiredBtn.classList.add("custom-map-control-button");
            map.controls[google.maps.ControlPosition.TOP_CENTER].push(targetAcquiredBtn);

            // State variables don't update inside of event listeners, so we make targetAcquired a ref
            // As a ref, we can't make a useEffect() dependent on targetAcquired, so we shift all logic
            // associated with it (like monitoring the user's location) to the event listener.
            targetAcquiredBtn.addEventListener("click", () => handleTargetAcquired(targetAcquiredBtn));
        }
    }, [map]);

    // Event handler for the targetAcquiredBtn
    const handleTargetAcquired = (targetAcquiredBtn: HTMLButtonElement) => {
        if (!activeMarker.current) {
            alert("Please click on a marker to designate it.");
        } else if (!targetAcquired.current) {
            targetAcquiredBtn.textContent = "Cancel Notification/ Designate a Different Marker";
            targetAcquired.current = true;
            if (navigator.geolocation) {
                watchId.current = navigator.geolocation.watchPosition(
                    (position: GeolocationPosition) => {
                        const pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        console.log("User's location has been updated to: ", pos.lat, pos.lng);
                        // If the user has entered the circle, alert the user and reset the button
                        if (google.maps.geometry.spherical.computeDistanceBetween(activeMarker.current?.position, pos) < circleRef.current?.getRadius()) {
                            alert("You have arrived at your destination!");
                            targetAcquiredBtn.textContent = "Notify Me Upon Arrival";
                            targetAcquired.current = false;
                            if (watchId.current) {
                                navigator.geolocation.clearWatch(watchId.current);
                                watchId.current = null;
                                console.log("User's location is no longer being watched");
                            }
                            return;
                        }
                    }
                , () => console.error("Error in watching user's location"),
                {timeout: MAX_TIMEOUT});
            }
            return;
        } else if (targetAcquired.current) {
            targetAcquiredBtn.textContent = "Notify Me Upon Arrival";
            targetAcquired.current = false;
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
                console.log("User's location is no longer being watched");
            } 
            return;
        }
    }

    // Initialize the markers once the map is initialized
    // It is possible to wait until the props.pois is initialized,
    // but the map initialization to non-null occurs later. 
    useEffect(() => {
        if (!map) return;
        props.pois.map( async (poi: Poi) => {
            const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary; // AdvancedMarkerClickEvent
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
            marker.addListener('auxclick', (e: google.maps.MapMouseEvent) => { // Not Working
                handleAuxClick(e, marker);
            });
            // marker.addListener("mouseup", (e: MouseEvent) => {
            //     console.log("The mouseup event has occurred");
            // });
            setMarkerRef(marker, poi.key);
        })
        console.log("Advanced Markers have been initialized");
    // Do NOT add map and props.pois to the dependencies array, or else there will be duplicate Advanced markers.
    // The Advanced markers will be added once when props.pois is initialized, and then again when map is initialized.
    // Marker clustering will continue to work, but it will be ineffective.
    }, [map]);

    // A click handler to pan the map to where the marker is and change the circleCenter
    const handleClick = (ev: google.maps.MapMouseEvent, clickedMarker: google.maps.marker.AdvancedMarkerElement) => { // ev: google.maps.marker.AdvancedMarkerClickEvent
        if (!map) return;
        if (targetAcquired.current) return;
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

    // An auxclick handler to remove a marker from the map
    const handleAuxClick = (ev: google.maps.MapMouseEvent, clickedMarker: google.maps.marker.AdvancedMarkerElement) => { // ev: google.maps.marker.AdvancedMarkerClickEvent
        console.log("Inside handleAuxClick, the click number is ", (ev.domEvent as MouseEvent).button);
        if (!map) return;
        if (targetAcquired.current) return;
        if ((ev.domEvent as MouseEvent).button !== RIGHT_CLICK) {
            setMarkerRef(null, clickedMarker.title);
        }
    };

    // Add a right click handler to the map once it is initialized.
    // This allows the user to add a marker to the map
    useEffect(() => {
        if (!map) return;
        map.addListener("rightclick", async (ev: google.maps.MapMouseEvent) => {
            const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary; // AdvancedMarkerClickEvent
            const pin = new PinElement({
                background: '#FBBC04',
                glyphColor: '#000',
                borderColor: '#000',
            });
            const marker = new AdvancedMarkerElement({
                map: map,
                position: ev.latLng.toJSON(),
                title: `{${ev.latLng.lat()}, ${ev.latLng.lng()}}`,
                content: pin.element,
                gmpClickable: true,
            });
            marker.addListener('click', (e: google.maps.MapMouseEvent) => { // 'gmp-click' with AdvancedMarkerClickEvent
                handleClick(e, marker);
            });
            marker.addListener('auxclick', (rc: google.maps.MapMouseEvent) => { // Not Working
                handleAuxClick(rc, marker);
            });
            setMarkerRef(marker, marker.title);
        });
    }, [map]);

    // Initialize MarkerClusterer once the markers have changed
    // which only occurs after the map has changed
    useEffect(() => {
        if (!map) return;
        if (!markers) return;
        clusterer.current = new MarkerClusterer({map});
        console.log('clusterer created');
        clusterer.current?.clearMarkers();
        clusterer.current?.addMarkers(Object.values(markers));
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
     * Since the Map object is modified in this component with a lot of properties, we want to
     * make sure to pass on the mapRef we have created.
     * Meanwhile, the Circle object is not instantiated here, bor are there important methods
     * for it here. Therefore, we don't need a circleRef 
    */
    return (
      <>
        <Circle
            radius={DEFAULT_RADIUS}
            center={circleCenter}
            strokeColor={'#0c4cb3'}
            strokeOpacity={1}
            strokeWeight={3}
            fillColor={'#3b82f6'}
            fillOpacity={0.3}
            map={map}
            editable={true}
            draggable={false}
            ref={circleRef}
        />
        <div ref={mapRef} style={{ height: "100vh", width: "100%" }}>
        </div>
      </>
    );
  };