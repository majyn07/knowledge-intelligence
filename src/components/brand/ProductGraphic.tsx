import { cn } from "@/lib/utils";
import type { BrandTheme } from "@/providers/BrandThemeProvider";

interface ProductGraphicProps {
  product: BrandTheme;
  className?: string;
  decorative?: boolean;
}

export function ProductGraphic({ product, className, decorative = true }: ProductGraphicProps) {
  const props = { className: cn("overflow-visible", className), viewBox: "0 0 160 110", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": decorative || undefined };
  if (product === "builder") return <svg {...props}><g className="brand-graphic-stroke" strokeWidth="1.25"><path d="M42 45 70 29l28 16v32L70 93 42 77V45Z" /><path d="m42 45 28 16 28-16M70 61v32" /><path d="m72 18 19-11 19 11v22L91 51 72 40V18Z" /><path d="m72 18 19 11 19-11M91 29v22" /><path d="m101 58 15-9 15 9v18l-15 9-15-9V58Z" /><path d="m101 58 15 9 15-9M116 67v18" /></g><path className="brand-graphic-fill" d="m42 45 28 16v32L42 77V45Z" /><path className="brand-graphic-fill-alt" d="m70 61 28-16v32L70 93V61Z" /></svg>;
  if (product === "eberick") return <svg {...props}><g className="brand-graphic-stroke" strokeWidth="1.5"><path d="M17 85h126M28 85 49 22h55l27 63M49 22l28 63 27-63M28 85l49-31 54 31M17 85l32-31 28 31 27-31 39 31" /><path d="M49 22h55M49 54h55M39 54h76" strokeDasharray="3 3" /></g><g className="brand-graphic-fill"><circle cx="28" cy="85" r="3"/><circle cx="49" cy="22" r="3"/><circle cx="77" cy="85" r="3"/><circle cx="104" cy="22" r="3"/><circle cx="131" cy="85" r="3"/></g></svg>;
  return <svg {...props}><g className="brand-graphic-stroke" strokeWidth="1.25"><path d="M20 25h120v60H20z" /><path d="M20 45h120M20 65h120M50 25v60M80 25v60M110 25v60" strokeDasharray="2 3" /><path d="m32 76 29-21 24 10 31-29 17 14" strokeWidth="2" /></g><g className="brand-graphic-fill"><circle cx="32" cy="76" r="4"/><circle cx="61" cy="55" r="4"/><circle cx="85" cy="65" r="4"/><circle cx="116" cy="36" r="4"/><circle cx="133" cy="50" r="4"/></g></svg>;
}
