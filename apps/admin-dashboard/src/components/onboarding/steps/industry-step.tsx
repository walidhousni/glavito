import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Building2, ShoppingBag, Car, Stethoscope, Home, Coffee, Briefcase, GraduationCap, Store, Factory } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { api as apiClient } from '@/lib/api/config';

interface IndustryStepProps {
  data: any;
  onDataChange: (data: any) => void;
}

interface Industry {
  id: string;
  industry: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export function IndustryStep({ data, onDataChange }: IndustryStepProps) {
  const t = useTranslations('onboarding.industry');
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(data?.selectedIndustry || null);

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const response = await apiClient.get('/templates');
        // Handle both direct array and nested data response formats
        const templates = Array.isArray(response.data) ? response.data : response.data?.data || [];
        
        // Deduplicate by industry slug if needed, though backend should handle this
        // For now, we'll just use the templates directly as they map 1:1 to industries in our data
        setIndustries(templates);
      } catch (error) {
        console.error('Failed to fetch industries:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIndustries();
  }, []);

  const handleSelect = (industrySlug: string) => {
    setSelectedIndustry(industrySlug);
    onDataChange({ selectedIndustry: industrySlug });
  };

  const getIcon = (industry: string) => {
    switch (industry) {
      case 'e-commerce': return <ShoppingBag className="w-6 h-6" />;
      case 'automotive': return <Car className="w-6 h-6" />;
      case 'healthcare': return <Stethoscope className="w-6 h-6" />;
      case 'real-estate': return <Home className="w-6 h-6" />;
      case 'hospitality': return <Coffee className="w-6 h-6" />;
      case 'finance': return <Building2 className="w-6 h-6" />;
      case 'education': return <GraduationCap className="w-6 h-6" />;
      case 'retail': return <Store className="w-6 h-6" />;
      case 'manufacturing': return <Factory className="w-6 h-6" />;
      default: return <Briefcase className="w-6 h-6" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading industries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
          {t('title', { default: 'Select Your Industry' })}
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {t('subtitle', { default: 'We\'ll tailor your experience with industry-specific templates, workflows, and settings.' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2 pr-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
        {industries.map((industry) => (
          <motion.div
            key={industry.id}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(industry.industry)}
            className={cn(
              "cursor-pointer relative group rounded-xl border p-5 transition-all duration-200",
              "hover:shadow-lg hover:border-primary/30 dark:hover:border-primary/30",
              selectedIndustry === industry.industry
                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md"
                : "border-border bg-card/50 hover:bg-card"
            )}
          >
            {selectedIndustry === industry.industry && (
              <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1 shadow-sm animate-in zoom-in duration-200">
                <Check className="w-3 h-3" />
              </div>
            )}

            <div className="flex flex-col items-center text-center space-y-4">
              <div 
                className={cn(
                  "p-3.5 rounded-2xl transition-colors duration-300 shadow-sm",
                  selectedIndustry === industry.industry ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900 group-hover:bg-white dark:group-hover:bg-gray-800"
                )}
                style={{ color: industry.color }}
              >
                {industry.icon && industry.icon.startsWith('http') ? (
                  <Image 
                    src={industry.icon} 
                    alt={industry.name} 
                    width={48} 
                    height={48}
                    className="w-8 h-8 object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  getIcon(industry.industry)
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="font-semibold text-base tracking-tight">{industry.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed px-2">
                  {industry.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="text-center">
        <p className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900/50 inline-block px-4 py-2 rounded-full border border-gray-100 dark:border-gray-800">
          {t('note', { default: 'Don\'t see your industry? Select "SaaS" for a general setup.' })}
        </p>
      </div>
    </div>
  );
}
