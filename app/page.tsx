"use client"

import React from 'react';
import {Map} from './components/map';

// Adding advanced marker locations
type Poi ={ key: string, location: google.maps.LatLngLiteral }
const locations: Poi[] = [
  {key: 'NorthgateHighSchool', location: { lat: 33.46836, lng: -84.66599  }},
  {key: 'CanongateElementarySchool', location: { lat: 33.46517, lng: -84.64789  }},
  {key: 'SamsClub', location: { lat: 33.40024, lng: -84.62435 }},
  {key: 'NCGCinemas', location: { lat: 33.39905, lng: -84.61680 }},
  {key: 'Walmart', location: { lat: 33.40154, lng: -84.59999 }},
  {key: 'TheHomeDepot', location: { lat: 33.39938, lng: -84.59844 }}
];

const MapPage = () => {
  // In the return statement, there used to be <APIProvider> and <div id="map"> components.
  // However, I'm using a custom Map component, and I already use Loaders in the custom Map component.
  return (
      <Map pois={locations} />
    );
}
export default MapPage;