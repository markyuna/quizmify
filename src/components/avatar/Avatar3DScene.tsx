"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

import type { AvatarTier } from "@/lib/avatar";

type Avatar3DSceneProps = {
  tier: AvatarTier;
  reducedMotion: boolean;
};

function CoreMesh({ tier, reducedMotion }: Avatar3DSceneProps) {
  const meshRef = React.useRef<Mesh>(null);
  const accessoryRef = React.useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.35;
    if (accessoryRef.current) accessoryRef.current.rotation.y -= delta * 0.6;
  });

  const geometry =
    tier.geometry === "sphere" ? (
      <sphereGeometry args={[1, 32, 32]} />
    ) : tier.geometry === "icosahedron" ? (
      <icosahedronGeometry args={[1, 1]} />
    ) : (
      <octahedronGeometry args={[1.1]} />
    );

  return (
    <group>
      <mesh ref={meshRef} castShadow>
        {geometry}
        <meshStandardMaterial
          color={tier.primaryColor}
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>

      {tier.accessory === "ring" && (
        <mesh ref={accessoryRef} rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[1.5, 0.05, 12, 48]} />
          <meshStandardMaterial color={tier.accentColor} emissive={tier.accentColor} emissiveIntensity={0.4} />
        </mesh>
      )}

      {tier.accessory === "flame" && (
        <mesh ref={accessoryRef} position={[0, 1.5, 0]}>
          <coneGeometry args={[0.35, 0.7, 12]} />
          <meshStandardMaterial color={tier.accentColor} emissive={tier.accentColor} emissiveIntensity={0.6} />
        </mesh>
      )}

      {tier.accessory === "shards" &&
        [0, 1, 2].map((i) => (
          <mesh
            key={i}
            ref={i === 0 ? accessoryRef : undefined}
            position={[
              Math.cos((i / 3) * Math.PI * 2) * 1.7,
              Math.sin(i) * 0.4,
              Math.sin((i / 3) * Math.PI * 2) * 1.7,
            ]}
          >
            <octahedronGeometry args={[0.22]} />
            <meshStandardMaterial color={tier.accentColor} emissive={tier.accentColor} emissiveIntensity={0.5} />
          </mesh>
        ))}

      {tier.accessory === "stars" &&
        [0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            ref={i === 0 ? accessoryRef : undefined}
            position={[
              Math.cos((i / 4) * Math.PI * 2) * 1.9,
              Math.sin((i / 4) * Math.PI * 2) * 0.6,
              Math.sin((i / 4) * Math.PI * 2) * 1.9,
            ]}
          >
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color={tier.accentColor} emissive={tier.accentColor} emissiveIntensity={0.8} />
          </mesh>
        ))}
    </group>
  );
}

export default function Avatar3DScene({ tier, reducedMotion }: Avatar3DSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.2], fov: 40 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} />
      <CoreMesh tier={tier} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
