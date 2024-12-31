"use client"

import React from 'react';
import {APIProvider} from '@vis.gl/react-google-maps'; // later add Map if necessary
import {Map} from './components/map';

const Test = () => {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  console.log("Inside Test component");
  return (
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} onLoad={() => console.log('Maps API has loaded inside page.tsx.')} onError={(err) => console.error('Error loading Maps API inside page.tsx:', err)}>
        <Map />
    </APIProvider>
    );
}
export default Test;