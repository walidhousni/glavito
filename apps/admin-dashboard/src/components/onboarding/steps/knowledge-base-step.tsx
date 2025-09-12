'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  Tag,
  Eye,
  EyeOff,
  Upload
} from 'lucide-react';

interface KnowledgeBaseStepProps {
  data: any;
  onComplete: (data: any) => Promise<void>;
  isLoading: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
}

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  order: number;
}

export function KnowledgeBaseStep({ data, onComplete, isLoading }: KnowledgeBaseStepProps) {
  const t = useTranslations('onboarding.steps.knowledgeBase');
  const tn = useTranslations('onboarding');
  const tr = (key: string, fallback: string) => {
    try {
      const value = t(key as any);
      return value === key ? fallback : value;
    } catch {
      return fallback;
    }
  };
  
  const [categories, setCategories] = useState<Category[]>(
    data.categories || [
      {
        id: 'getting-started',
        name: tr('defaultCategories.gettingStarted.name', 'Getting Started'),
        description: tr('defaultCategories.gettingStarted.description', 'Help new users get started'),
        icon: '🚀',
        order: 1,
      },
      {
        id: 'account-billing',
        name: tr('defaultCategories.accountBilling.name', 'Account & Billing'),
        description: tr('defaultCategories.accountBilling.description', 'Account management and billing questions'),
        icon: '💳',
        order: 2,
      },
      {
        id: 'technical-support',
        name: tr('defaultCategories.technicalSupport.name', 'Technical Support'),
        description: tr('defaultCategories.technicalSupport.description', 'Technical issues and troubleshooting'),
        icon: '🔧',
        order: 3,
      },
    ]
  );

  const [articles, setArticles] = useState<Article[]>(
    data.articles || [
      {
        id: 'welcome-article',
        title: tr('defaultArticles.welcome.title', 'Welcome to Our Support Center'),
        content: tr('defaultArticles.welcome.content', "Welcome! Here you'll find helpful articles and resources to get the most out of our service. If you can't find what you're looking for, don't hesitate to contact our support team."),
        category: 'getting-started',
        tags: ['welcome', 'introduction'],
        isPublished: true,
        order: 1,
      },
    ]
  );

  const [newCategory, setNewCategory] = useState({ name: '', description: '', icon: '📁' });
  const [newArticle, setNewArticle] = useState({ 
    title: '', 
    content: '', 
    category: '', 
    tags: '',
    isPublished: true 
  });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [importOption, setImportOption] = useState<'manual' | 'template' | 'import'>('manual');

  const addCategory = () => {
    if (!newCategory.name.trim()) return;

    const category: Category = {
      id: newCategory.name.toLowerCase().replace(/\s+/g, '-'),
      name: newCategory.name,
      description: newCategory.description,
      icon: newCategory.icon,
      order: categories.length + 1,
    };

    setCategories([...categories, category]);
    setNewCategory({ name: '', description: '', icon: '📁' });
    setShowAddCategory(false);
  };

  const addArticle = () => {
    if (!newArticle.title.trim() || !newArticle.category) return;

    const article: Article = {
      id: newArticle.title.toLowerCase().replace(/\s+/g, '-'),
      title: newArticle.title,
      content: newArticle.content,
      category: newArticle.category,
      tags: newArticle.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      isPublished: newArticle.isPublished,
      order: articles.filter(a => a.category === newArticle.category).length + 1,
    };

    setArticles([...articles, article]);
    setNewArticle({ title: '', content: '', category: '', tags: '', isPublished: true });
    setShowAddArticle(false);
  };

  const removeCategory = (categoryId: string) => {
    setCategories(categories.filter(c => c.id !== categoryId));
    setArticles(articles.filter(a => a.category !== categoryId));
  };

  const removeArticle = (articleId: string) => {
    setArticles(articles.filter(a => a.id !== articleId));
  };

  const toggleArticlePublished = (articleId: string) => {
    setArticles(articles.map(article => 
      article.id === articleId 
        ? { ...article, isPublished: !article.isPublished }
        : article
    ));
  };

  const handleSubmit = async () => {
    const knowledgeBaseData = {
      categories,
      articles,
      settings: {
        searchEnabled: true,
        categoriesEnabled: true,
        ratingsEnabled: true,
        commentsEnabled: false,
        suggestionsEnabled: true,
      },
      searchKeywords: articles.flatMap(a => [...a.tags, ...a.title.split(' ')]),
    };

    await onComplete(knowledgeBaseData);
  };

  const publishedArticles = articles.filter(a => a.isPublished);
  const totalArticles = articles.length;

  return (
    <div className="space-y-6">
      {/* Knowledge Base Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <CardTitle>{tr('overview.title', 'Knowledge Base Overview')}</CardTitle>
          </div>
          <CardDescription>
            {tr('overview.description', 'Build a comprehensive knowledge base to help customers and agents')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
              <div className="text-sm text-gray-600">{tr('overview.categories', 'categories')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalArticles}</div>
              <div className="text-sm text-gray-600">{tr('overview.articles', 'articles')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{publishedArticles.length}</div>
              <div className="text-sm text-gray-600">{tr('overview.published', 'published')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Options */}
      <Card>
        <CardHeader>
          <CardTitle>{tr('setup.title', 'Setup Options')}</CardTitle>
          <CardDescription>{tr('setup.description', 'Choose how you want to create your knowledge base')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                importOption === 'manual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setImportOption('manual')}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Edit3 className="w-5 h-5 text-primary" />
                <h3 className="font-medium">{tr('setup.manual.title', 'Manual Setup')}</h3>
              </div>
              <p className="text-sm text-gray-600">{tr('setup.manual.description', 'Create categories and articles manually')}</p>
            </div>

            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                importOption === 'template' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setImportOption('template')}
            >
              <div className="flex items-center space-x-2 mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-medium">{tr('setup.template.title', 'Use Template')}</h3>
              </div>
              <p className="text-sm text-gray-600">{tr('setup.template.description', 'Start with industry-specific templates')}</p>
            </div>

            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                importOption === 'import' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setImportOption('import')}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Upload className="w-5 h-5 text-primary" />
                <h3 className="font-medium">{tr('setup.import.title', 'Import Existing')}</h3>
              </div>
              <p className="text-sm text-gray-600">{tr('setup.import.description', 'Import from your current knowledge base')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{tr('categories.title', 'Categories')}</CardTitle>
              <CardDescription>{tr('categories.description', 'Organize your articles into categories')}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCategory(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {tr('categories.add', 'Add Category')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                      <Badge variant="secondary" className="mt-2">
                        {articles.filter(a => a.category === category.id).length} {tr('categories.articles', 'articles')}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCategory(category.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {showAddCategory && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium mb-3">{tr('categories.addNew', 'Add New Category')}</h3>
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="category-name">{tr('categories.fields.name', 'Category Name')}</Label>
                    <Input
                      id="category-name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder={tr('categories.placeholders.name', 'e.g., Getting Started')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-icon">{tr('categories.fields.icon', 'Icon')}</Label>
                    <Input
                      id="category-icon"
                      value={newCategory.icon}
                      onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                      placeholder="📁"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="category-description">{tr('categories.fields.description', 'Description')}</Label>
                  <Input
                    id="category-description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    placeholder={tr('categories.placeholders.description', 'Brief description of this category')}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={addCategory} size="sm">
                    {tr('categories.save', 'Save Category')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddCategory(false)}
                  >
                    {tn('navigation.previous')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Articles Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{tr('articles.title', 'Articles')}</CardTitle>
              <CardDescription>{tr('articles.description', 'Create helpful articles for your customers')}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddArticle(true)}
              disabled={categories.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              {tr('articles.add', 'Add Article')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {articles.map((article) => (
              <div key={article.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium">{article.title}</h3>
                      <Badge variant="outline">
                        {categories.find(c => c.id === article.category)?.name}
                      </Badge>
                      {article.isPublished ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <Eye className="w-3 h-3 mr-1" />
                          {tr('articles.published', 'Published')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="w-3 h-3 mr-1" />
                          {tr('articles.draft', 'Draft')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {article.content.substring(0, 150)}...
                    </p>
                    <div className="flex items-center space-x-2">
                      {article.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleArticlePublished(article.id)}
                    >
                      {article.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArticle(article.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showAddArticle && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium mb-3">{tr('articles.addNew', 'Add New Article')}</h3>
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="article-title">{tr('articles.fields.title', 'Article Title')}</Label>
                    <Input
                      id="article-title"
                      value={newArticle.title}
                      onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                      placeholder={tr('articles.placeholders.title', 'e.g., How to reset your password')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="article-category">{tr('articles.fields.category', 'Category')}</Label>
                    <select
                      id="article-category"
                      value={newArticle.category}
                      onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">{tr('articles.placeholders.selectCategory', 'Select a category')}</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="article-content">{tr('articles.fields.content', 'Content')}</Label>
                  <textarea
                    id="article-content"
                    value={newArticle.content}
                    onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                    placeholder={tr('articles.placeholders.content', 'Write your article content here...')}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <Label htmlFor="article-tags">{tr('articles.fields.tags', 'Tags')}</Label>
                  <Input
                    id="article-tags"
                    value={newArticle.tags}
                    onChange={(e) => setNewArticle({ ...newArticle, tags: e.target.value })}
                    placeholder={tr('articles.placeholders.tags', 'password, reset, account (comma separated)')}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="article-published"
                    checked={newArticle.isPublished}
                    onChange={(e) => setNewArticle({ ...newArticle, isPublished: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="article-published">{tr('articles.fields.published', 'Publish immediately')}</Label>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={addArticle} size="sm">
                    {tr('articles.save', 'Save Article')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddArticle(false)}
                  >
                    {tn('navigation.previous')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || categories.length === 0}
          size="lg"
        >
          {isLoading ? tn('loading.saving') : tn('navigation.next')}
        </Button>
      </div>
    </div>
  );
}