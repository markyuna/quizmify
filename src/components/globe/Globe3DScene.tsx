"use client";

import * as React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { AdditiveBlending, BackSide, Color, type Group } from "three";

import { getCountryCoordinates } from "@/lib/geo-countries";
import { createWorldMapTexture } from "./worldMapTexture";

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform vec3 glowColor;
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
    gl_FragColor = vec4(glowColor, 1.0) * intensity;
  }
`;

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

function Earth() {
  const { gl } = useThree();
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
  const worldMap = React.useMemo(() => createWorldMapTexture(maxAnisotropy), [maxAnisotropy]);

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshStandardMaterial map={worldMap} roughness={0.75} metalness={0.05} />
    </mesh>
  );
}

function Atmosphere() {
  const glowColor = React.useMemo(() => ({ value: new Color("#60a5fa") }), []);

  return (
    <mesh scale={1.16}>
      <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
      <shaderMaterial
        vertexShader={ATMOSPHERE_VERTEX_SHADER}
        fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
        uniforms={{ glowColor }}
        blending={AdditiveBlending}
        side={BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

export default function Globe3DScene({ litCountries, reducedMotion }: Globe3DSceneProps) {
  const markers = React.useMemo(() => {
    return litCountries
      .map((country) => ({ country, coords: getCountryCoordinates(country) }))
      .filter((m): m is { country: string; coords: { lat: number; lng: number } } => m.coords !== null);
  }, [litCountries]);

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.2], fov: 40 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 3]} intensity={1.1} />
      <pointLight position={[-3, -2, -2]} intensity={0.3} color="#60a5fa" />

      <Earth />

      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.005, 24, 24]} />
        <meshBasicMaterial color="#60a5fa" wireframe transparent opacity={0.12} />
      </mesh>

      {markers.map(({ country, coords }) => (
        <CountryMarker key={country} lat={coords.lat} lng={coords.lng} reducedMotion={reducedMotion} />
      ))}

      <Atmosphere />

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
