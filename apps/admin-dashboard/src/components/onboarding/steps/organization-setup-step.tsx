'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Globe, MapPin, Clock } from 'lucide-react';

interface OrganizationSetupStepProps {
  data: any;
  onComplete: (data: any) => Promise<void>;
  isLoading: boolean;
}

export function OrganizationSetupStep({ data, onComplete, isLoading }: OrganizationSetupStepProps) {
  const t = useTranslations('onboarding.steps.organization');
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  
  const [formData, setFormData] = useState({
    companyName: data.companyName || '',
    website: data.website || '',
    industry: data.industry || '',
    companySize: data.companySize || '',
    timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    primaryColor: data.primaryColor || '#3b82f6',
    description: data.description || '',
    address: {
      street: data.address?.street || '',
      city: data.address?.city || '',
      state: data.address?.state || '',
      country: data.address?.country || '',
      postalCode: data.address?.postalCode || '',
    },
    contact: {
      email: data.contact?.email || '',
      phone: data.contact?.phone || '',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Retail',
    'Manufacturing',
    'Real Estate',
    'Consulting',
    'Non-profit',
    'Other'
  ];

  const companySizes = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '500+ employees'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = tr('validation.companyNameRequired', 'Company name is required');
    }

    if (!formData.industry) {
      newErrors.industry = tr('validation.industryRequired', 'Please select an industry');
    }

    if (!formData.companySize) {
      newErrors.companySize = tr('validation.companySizeRequired', 'Please select company size');
    }

    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = tr('validation.websiteInvalid', 'Enter a valid URL starting with http(s)://');
    }

    // Primary color is required by backend validation (hex color like #RRGGBB)
    if (!formData.primaryColor || !/^#[0-9A-Fa-f]{6}$/.test(formData.primaryColor)) {
      newErrors.primaryColor = tr('validation.primaryColorRequired', 'Primary color is required (e.g. #1d4ed8)');
    }

    if (formData.contact.email && !formData.contact.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.contactEmail = tr('validation.emailInvalid', 'Enter a valid email');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    await onComplete(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...(prev as any)[parent], [field]: value }
    }));
  };

  const selectClass = (hasError?: boolean) => `w-full px-3 py-2 rounded-md border ${hasError ? 'border-red-500' : 'border-gray-300'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`;
  const inputClass = (hasError?: boolean) => `${hasError ? 'border-red-500' : ''}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <CardTitle>{tr('basic.title', 'Basic information')}</CardTitle>
          </div>
          <CardDescription>{tr('basic.description', 'Tell us about your organization')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">{tr('fields.companyName', 'Company name')} *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder={tr('placeholders.companyName', 'Acme Inc.')}
                className={inputClass(!!errors.companyName)}
              />
              {errors.companyName && (
                <p className="text-sm text-red-600 mt-1">{errors.companyName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="website">{tr('fields.website', 'Website')}</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder={tr('placeholders.website', 'https://example.com')}
                className={inputClass(!!errors.website)}
              />
              {errors.website && (
                <p className="text-sm text-red-600 mt-1">{errors.website}</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryColor">{tr('fields.primaryColor', 'Primary color')} *</Label>
              <div className="flex items-center gap-3">
                <input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="h-10 w-16 rounded border border-gray-300 bg-white dark:bg-gray-800"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  placeholder="#1d4ed8"
                  className={`max-w-xs ${inputClass(!!errors.primaryColor)}`}
                />
              </div>
              {errors.primaryColor && (
                <p className="text-sm text-red-600 mt-1">{errors.primaryColor}</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="industry">{tr('fields.industry', 'Industry')} *</Label>
              <select
                id="industry"
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className={selectClass(!!errors.industry)}
              >
                <option value="">{tr('placeholders.selectIndustry', 'Select industry')}</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
              {errors.industry && (
                <p className="text-sm text-red-600 mt-1">{errors.industry}</p>
              )}
            </div>

            <div>
              <Label htmlFor="companySize">{tr('fields.companySize', 'Company size')} *</Label>
              <select
                id="companySize"
                value={formData.companySize}
                onChange={(e) => handleInputChange('companySize', e.target.value)}
                className={selectClass(!!errors.companySize)}
              >
                <option value="">{tr('placeholders.selectCompanySize', 'Select company size')}</option>
                {companySizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              {errors.companySize && (
                <p className="text-sm text-red-600 mt-1">{errors.companySize}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">{tr('fields.description', 'Description')}</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={tr('placeholders.description', 'Short description about your company')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <CardTitle>{tr('contact.title', 'Contact information')}</CardTitle>
          </div>
          <CardDescription>{tr('contact.description', 'How can customers reach you?')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactEmail">{tr('fields.contactEmail', 'Contact email')}</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contact.email}
                onChange={(e) => handleNestedInputChange('contact', 'email', e.target.value)}
                placeholder={tr('placeholders.contactEmail', 'support@example.com')}
                className={inputClass(!!errors.contactEmail)}
              />
              {errors.contactEmail && (
                <p className="text-sm text-red-600 mt-1">{errors.contactEmail}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contactPhone">{tr('fields.contactPhone', 'Contact phone')}</Label>
              <Input
                id="contactPhone"
                value={formData.contact.phone}
                onChange={(e) => handleNestedInputChange('contact', 'phone', e.target.value)}
                placeholder={tr('placeholders.contactPhone', '+1 555 555 5555')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <CardTitle>{tr('address.title', 'Address')}</CardTitle>
          </div>
          <CardDescription>{tr('address.description', 'Where is your company located?')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="street">{tr('fields.street', 'Street')}</Label>
            <Input
              id="street"
              value={formData.address.street}
              onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
              placeholder={tr('placeholders.street', '123 Main St')}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">{tr('fields.city', 'City')}</Label>
              <Input
                id="city"
                value={formData.address.city}
                onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                placeholder={tr('placeholders.city', 'San Francisco')}
              />
            </div>

            <div>
              <Label htmlFor="state">{tr('fields.state', 'State')}</Label>
              <Input
                id="state"
                value={formData.address.state}
                onChange={(e) => handleNestedInputChange('address', 'state', e.target.value)}
                placeholder={tr('placeholders.state', 'CA')}
              />
            </div>

            <div>
              <Label htmlFor="postalCode">{tr('fields.postalCode', 'Postal code')}</Label>
              <Input
                id="postalCode"
                value={formData.address.postalCode}
                onChange={(e) => handleNestedInputChange('address', 'postalCode', e.target.value)}
                placeholder={tr('placeholders.postalCode', '94105')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="country">{tr('fields.country', 'Country')}</Label>
            <Input
              id="country"
              value={formData.address.country}
              onChange={(e) => handleNestedInputChange('address', 'country', e.target.value)}
              placeholder={tr('placeholders.country', 'United States')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <CardTitle>{tr('timezone.title', 'Timezone')}</CardTitle>
          </div>
          <CardDescription>{tr('timezone.description', 'Select or confirm your default timezone')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="timezone">{tr('fields.timezone', 'Timezone')}</Label>
            <Input
              id="timezone"
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              placeholder={tr('placeholders.timezone', 'e.g. America/Los_Angeles')}
            />
            <p className="text-sm text-gray-500 mt-1">
              {tr('timezone.detected', 'Detected')}: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading ? tr('saving', 'Saving...') : tr('continue', 'Continue')}
        </Button>
      </div>
    </form>
  );
}