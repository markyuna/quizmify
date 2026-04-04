"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Logo() {
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