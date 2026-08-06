"use client";

import { motion } from "motion/react";

const TAGS = { div: motion.div, li: motion.li } as const;

export function ScrollReveal({
  children,
  index = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  as?: keyof typeof TAGS;
}) {
  const MotionTag = TAGS[as];
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.08 }}
    >
      {children}
    </MotionTag>
  );
}
