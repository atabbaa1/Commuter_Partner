"use client"

/* eslint-disable complexity */
import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  RefObject
} from 'react';

import type {Ref} from 'react';
import {GoogleMapsContext, latLngEquals} from '@vis.gl/react-google-maps';
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

// CircleProps will include all properties existing in BOTH google.maps.CircleOptions and CircleEventProps
export type CircleProps = google.maps.CircleOptions & CircleEventProps;

// CircleRef is a union of google.maps.Circle and null
export type CircleRef = Ref<google.maps.Circle | null>;

// CircleProps will include all properties existing in BOTH google.maps.CircleOptions and CircleEventProps
// CircleRef is a union of google.maps.Circle and null

/**
 * Component to render a Google Maps Circle on a map
 * 
 * The useImperativeHandle hook in React customizes the instance value that is exposed
 * when using ref in a parent component (for example, limiting certain methods or properties).
 * A ref (short for reference) is like a state, useRef() instead of useState(). The difference is
 * states are immutable and trigger re-renders when changed while refs are mutable and don't trigger
 * re-renders when changed. One can use ref.current to access the current value of the ref.
 * Refs are often used to access the DOM nodes or React elements created in the render method.
 * 
 * The first argument of useImperativeHandle is the ref object, and the second argument is a function
 * that returns the value that will be exposed to the parent component when using ref.
 * In the non-commented code below, a circle instance from useCircle() is exposed to the parent component.
 * This means the parent component can interact with the methods and properties defined in useCircle(),
 * not just the methods and properties associated with a default instance of the Circle component.
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
 * Maps API had loaded. This occurred when the below method had separate lines:
 * 
 * const circle = useCircle(props);
 * useImperativeHandle(ref, () => circle);
 * 
 * This was causing double the number of Circles to try and get loaded, I think.
 */
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
      circleRef.current = new google.maps.Circle({});
      circleRef.current.setOptions(circleOptions);
      circleRef.current.setMap(map);
      console.log("Circle initialized and added to map:", circleRef.current);
    };
    initCircle();
  }, [map, circleOptions]);

  const circle = circleRef.current;

  useEffect(() => {
    if (!circle) return;
    if (!center) {
      circle.setMap(null); // Remove the circle from the map
      return;
    }
    if (!latLngEquals(center, circle.getCenter())) {
      circle.setCenter(center);
      console.log("Circle center updated:", center);
    }
  }, [center]);

  useEffect(() => {
    if (radius === undefined || radius === null || !circle) return;
    if (radius !== circle.getRadius()) {
      circle.setRadius(radius);
      console.log("Circle radius updated:", radius);
    }
  }, [radius]);

  // const map = useContext(GoogleMapsContext)?.map; // ******************************************************************************

  // // create circle instance and add to the map once the map is available
  // useEffect(() => {
  //   if (!map) {
  //     if (map === undefined)
  //       console.error('<Circle> has to be inside a Map component.');

  //     return;
  //   }

  //   console.log("The center of the map inside circle.tsx is: ", map.getCenter().lat(), map.getCenter().lng());
  //   circle.setMap(map);

  //   // ****************************************************************************************************************************
  //   // return () => {
  //   //   circle.setMap(null);
  //   // };
  // }, [map]);

  // attach and re-attach event-handlers when any of the properties change
  useEffect(() => {
    if (!circle) return;

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

    // ****************************************************************************************************************************
    return () => {
      gme.clearInstanceListeners(circle);
    };
  }, [circle]);

  useImperativeHandle(ref, () => circle);
  return null; // No need for this component to render a DOM if there is a useImperativeHandle()
});
