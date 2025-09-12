'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Settings, 
  Bell, 
  Search,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MessageCircle
} from 'lucide-react';

interface DashboardPreviewProps {
  variant?: 'onboarding' | 'completion';
}

export function DashboardPreview({ variant = 'onboarding' }: DashboardPreviewProps) {
  const t = useTranslations('onboarding.preview');

  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', active: true },
    { icon: MessageSquare, label: 'Tickets', active: false },
    { icon: Users, label: 'Customers', active: false },
    { icon: BarChart3, label: 'Analytics', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  const recentTickets = [
    { id: '#1234', customer: 'John Doe', status: 'open', priority: 'high', time: '2m ago' },
    { id: '#1233', customer: 'Jane Smith', status: 'pending', priority: 'medium', time: '5m ago' },
    { id: '#1232', customer: 'Bob Wilson', status: 'closed', priority: 'low', time: '1h ago' },
  ];

  const metrics = [
    { label: 'Open Tickets', value: '24', trend: '+12%', color: 'text-blue-600' },
    { label: 'Response Time', value: '2.3h', trend: '-8%', color: 'text-green-600' },
    { label: 'Satisfaction', value: '4.8', trend: '+5%', color: 'text-purple-600' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm h-full p-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b mb-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-600 to-purple-600"></div>
          <span className="text-sm font-semibold text-gray-900">Glavito</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
            <Bell className="h-3 w-3 text-gray-600" />
          </div>
          <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
            <Search className="h-3 w-3 text-gray-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100%-4rem)]">
        {/* Sidebar */}
        <div className="col-span-4 border-r pr-4 space-y-1">
          <div className="text-xs font-medium text-gray-500 mb-2">{t('navigation')}</div>
          {sidebarItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                item.active 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="h-3 w-3" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="col-span-8 space-y-4">
          {/* Welcome Header */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {variant === 'completion' ? t('welcomeCompletion') : t('welcomeOnboarding')}
            </h3>
            <p className="text-xs text-gray-500">
              {variant === 'completion' 
                ? t('descriptionCompletion')
                : t('descriptionOnboarding')
              }
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2">
            {metrics.map((metric, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 text-center">
                <div className={`text-lg font-bold ${metric.color}`}>{metric.value}</div>
                <div className="text-xs text-gray-600">{metric.label}</div>
                <div className="text-xs text-green-600 flex items-center justify-center gap-1">
                  <TrendingUp className="h-2 w-2" />
                  {metric.trend}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Tickets */}
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2">{t('recentTickets')}</h4>
            <div className="space-y-2">
              {recentTickets.map((ticket, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-900">{ticket.id}</span>
                    <span className="text-xs text-gray-500">{ticket.time}</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">{ticket.customer}</div>
                  <div className="flex items-center justify-between">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <span className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2">{t('quickActions')}</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <MessageSquare className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <div className="text-xs text-blue-700">{t('newTicket')}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <Users className="h-4 w-4 text-green-600 mx-auto mb-1" />
                <div className="text-xs text-green-700">{t('addCustomer')}</div>
              </div>
            </div>
          </div>

          {/* Channel Status */}
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2">{t('channels')}</h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3 text-green-600" />
                  <span>WhatsApp</span>
                </div>
                <CheckCircle className="h-3 w-3 text-green-600" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-blue-600" />
                  <span>Email</span>
                </div>
                <CheckCircle className="h-3 w-3 text-green-600" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-purple-600" />
                  <span>Phone</span>
                </div>
                <AlertCircle className="h-3 w-3 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
