import { Loader } from '@googlemaps/js-api-loader';
import {useEffect, forwardRef, RefObject} from 'react';

type CircleEventProps = {
    onClick?: (e: google.maps.MapMouseEvent) => void;
    onDrag?: (e: google.maps.MapMouseEvent) => void;
    onDragStart?: (e: google.maps.MapMouseEvent) => void;
    onDragEnd?: (e: google.maps.MapMouseEvent) => void;
    onMouseOver?: (e: google.maps.MapMouseEvent) => void;
    onMouseOut?: (e: google.maps.MapMouseEvent) => void;
    onRadiusChanged?: (r: ReturnType<google.maps.Circle['getRadius']>) => void;
    onCenterChanged?: (p: ReturnType<google.maps.Circle['getCenter']>) => void;
};
  
export type CircleProps = google.maps.CircleOptions & CircleEventProps;

const Test = forwardRef((props: CircleProps, ref: RefObject<google.maps.Circle>) => {
    console.log("Beginning of the Test component");
    const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        version: "weekly",
    });
    useEffect(() => {
        const initCircle = async () => {
            const {Circle} = await loader.importLibrary("maps");
            ref.current = new Circle({});
        }
        initCircle();
    });
    // if (typeof google === 'undefined') {
    //     console.error('Google Maps API is not loaded.');
    //     return null;
    // }
        useEffect(() => {
            console.log("The center changed!");
        }, [props]);
    console.log("End of the Test component");
    return null;
});

Test.displayName = 'Test';
export default Test;
