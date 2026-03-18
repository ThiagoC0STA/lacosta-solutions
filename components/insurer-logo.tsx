"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { getInsurerLogoUrl } from "@/lib/insurer-logos";
import { insurerMatchesPolicy } from "@/lib/insurer-helpers";
import { cn } from "@/lib/utils";
import type { Insurer } from "@/types";

interface InsurerLogoProps {
  insurerName: string | undefined;
  insurers?: Insurer[];
  /** Width in px - logos are typically wider than tall */
  width?: number;
  /** Height in px */
  height?: number;
  className?: string;
}

export function InsurerLogo({
  insurerName,
  insurers = [],
  width = 48,
  height = 24,
  className,
}: InsurerLogoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const uploadedLogo = insurers?.find((i) => insurerMatchesPolicy(i.name, insurerName))?.logoUrl;
  const fallbackUrl = getInsurerLogoUrl(insurerName);

  const logoUrl =
    uploadedLogo && failedUrl !== uploadedLogo
      ? uploadedLogo
      : fallbackUrl && failedUrl !== fallbackUrl
        ? fallbackUrl
        : null;

  if (!insurerName?.trim()) return null;
  if (!logoUrl) {
    return (
      <div
        title={insurerName}
        className={cn(
          "flex items-center justify-center rounded-md bg-muted/50 shrink-0 cursor-help",
          className
        )}
        style={{ width, height }}
      >
        <Building2 className="h-[60%] w-[60%] text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={insurerName}
      title={insurerName}
      width={width}
      height={height}
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      className={cn(
        "rounded-md object-contain shrink-0 bg-white/80 cursor-help",
        className
      )}
      style={{ width, height }}
      onError={() => setFailedUrl(logoUrl)}
    />
  );
}
