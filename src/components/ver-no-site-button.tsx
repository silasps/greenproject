import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function VerNoSiteButton({ href, label = "Ver no site" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-2 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
    >
      <ExternalLink className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
