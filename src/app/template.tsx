import { ViewTransition } from "react";

/**
 * Wraps each page so changing pages from the navbar cross-fades: the old page
 * fades out quickly and the new one rises in. Only navigations tagged "nav"
 * (the navbar and tab bar) animate; everything else swaps instantly.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={{ nav: "page-swap", default: "none" }} exit={{ nav: "page-swap", default: "none" }} default="none">
      {children}
    </ViewTransition>
  );
}
