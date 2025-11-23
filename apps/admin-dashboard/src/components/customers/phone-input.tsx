'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// Common country codes with flags (using emoji flags)
const COUNTRIES = [
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: '+7', name: 'Russia', flag: '🇷🇺' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+212', name: 'Morocco', flag: '🇲🇦' },
  { code: '+213', name: 'Algeria', flag: '🇩🇿' },
  { code: '+216', name: 'Tunisia', flag: '🇹🇳' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+233', name: 'Ghana', flag: '🇬🇭' },
  { code: '+256', name: 'Uganda', flag: '🇺🇬' },
  { code: '+250', name: 'Rwanda', flag: '🇷🇼' },
  { code: '+255', name: 'Tanzania', flag: '🇹🇿' },
  { code: '+260', name: 'Zambia', flag: '🇿🇲' },
  { code: '+263', name: 'Zimbabwe', flag: '🇿🇼' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+353', name: 'Ireland', flag: '🇮🇪' },
  { code: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: '+420', name: 'Czech Republic', flag: '🇨🇿' },
  { code: '+36', name: 'Hungary', flag: '🇭🇺' },
  { code: '+40', name: 'Romania', flag: '🇷🇴' },
  { code: '+30', name: 'Greece', flag: '🇬🇷' },
  { code: '+972', name: 'Israel', flag: '🇮🇱' },
  { code: '+961', name: 'Lebanon', flag: '🇱🇧' },
  { code: '+962', name: 'Jordan', flag: '🇯🇴' },
  { code: '+974', name: 'Qatar', flag: '🇶🇦' },
  { code: '+965', name: 'Kuwait', flag: '🇰🇼' },
  { code: '+973', name: 'Bahrain', flag: '🇧🇭' },
  { code: '+968', name: 'Oman', flag: '🇴🇲' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export function PhoneInput({
  value,
  onChange,
  countryCode: controlledCountryCode,
  onCountryCodeChange,
  placeholder = 'Enter phone number',
  className,
  disabled,
  error,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalCountryCode, setInternalCountryCode] = useState('+1');
  const inputRef = useRef<HTMLInputElement>(null);

  const countryCode = controlledCountryCode ?? internalCountryCode;
  const setCountryCode = onCountryCodeChange ?? setInternalCountryCode;

  // Auto-detect country code from phone number
  useEffect(() => {
    if (value && !controlledCountryCode) {
      // Try to detect country code from the value
      const detected = COUNTRIES.find((c) => value.startsWith(c.code));
      if (detected) {
        setInternalCountryCode(detected.code);
        // Remove country code from value if it's there
        if (onChange && value.startsWith(detected.code)) {
          onChange(value.replace(detected.code, '').trim());
        }
      }
    }
  }, [value, controlledCountryCode, onChange]);

  const filteredCountries = COUNTRIES.filter((country) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.includes(searchQuery)
  );

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Only digits
    onChange(input);
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    // Format based on country code (simplified)
    if (countryCode === '+1') {
      // US format: (555) 123-4567
      const match = phone.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      if (!match) return phone;
      const formatted = [match[1], match[2], match[3]].filter(Boolean).join('');
      if (match[3]) return `(${match[1]}) ${match[2]}-${match[3]}`;
      if (match[2]) return `(${match[1]}) ${match[2]}`;
      if (match[1]) return `(${match[1]}`;
      return phone;
    }
    return phone;
  };

  const displayValue = formatPhoneNumber(value);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'h-12 w-[140px] shrink-0 border-r-0 rounded-r-none px-3',
                error && 'border-destructive',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              disabled={disabled}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-sm font-medium">{selectedCountry.code}</span>
                <Phone className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="p-2">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      setCountryCode(country.code);
                      setOpen(false);
                      setSearchQuery('');
                      inputRef.current?.focus();
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left',
                      country.code === countryCode && 'bg-accent'
                    )}
                  >
                    <span className="text-xl">{country.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{country.name}</div>
                      <div className="text-xs text-muted-foreground">{country.code}</div>
                    </div>
                    {country.code === countryCode && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="tel"
            value={displayValue}
            onChange={handlePhoneChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'h-12 pl-10 rounded-l-none',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <span>⚠</span>
          {error}
        </p>
      )}
      <input
        type="hidden"
        value={`${countryCode}${value.replace(/\D/g, '')}`}
      />
    </div>
  );
}

