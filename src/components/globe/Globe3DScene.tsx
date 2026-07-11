"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { AdditiveBlending, type Group } from "three";

import { getCountryCoordinates } from "@/lib/geo-countries";
import { createWorldMapTexture } from "./worldMapTexture";

type Globe3DSceneProps = {
  litCountries: string[];
  reducedMotion: boolean;
};

const GLOBE_RADIUS = 1.5;

function latLngToPosition(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function CountryMarker({ lat, lng, reducedMotion }: { lat: number; lng: number; reducedMotion: boolean }) {
  const position = latLngToPosition(lat, lng, GLOBE_RADIUS + 0.04);
  const groupRef = React.useRef<Group>(null);

  useFrame(({ clock }) => {
    if (reducedMotion || !groupRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.18;
    groupRef.current.scale.setScalar(pulse);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Local light so the marker visibly lights up the globe surface beneath it */}
      <pointLight color="#fbbf24" intensity={1.2} distance={1} decay={2} />

      {/* Outer glow halo (additive blending reads as a soft glow, no postprocessing needed) */}
      <mesh>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial
          color="#fde68a"
          transparent
          opacity={0.4}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Bright core */}
      <mesh>
        <sphereGeometry args={[0.085, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2.2} />
      </mesh>
    </group>
  );
}

export default function Globe3DScene({ litCountries, reducedMotion }: Globe3DSceneProps) {
  const markers = React.useMemo(() => {
    return litCountries
      .map((country) => ({ country, coords: getCountryCoordinates(country) }))
      .filter((m): m is { country: string; coords: { lat: number; lng: number } } => m.coords !== null);
  }, [litCountries]);

  const worldMap = React.useMemo(() => createWorldMapTexture(), []);

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.2], fov: 40 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 3]} intensity={1.1} />

      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
        <meshStandardMaterial map={worldMap} roughness={0.7} metalness={0.05} />
      </mesh>

      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.005, 24, 24]} />
        <meshBasicMaterial color="#60a5fa" wireframe transparent opacity={0.15} />
      </mesh>

      {markers.map(({ country, coords }) => (
        <CountryMarker key={country} lat={coords.lat} lng={coords.lng} reducedMotion={reducedMotion} />
      ))}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.6}
        rotateSpeed={0.6}
      />
    </Canvas>
  );
}
