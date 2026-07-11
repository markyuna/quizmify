"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { Shape, Vector2, type Group } from "three";

import { getTrophyShape, type TrophyShape } from "@/lib/trophyTiers";
import type { TrophyReason } from "@/app/api/quiz/submit/route";

type Trophy3DSceneProps = {
  reason: TrophyReason;
  streakCount?: number | null;
  reducedMotion: boolean;
};

type Palette = { primary: string; accent: string };

const PALETTES: Record<TrophyShape, Palette> = {
  cup: { primary: "#fbbf24", accent: "#fde68a" },
  medal: { primary: "#fb923c", accent: "#fca5a5" },
  star: { primary: "#8b5cf6", accent: "#c4b5fd" },
  crown: { primary: "#facc15", accent: "#67e8f9" },
};

function Medal({ colors }: { colors: Palette }) {
  return (
    <group>
      <mesh position={[-0.35, 1.3, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.35, 0.9, 0.08]} />
        <meshStandardMaterial color={colors.accent} roughness={0.6} />
      </mesh>
      <mesh position={[0.35, 1.3, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.35, 0.9, 0.08]} />
        <meshStandardMaterial color={colors.primary} roughness={0.6} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1, 1, 0.22, 48]} />
        <meshStandardMaterial color={colors.primary} roughness={0.25} metalness={0.7} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.06, 16, 48]} />
        <meshStandardMaterial color={colors.accent} roughness={0.2} metalness={0.8} emissive={colors.accent} emissiveIntensity={0.3} />
      </mesh>

      <mesh position={[0, 0, 0.14]}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color={colors.accent} emissive={colors.accent} emissiveIntensity={0.6} roughness={0.15} metalness={0.5} />
      </mesh>
    </group>
  );
}

const STAR_SHAPE = (() => {
  const shape = new Shape();
  const points = 5;
  const outerRadius = 0.9;
  const innerRadius = 0.38;
  const step = Math.PI / points;

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
})();

function Star({ colors }: { colors: Palette }) {
  return (
    <group>
      <mesh position={[-0.32, 1.25, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.32, 0.85, 0.08]} />
        <meshStandardMaterial color={colors.accent} roughness={0.6} />
      </mesh>
      <mesh position={[0.32, 1.25, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.32, 0.85, 0.08]} />
        <meshStandardMaterial color={colors.primary} roughness={0.6} />
      </mesh>

      <mesh>
        <extrudeGeometry
          args={[
            STAR_SHAPE,
            { depth: 0.22, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 },
          ]}
        />
        <meshStandardMaterial color={colors.primary} roughness={0.2} metalness={0.75} emissive={colors.primary} emissiveIntensity={0.15} />
      </mesh>

      <mesh position={[0, 0, 0.23]}>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshStandardMaterial color={colors.accent} emissive={colors.accent} emissiveIntensity={0.7} roughness={0.15} metalness={0.5} />
      </mesh>
    </group>
  );
}

const CUP_PROFILE = [
  [0.55, 0.0],
  [0.55, 0.15],
  [0.18, 0.15],
  [0.18, 0.75],
  [0.24, 0.82],
  [0.14, 0.95],
  [0.14, 1.05],
  [0.35, 1.15],
  [0.95, 1.45],
  [0.88, 1.75],
  [0.5, 1.95],
  [0.58, 2.0],
  [0.5, 2.04],
].map(([x, y]) => new Vector2(x, y));

function Cup({ colors }: { colors: Palette }) {
  return (
    <group position={[0, -1.0, 0]}>
      <mesh>
        <latheGeometry args={[CUP_PROFILE, 40]} />
        <meshStandardMaterial color={colors.primary} roughness={0.2} metalness={0.8} />
      </mesh>

      <mesh position={[0, 1.6, 0]}>
        <torusGeometry args={[0.5, 0.05, 16, 40]} />
        <meshStandardMaterial color={colors.accent} roughness={0.15} metalness={0.85} emissive={colors.accent} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function Crown({ colors }: { colors: Palette }) {
  const spikeCount = 6;

  return (
    <group position={[0, -0.2, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.8, 0.9, 0.4, 40]} />
        <meshStandardMaterial color={colors.primary} roughness={0.2} metalness={0.8} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
        <torusGeometry args={[0.82, 0.05, 16, 40]} />
        <meshStandardMaterial color={colors.accent} roughness={0.15} metalness={0.85} emissive={colors.accent} emissiveIntensity={0.3} />
      </mesh>

      {Array.from({ length: spikeCount }).map((_, i) => {
        const angle = (i / spikeCount) * Math.PI * 2;
        const x = Math.cos(angle) * 0.8;
        const z = Math.sin(angle) * 0.8;

        return (
          <group key={i} position={[x, 0.55, z]}>
            <mesh>
              <coneGeometry args={[0.18, 0.6, 4]} />
              <meshStandardMaterial color={colors.primary} roughness={0.25} metalness={0.75} />
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshStandardMaterial color={colors.accent} emissive={colors.accent} emissiveIntensity={0.8} roughness={0.1} metalness={0.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function TrophyShapeMesh({ shape, colors }: { shape: TrophyShape; colors: Palette }) {
  switch (shape) {
    case "cup":
      return <Cup colors={colors} />;
    case "star":
      return <Star colors={colors} />;
    case "crown":
      return <Crown colors={colors} />;
    case "medal":
    default:
      return <Medal colors={colors} />;
  }
}

function RotatingTrophy({ shape, colors, reducedMotion }: { shape: TrophyShape; colors: Palette; reducedMotion: boolean }) {
  const groupRef = React.useRef<Group>(null);

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.6;
  });

  return (
    <group ref={groupRef}>
      <TrophyShapeMesh shape={shape} colors={colors} />
    </group>
  );
}

export default function Trophy3DScene({ reason, streakCount, reducedMotion }: Trophy3DSceneProps) {
  const shape = getTrophyShape(reason ?? "perfect", streakCount);
  const colors = PALETTES[shape];

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.5], fov: 42 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 3]} intensity={1.4} />
      <pointLight position={[-3, -2, 2]} intensity={0.4} color={colors.accent} />

      <RotatingTrophy shape={shape} colors={colors} reducedMotion={reducedMotion} />

      {!reducedMotion && (
        <Sparkles count={40} scale={4} size={2.5} speed={0.4} color={colors.accent} />
      )}
    </Canvas>
  );
}
