"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Logo() {
  return (
    <div className="flex items-center gap-1.5">
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/logo.png"
          alt=""
          aria-hidden="true"
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
