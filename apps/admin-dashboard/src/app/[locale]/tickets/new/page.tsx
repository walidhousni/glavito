"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Save, Bot, User, Tag, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Mock data for customers and agents
const mockCustomers = [
  { id: "CUST-001", name: "John Doe", email: "john.doe@example.com" },
  { id: "CUST-002", name: "Jane Smith", email: "jane.smith@example.com" },
  { id: "CUST-003", name: "Bob Johnson", email: "bob.johnson@example.com" },
];

const mockAgents = [
  { id: "AGENT-001", name: "Sarah Wilson", email: "sarah.wilson@company.com" },
  { id: "AGENT-002", name: "Mike Chen", email: "mike.chen@company.com" },
  { id: "AGENT-003", name: "Emily Davis", email: "emily.davis@company.com" },
];

const categories = [
  { value: "technical", label: "Technical" },
  { value: "billing", label: "Billing" },
  { value: "general", label: "General Inquiry" },
  { value: "feature-request", label: "Feature Request" },
  { value: "bug-report", label: "Bug Report" },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface TicketFormData {
  title: string;
  description: string;
  customerId: string;
  assignedAgentId: string;
  category: string;
  priority: string;
  tags: string[];
}

interface AIAnalysis {
  suggestedPriority: string;
  suggestedCategory: string;
  sentiment: string;
  confidence: number;
  suggestedTags: string[];
  suggestedActions: string[];
}

export default function NewTicketPage() {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentTag, setCurrentTag] = useState("");
  
  const [formData, setFormData] = useState<TicketFormData>({
    title: "",
    description: "",
    customerId: "",
    assignedAgentId: "",
    category: "",
    priority: "medium",
    tags: [],
  });

  const handleInputChange = (field: keyof TicketFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Trigger AI analysis when title or description changes
    if ((field === 'title' || field === 'description') && value.length > 10) {
      triggerAIAnalysis();
    }
  };

  const triggerAIAnalysis = async () => {
    if (!formData.title && !formData.description) return;
    
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      const mockAnalysis: AIAnalysis = {
        suggestedPriority: "high",
        suggestedCategory: "technical",
        sentiment: "frustrated",
        confidence: 0.87,
        suggestedTags: ["mobile", "authentication", "urgent"],
        suggestedActions: [
          "Check authentication service logs",
          "Test on multiple devices",
          "Review recent app updates"
        ]
      };
      setAiAnalysis(mockAnalysis);
      setIsAnalyzing(false);
    }, 2000);
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const applySuggestion = (field: keyof TicketFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Here you would typically send the data to your API
      console.log("Creating ticket:", formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Redirect to tickets list or the new ticket detail page
      router.push('/tickets');
    } catch (error) {
      console.error("Error creating ticket:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.title && formData.description && formData.customerId;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/tickets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t('tickets.createNew')}</h1>
            <p className="text-muted-foreground">{t('tickets.createNewDescription')}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t('tickets.basicInformation')}</CardTitle>
                <CardDescription>{t('tickets.basicInformationDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('tickets.title')} *</Label>
                  <Input
                    id="title"
                    placeholder={t('tickets.titlePlaceholder')}
                    value={formData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('title', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">{t('tickets.description')} *</Label>
                  <Textarea
                    id="description"
                    placeholder={t('tickets.descriptionPlaceholder')}
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                    className="min-h-[120px]"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('tickets.category')}</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('tickets.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('tickets.priority')}</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>{t('tickets.assignment')}</CardTitle>
                <CardDescription>{t('tickets.assignmentDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('tickets.customer')} *</Label>
                  <Select value={formData.customerId} onValueChange={(value) => handleInputChange('customerId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('tickets.selectCustomer')} />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCustomers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {customer.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.email}</p>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('tickets.assignedAgent')}</Label>
                  <Select value={formData.assignedAgentId} onValueChange={(value) => handleInputChange('assignedAgentId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('tickets.selectAgent')} />
                    </SelectTrigger>
                    <SelectContent>
                      {mockAgents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {agent.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{agent.name}</p>
                              <p className="text-xs text-muted-foreground">{agent.email}</p>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>{t('tickets.tags')}</CardTitle>
                <CardDescription>{t('tickets.tagsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder={t('tickets.addTag')}
                    value={currentTag}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    {t('common.add')}
                  </Button>
                </div>
                
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                        <span className="ml-1 text-xs">×</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="h-5 w-5 mr-2" />
                  {t('tickets.aiAnalysis')}
                </CardTitle>
                <CardDescription>
                  {isAnalyzing ? t('tickets.analyzingContent') : t('tickets.aiAnalysisDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAnalyzing ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t('tickets.suggestedPriority')}</Label>
                      <div className="flex items-center justify-between">
                        <span className="capitalize font-medium">{aiAnalysis.suggestedPriority}</span>
                        <Button 
                          type="button"
                          size="sm" 
                          variant="outline"
                          onClick={() => applySuggestion('priority', aiAnalysis.suggestedPriority)}
                        >
                          {t('common.apply')}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t('tickets.suggestedCategory')}</Label>
                      <div className="flex items-center justify-between">
                        <span className="capitalize font-medium">{aiAnalysis.suggestedCategory}</span>
                        <Button 
                          type="button"
                          size="sm" 
                          variant="outline"
                          onClick={() => applySuggestion('category', aiAnalysis.suggestedCategory)}
                        >
                          {t('common.apply')}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t('tickets.sentiment')}</Label>
                      <span className="capitalize font-medium">{aiAnalysis.sentiment}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t('tickets.confidence')}</Label>
                      <span className="font-medium">{(aiAnalysis.confidence * 100).toFixed(0)}%</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t('tickets.suggestedTags')}</Label>
                      <div className="flex flex-wrap gap-1">
                        {aiAnalysis.suggestedTags.map((tag) => (
                          <Badge 
                            key={tag} 
                            variant="outline" 
                            className="cursor-pointer text-xs"
                            onClick={() => applySuggestion('tags', [...formData.tags, tag])}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t('tickets.suggestedActions')}</Label>
                      <ul className="text-sm space-y-1">
                        {aiAnalysis.suggestedActions.map((action, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-muted-foreground mr-2">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">{t('tickets.enterContentForAnalysis')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('tickets.actions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!isFormValid || isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('tickets.creating')}
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('tickets.createTicket')}
                    </>
                  )}
                </Button>
                
                <Button type="button" variant="outline" className="w-full" asChild>
                  <Link href="/tickets">
                    {t('common.cancel')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}