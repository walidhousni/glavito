"use client";

import { Globe } from "lucide-react";
import { Locale, locales, usePathname, useRouter } from "@/i18n.config";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALE_LABELS: Record<Locale, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇬🇧" },
  ar: { label: "العربية", flag: "🇸🇦" },
  fr: { label: "Français", flag: "🇫🇷" },
};

export function LanguageSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {locales.map((loc) => {
          const info = LOCALE_LABELS[loc as Locale];
          const isActive = loc === currentLocale;
          return (
            <DropdownMenuItem
              key={loc}
              onSelect={() => {
                const query = searchParams?.toString();
                const href = query ? `${pathname}?${query}` : pathname;
                router.push(href, { locale: loc as Locale });
              }}
              className="flex w-full items-center"
              aria-current={isActive ? 'true' : undefined}
            >
              <span className="mr-2 text-lg leading-none">{info.flag}</span>
              <span className="flex-1">{info.label}</span>
              {isActive ? (
                <span className="ml-2 text-xs text-muted-foreground">•</span>
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


