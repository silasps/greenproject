"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PublicNav } from "@/components/public-nav";

function useScrolled(thresholdPx = 8) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > thresholdPx);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [thresholdPx]);

  return scrolled;
}

export function PublicHeader() {
  const scrolled = useScrolled();

  return (
    <header
      className={`sticky top-0 z-30 border-b bg-white/85 backdrop-blur transition-shadow duration-300 supports-[backdrop-filter]:bg-white/75 ${
        scrolled ? "border-neutral-200 shadow-sm" : "border-neutral-200/80 shadow-none"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/brand/logo.png"
            alt="Greenproject Engenharia"
            width={210}
            height={50}
            className="h-9 w-auto sm:h-10"
          />
        </Link>
        <div className="flex items-center gap-3">
          <PublicNav />
          <Link
            href="/login"
            className="hidden rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark sm:inline-flex"
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
