/**
 * Component to render a Google Maps Circle on a map
 * 
 * The useImperativeHandle hook in React customizes the instance value that is exposed
 * when using ref in a parent component (for example, limiting certain methods or properties).
 * A ref (short for reference) is like a state, useRef() instead of useState(). The difference is
 * states are immutable and trigger re-renders when changed while refs are mutable and don't trigger
 * re-renders when changed (React doesn't track their change). Use ref.current to access the current ref value
 * Refs are often used to access the DOM nodes or React elements created in the render method.
 * 
 * The first argument of useImperativeHandle is the ref object, and the second argument is a function
 * that returns the value that will be exposed to the parent component when using ref.
 * useImperativeHandle is a React hook, which prevents other React hooks like useEffect from being called
 * within it. Therefore, the useImperativevHandle is at the end with hardly anything in it. Actually, there's
 * no need for useImperativeHandle, maybe because of the forwardRef?
 * 
 * The parent component will often interact with these methods as shown in the commented example below:
 * 
 * const ParentComponent = () => {
 *   const someRef = useRef(null);

 *   handleClick = () => {
 *     someRef.current.someMethod();
 *   };

 *   return <Child someParam={10} ref={someRef} />;
 * };
 * 
 * const Child = forwardRef((props: Props, aRef: Ref) => {
 *   const outRef = useRef(props.someParam); // or const outRef = useRef(null);

 *   useImperativeHandle(aRef, () => {
 *     return {
 *       focus() {
 *         outRef.current.focus();
 *       }
 *     }
 *   }, []);

 *   return <div ref={outRef}> </div>;
 * });
 * 
 * forwardRef() is a utility function in React that lets you pass a ref from a parent component to a child component.
 * This is useful when the desired child element is wrapped by a higher-order component.
 * The first argument of forwardRef, the props, is often some properties defiend in the parent component.  In the
 * commented code example above, someParam is a property of Child defined in the parent component. The second argument, aRef,
 * is the ref.
 * 
 * This Circle custom object is imported by map.tsx. Although the above commented code suggests a ref should be passed by
 * the parent component, this isn't necessary in map.tsx since the major options/ properties of the Circle in map.tsx are
 * explicitly passed to the Circle component in the html fields in the return portion. Map.tsx doesn't save properties of
 * the Circle component in a ref. 
 * 
 * At one point, I was getting a google not defined error because I was accessing google.maps.Circle before the Google
 * Maps API had loaded. This was solved by using await and Loader, I think.
 */

"use client"

/* eslint-disable complexity */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  RefObject
} from 'react';

import type {Ref} from 'react';
import {latLngEquals} from '@vis.gl/react-google-maps';
import { Loader } from '@googlemaps/js-api-loader';

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
export type CircleRef = Ref<google.maps.Circle | null>;

// CircleProps will include all properties existing in BOTH google.maps.CircleOptions and CircleEventProps
// CircleRef is a union of google.maps.Circle and null

export const Circle = forwardRef((props: CircleProps, ref: RefObject<google.maps.Circle>) => {
  const {
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onMouseOver,
    onMouseOut,
    onRadiusChanged,
    onCenterChanged,
    radius,
    center,
    map,
    ...circleOptions
  } = props;
  // This is here to avoid triggering the useEffect below when the callbacks change (which happen if the user didn't memoize them)
  const callbacks = useRef<Record<string, (e: unknown) => void>>({});
  Object.assign(callbacks.current, {
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onMouseOver,
    onMouseOut,
    onRadiusChanged,
    onCenterChanged
  });

  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    const initCircle = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        version: "weekly",
      });
      // const {Circle} = await loader.importLibrary("maps");
      // circleRef.current = new Circle({});
      await loader.importLibrary("maps");
      circleRef.current = new google.maps.Circle({
        radius: radius,
        center: center,
      });
      circleRef.current.setOptions(circleOptions);
      circleRef.current.setMap(map);
      // An event handler to modify the radius of the Circle when the user edits its boundaries on the map
      google.maps.event.addListener(circleRef.current, 'radius_changed', () => {
        console.log("Inside circle.tsx, the new radius is: ", circleRef.current?.getRadius());
      });
      console.log("Circle initialized and added to map. The Circle is: ", circleRef.current);
    };
    if (!map) return;
    initCircle();
  }, [map]);

  const circle = circleRef.current;

  useEffect(() => {
    if (!circle) {
      console.log('Circle not initialized');
      return;
    }
    // If the center is null. From map.tsx, this condition occurs when the circle is clicked again
    // This technically covers the case if (latLngEquals(center, circle.getCenter()))
    if (!center) {
      circle.setMap(null); // Remove the circle from the map
      circle.setCenter(null);
      return;
    }
    if (!latLngEquals(center, circle.getCenter())) {
      circle.setMap(map); // Add the circle to the map
      circle.setCenter(center);
      console.log("Circle center updated:", center);
    }
    // Keep in mind that editing the center of the circle means the circle has been changed
    // This will trigger any useEffect with circle as a dependency.
    // If that useEffect adds any Listeners, the circleOptions is affected,
    // and any useEffect with circleOptions as a dependency will be triggered.
  }, [center]);

  // This useEffect isn't triggered when the user modifies the radius
  // by way of editing the boundaries of the Circle on the Map
  useEffect(() => {
    if (radius === undefined || radius === null || !circle) return;
    if (radius !== circle.getRadius()) {
      circle.setRadius(radius);
      console.log("Circle radius updated:", radius);
    }
  }, [radius]);

  // attach and re-attach event-handlers when any of the properties change
  useEffect(() => {
    if (!circle) return;
    console.log("Adding event listeners to the circle");

    // Add event listeners
    const gme = google.maps.event;
    [
      ['click', 'onClick'],
      ['drag', 'onDrag'],
      ['dragstart', 'onDragStart'],
      ['dragend', 'onDragEnd'],
      ['mouseover', 'onMouseOver'],
      ['mouseout', 'onMouseOut']
    ].forEach(([eventName, eventCallback]) => {
      gme.addListener(circle, eventName, (e: google.maps.MapMouseEvent) => {
        const callback = callbacks.current[eventCallback];
        if (callback) callback(e);
      });
    });
    gme.addListener(circle, 'radius_changed', () => {
      const newRadius = circle.getRadius();
      callbacks.current.onRadiusChanged?.(newRadius);
    });
    gme.addListener(circle, 'center_changed', () => {
      const newCenter = circle.getCenter();
      callbacks.current.onCenterChanged?.(newCenter);
    });

    return () => {
      gme.clearInstanceListeners(circle);
    };
  }, [circle]);

  useImperativeHandle(ref, () => circle); // Added this back so that the parent Map can access the Circle's radius
  return null; // No need for this component to render a DOM if there is a useImperativeHandle() or a forwardRef()
});
