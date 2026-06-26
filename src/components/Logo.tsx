"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type LogoProps = {
  compact?: boolean;
};

export default function Logo({ compact = false }: LogoProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/logo.png"
            alt="Quizmify"
            width={30}
            height={30}
            className="drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]"
          />
        </motion.div>
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-base font-bold tracking-tight text-transparent"
        >
          uizmify
        </motion.span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 group">
      {/* Glow detrás */}
      <div className="absolute w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 via-cyan-500 to-emerald-500 blur-2xl opacity-30 group-hover:opacity-60 transition duration-500" />

      {/* Logo animado */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: [1, 1.03, 1], opacity: 1 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative z-10"
      >
        <Image
          src="/logo.png"
          alt="Quizmify"
          width={100}
          height={100}
          className="drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]"
        />
      </motion.div>

      {/* Texto animado */}
      <motion.span
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-3xl font-bold text-black dark:text-white tracking-tight leading-none"
      >
        uizmify
      </motion.span>
    </div>
  );
}
