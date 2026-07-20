"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Preloader() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "radial-gradient(circle at 50% 40%, #211b12 0%, #14110c 70%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 88,
                height: 88,
                margin: "0 auto 22px",
                border: "2px solid var(--color-gold)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-serif)",
                fontSize: "2.6rem",
                color: "var(--color-gold)",
                animation: "plspin 2.4s linear infinite",
              }}
            >
              L
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                color: "#fff",
                fontSize: "1.9rem",
                letterSpacing: 6,
              }}
            >
              LUMI<span style={{ color: "var(--color-gold)" }}>ÈRE</span>
            </div>
            <div
              style={{
                color: "rgba(255,255,255,.5)",
                letterSpacing: 4,
                fontSize: ".68rem",
                textTransform: "uppercase",
                marginTop: 6,
              }}
            >
              International Fine Dining
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
