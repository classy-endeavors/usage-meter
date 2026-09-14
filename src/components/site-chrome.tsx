import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader({
  right,
}: {
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-3 z-40 px-4">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-6 rounded-full border border-black/10 bg-white px-5 py-2 shadow-sm">
        <a
          href="https://www.classyendeavors.com/"
          className="flex min-w-0 items-center gap-2 py-1 text-sm font-semibold"
        >
          <img src="/brand/logo.svg" alt="" className="h-8 w-9 shrink-0" />
          <span className="truncate">Classy endeavors</span>
        </a>
        <span className="hidden text-sm text-neutral-500 sm:inline">Usage</span>
        <div className="shrink-0">
          {right ?? (
            <a
              href="mailto:info@classyendeavors.com"
              className="rounded-full px-4 py-2 text-sm font-medium hover:text-teal-600"
            >
              Contact Us
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-black/10 px-6 py-8 text-center text-sm text-neutral-500">
      <p>
        © {new Date().getFullYear()}{" "}
        <Link href="https://www.classyendeavors.com/" className="font-medium text-neutral-800">
          Classy Endeavors
        </Link>
        . All rights reserved.
      </p>
    </footer>
  );
}
