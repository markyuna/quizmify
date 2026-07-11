"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import type { Group } from "three";

import type { TrophyReason } from "@/app/api/quiz/submit/route";

type Trophy3DSceneProps = {
  reason: TrophyReason;
  reducedMotion: boolean;
};

const PALETTE: Record<Exclude<TrophyReason, null>, { primary: string; accent: string }> = {
  perfect: { primary: "#fbbf24", accent: "#fde68a" },
  streak: { primary: "#fb923c", accent: "#fca5a5" },
};

function Medal({ reason, reducedMotion }: Trophy3DSceneProps) {
  const groupRef = React.useRef<Group>(null);
  const colors = PALETTE[reason ?? "perfect"];

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.6;
  });

  return (
    <group ref={groupRef}>
      {/* Ribbon */}
      <mesh position={[-0.35, 1.3, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.35, 0.9, 0.08]} />
        <meshStandardMaterial color={colors.accent} roughness={0.6} />
      </mesh>
      <mesh position={[0.35, 1.3, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.35, 0.9, 0.08]} />
        <meshStandardMaterial color={colors.primary} roughness={0.6} />
      </mesh>

      {/* Medal disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1, 1, 0.22, 48]} />
        <meshStandardMaterial color={colors.primary} roughness={0.25} metalness={0.7} />
      </mesh>

      {/* Rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.06, 16, 48]} />
        <meshStandardMaterial color={colors.accent} roughness={0.2} metalness={0.8} emissive={colors.accent} emissiveIntensity={0.3} />
      </mesh>

      {/* Center star accent */}
      <mesh position={[0, 0, 0.14]}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color={colors.accent} emissive={colors.accent} emissiveIntensity={0.6} roughness={0.15} metalness={0.5} />
      </mesh>
    </group>
  );
}

export default function Trophy3DScene({ reason, reducedMotion }: Trophy3DSceneProps) {
  const colors = PALETTE[reason ?? "perfect"];

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.5], fov: 42 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 3]} intensity={1.4} />
      <pointLight position={[-3, -2, 2]} intensity={0.4} color={colors.accent} />
      <Medal reason={reason} reducedMotion={reducedMotion} />
      {!reducedMotion && (
        <Sparkles count={40} scale={4} size={2.5} speed={0.4} color={colors.accent} />
      )}
    </Canvas>
  );
}
