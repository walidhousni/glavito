'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  Clock, 
  Calendar, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Save,
  RotateCcw,
  Bell,
  Globe,
  Users
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/lib/store/auth-store';

// Mock availability data for demonstration
const mockAvailabilityData = {
  status: 'available' as const,
  workingHours: {
    timezone: 'America/New_York',
    schedule: {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '10:00', end: '14:00', enabled: false },
      sunday: { start: '10:00', end: '14:00', enabled: false }
    }
  },
  autoAssignment: true,
  maxConcurrentTickets: 5,
  breakTime: {
    enabled: true,
    duration: 15, // minutes
    frequency: 120 // every 2 hours
  },
  notifications: {
    newTickets: true,
    escalations: true,
    mentions: true,
    breaks: false
  },
  awayMessage: 'I am currently away from my desk. I will respond to your message as soon as possible.',
  currentTicketCount: 3
};

const statusOptions = [
  { value: 'available', label: 'Available', icon: CheckCircle, color: 'text-green-600' },
  { value: 'busy', label: 'Busy', icon: AlertCircle, color: 'text-yellow-600' },
  { value: 'away', label: 'Away', icon: Clock, color: 'text-orange-600' },
  { value: 'offline', label: 'Offline', icon: XCircle, color: 'text-red-600' }
];

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
];

export default function AvailabilityPage() {
  const t = useTranslations();
  const { user } = useAuthStore();
  const [availability, setAvailability] = useState(mockAvailabilityData);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Use mock data for now, replace with actual hook when API is ready
  // const { availability, updateAvailability, isLoading, error } = useAgentAvailability(user?.id);
  const isLoading = false;
  const error = null;

  const handleStatusChange = (status: string) => {
    setAvailability(prev => ({ ...prev, status: status as any }));
    setHasChanges(true);
  };

  const handleScheduleChange = (day: string, field: string, value: string | boolean) => {
    setAvailability(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        schedule: {
          ...prev.workingHours.schedule,
          [day]: {
            ...prev.workingHours.schedule[day as keyof typeof prev.workingHours.schedule],
            [field]: value
          }
        }
      }
    }));
    setHasChanges(true);
  };

  const handleSettingChange = (field: string, value: any) => {
    setAvailability(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setAvailability(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Implement save logic here
    console.log('Saving availability:', availability);
    setHasChanges(false);
  };

  const handleReset = () => {
    setAvailability(mockAvailabilityData);
    setHasChanges(false);
  };

  const currentStatus = statusOptions.find(option => option.value === availability.status);
  const StatusIcon = currentStatus?.icon || CheckCircle;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Availability Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your status, working hours, and notification preferences
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button 
            onClick={handleSave}
            disabled={!hasChanges}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Current Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <StatusIcon className={`h-5 w-5 ${currentStatus?.color}`} />
              <span>Current Status</span>
            </CardTitle>
            <CardDescription>
              Your current availability status affects ticket assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = availability.status === option.value;
                return (
                  <div
                    key={option.value}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => handleStatusChange(option.value)}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${option.color}`} />
                      <span className="font-medium">{option.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-assignment">Auto Assignment</Label>
                <Switch
                  id="auto-assignment"
                  checked={availability.autoAssignment}
                  onCheckedChange={(checked: boolean) => handleSettingChange('autoAssignment', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-tickets">Max Concurrent Tickets</Label>
                <Input
                  id="max-tickets"
                  type="number"
                  min="1"
                  max="20"
                  value={availability.maxConcurrentTickets}
                  onChange={(e) => handleSettingChange('maxConcurrentTickets', parseInt(e.target.value))}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Current Load: {availability.currentTicketCount}/{availability.maxConcurrentTickets}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Working Hours */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Working Hours</span>
            </CardTitle>
            <CardDescription>
              Set your availability schedule and timezone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Timezone */}
              <div className="flex items-center space-x-4">
                <Globe className="h-4 w-4 text-gray-500" />
                <div className="flex-1">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={availability.workingHours.timezone} 
                    onValueChange={(value) => handleSettingChange('workingHours', {
                      ...availability.workingHours,
                      timezone: value
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-4">
                <h4 className="font-medium">Weekly Schedule</h4>
                {daysOfWeek.map((day) => {
                  const schedule = availability.workingHours.schedule[day.key as keyof typeof availability.workingHours.schedule];
                  return (
                    <div key={day.key} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="w-20">
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={(checked: boolean) => handleScheduleChange(day.key, 'enabled', checked)}
                        />
                      </div>
                      <div className="w-24 font-medium">{day.label}</div>
                      <div className="flex items-center space-x-2 flex-1">
                        <Input
                          type="time"
                          value={schedule.start}
                          onChange={(e) => handleScheduleChange(day.key, 'start', e.target.value)}
                          disabled={!schedule.enabled}
                          className="w-32"
                        />
                        <span className="text-gray-500">to</span>
                        <Input
                          type="time"
                          value={schedule.end}
                          onChange={(e) => handleScheduleChange(day.key, 'end', e.target.value)}
                          disabled={!schedule.enabled}
                          className="w-32"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications & Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
              </CardTitle>
              <CardDescription>
                Choose which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="new-tickets">New Ticket Assignments</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Get notified when new tickets are assigned to you</p>
                  </div>
                  <Switch
                    id="new-tickets"
                    checked={availability.notifications.newTickets}
                    onCheckedChange={(checked: boolean) => handleNotificationChange('newTickets', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="escalations">Escalations</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Get notified about ticket escalations</p>
                  </div>
                  <Switch
                    id="escalations"
                    checked={availability.notifications.escalations}
                    onCheckedChange={(checked: boolean) => handleNotificationChange('escalations', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="mentions">Mentions</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Get notified when you&apos;re mentioned in comments</p>
                  </div>
                  <Switch
                    id="mentions"
                    checked={availability.notifications.mentions}
                    onCheckedChange={(checked: boolean) => handleNotificationChange('mentions', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="breaks">Break Reminders</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Get reminded to take breaks</p>
                  </div>
                  <Switch
                    id="breaks"
                    checked={availability.notifications.breaks}
                    onCheckedChange={(checked: boolean) => handleNotificationChange('breaks', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Additional Settings</span>
              </CardTitle>
              <CardDescription>
                Configure break times and away messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Break Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="break-enabled">Enable Break Reminders</Label>
                    <Switch
                      id="break-enabled"
                      checked={availability.breakTime.enabled}
                      onCheckedChange={(checked: boolean) => handleSettingChange('breakTime', {
                        ...availability.breakTime,
                        enabled: checked
                      })}
                    />
                  </div>
                  
                  {availability.breakTime.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="break-duration">Break Duration (minutes)</Label>
                        <Input
                          id="break-duration"
                          type="number"
                          min="5"
                          max="60"
                          value={availability.breakTime.duration}
                          onChange={(e) => handleSettingChange('breakTime', {
                            ...availability.breakTime,
                            duration: parseInt(e.target.value)
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="break-frequency">Frequency (minutes)</Label>
                        <Input
                          id="break-frequency"
                          type="number"
                          min="30"
                          max="480"
                          value={availability.breakTime.frequency}
                          onChange={(e) => handleSettingChange('breakTime', {
                            ...availability.breakTime,
                            frequency: parseInt(e.target.value)
                          })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Away Message */}
                <div className="space-y-2">
                  <Label htmlFor="away-message">Away Message</Label>
                  <Textarea
                    id="away-message"
                    placeholder="Enter a message to display when you're away..."
                    value={availability.awayMessage}
                    onChange={(e) => handleSettingChange('awayMessage', e.target.value)}
                    rows={3}
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This message will be shown to customers when you&apos;re not available
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}