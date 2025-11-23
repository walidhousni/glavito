'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { dashboardsApi, DashboardLayout } from '@/lib/api/analytics-client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Plus, X, GripVertical } from 'lucide-react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-grid-layout/css/styles.css';
import {
  MetricCardWidget,
  LineChartWidget,
  BarChartWidget,
  PieChartWidget,
  TableWidget,
} from '@/components/analytics/widgets';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WIDGET_TYPES = [
  { value: 'metric', label: 'Metric Card', icon: 'https://img.icons8.com/fluency/48/activity-feed.png' },
  { value: 'line', label: 'Line Chart', icon: 'https://img.icons8.com/fluency/48/line-chart.png' },
  { value: 'bar', label: 'Bar Chart', icon: 'https://img.icons8.com/fluency/48/bar-chart.png' },
  { value: 'pie', label: 'Pie Chart', icon: 'https://img.icons8.com/fluency/48/doughnut-chart.png' },
  { value: 'table', label: 'Table', icon: 'https://img.icons8.com/fluency/48/table.png' },
];

const MOCK_DATA = {
  lineData: [
    { name: 'Mon', tickets: 45, resolved: 40 },
    { name: 'Tue', tickets: 52, resolved: 48 },
    { name: 'Wed', tickets: 48, resolved: 45 },
    { name: 'Thu', tickets: 61, resolved: 55 },
    { name: 'Fri', tickets: 55, resolved: 50 },
    { name: 'Sat', tickets: 32, resolved: 30 },
    { name: 'Sun', tickets: 28, resolved: 26 },
  ],
  pieData: [
    { name: 'Open', value: 35, color: '#3b82f6' },
    { name: 'In Progress', value: 25, color: '#f59e0b' },
    { name: 'Resolved', value: 30, color: '#10b981' },
    { name: 'Closed', value: 10, color: '#6b7280' },
  ],
  tableData: [
    { agent: 'John Doe', tickets: 45, avgTime: '2.5h', satisfaction: '4.8' },
    { agent: 'Jane Smith', tickets: 38, avgTime: '3.1h', satisfaction: '4.6' },
    { agent: 'Bob Johnson', tickets: 42, avgTime: '2.8h', satisfaction: '4.7' },
  ],
};

export default function DashboardEditPage() {
  const router = useRouter();
  const params = useParams();
  const dashboardId = params.id as string;

  const [dashboard, setDashboard] = useState<DashboardLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [selectedWidgetType, setSelectedWidgetType] = useState('metric');

  useEffect(() => {
    loadDashboard();
  }, [dashboardId]);

  const loadDashboard = async () => {
    try {
      const data = await dashboardsApi.getById(dashboardId);
      setDashboard(data);
      setLayouts(data.layout || []);
      setWidgets(data.widgets || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayouts(newLayout);
  };

  const handleSave = async () => {
    if (!dashboard) return;

    setSaving(true);
    try {
      await dashboardsApi.update(dashboard.id, {
        layout: layouts,
        widgets,
      });
      toast({
        title: 'Success',
        description: 'Dashboard saved successfully',
      });
      router.push('/dashboard/analytics/dashboards');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save dashboard',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddWidget = () => {
    const newWidget = {
      i: `widget-${Date.now()}`,
      type: selectedWidgetType,
      title: `New ${selectedWidgetType} Widget`,
      config: {},
    };

    const newLayout: Layout = {
      i: newWidget.i,
      x: 0,
      y: Infinity,
      w: selectedWidgetType === 'metric' ? 3 : 6,
      h: selectedWidgetType === 'metric' ? 2 : 4,
      minW: 2,
      minH: 2,
    };

    setWidgets([...widgets, newWidget]);
    setLayouts([...layouts, newLayout]);
    setShowAddWidget(false);
  };

  const handleRemoveWidget = (widgetId: string) => {
    setWidgets(widgets.filter((w) => w.i !== widgetId));
    setLayouts(layouts.filter((l) => l.i !== widgetId));
  };

  const renderWidget = (widget: any) => {
    switch (widget.type) {
      case 'metric':
        return (
          <MetricCardWidget
            title={widget.title || 'Total Tickets'}
            value={245}
            trend="up"
            trendValue={12}
            icon="https://img.icons8.com/fluency/48/activity-feed.png"
          />
        );
      case 'line':
        return (
          <LineChartWidget
            title={widget.title || 'Ticket Trends'}
            data={MOCK_DATA.lineData}
            lines={[
              { dataKey: 'tickets', color: '#3b82f6', name: 'Tickets' },
              { dataKey: 'resolved', color: '#10b981', name: 'Resolved' },
            ]}
            height={250}
          />
        );
      case 'bar':
        return (
          <BarChartWidget
            title={widget.title || 'Weekly Overview'}
            data={MOCK_DATA.lineData}
            bars={[{ dataKey: 'tickets', color: '#3b82f6', name: 'Tickets' }]}
            height={250}
          />
        );
      case 'pie':
        return (
          <PieChartWidget
            title={widget.title || 'Ticket Status'}
            data={MOCK_DATA.pieData}
            height={250}
          />
        );
      case 'table':
        return (
          <TableWidget
            title={widget.title || 'Agent Performance'}
            columns={[
              { key: 'agent', label: 'Agent' },
              { key: 'tickets', label: 'Tickets', align: 'right' },
              { key: 'avgTime', label: 'Avg Time', align: 'right' },
              { key: 'satisfaction', label: 'Rating', align: 'right' },
            ]}
            data={MOCK_DATA.tableData}
          />
        );
      default:
        return <div>Unknown widget type</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Dashboard</h1>
          <p className="text-muted-foreground">{dashboard?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Dashboard
          </Button>
        </div>
      </div>

      {showAddWidget ? (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label>Widget Type</Label>
              <Select value={selectedWidgetType} onValueChange={setSelectedWidgetType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <img src={type.icon} alt="" className="h-5 w-5" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleAddWidget}>
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
              <Button variant="outline" onClick={() => setShowAddWidget(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setShowAddWidget(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Widget
        </Button>
      )}

      <div className="border rounded-lg p-4 bg-muted/10">
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layouts }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
        >
          {widgets.map((widget) => (
            <div key={widget.i} className="relative">
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="drag-handle cursor-move h-6 w-6 p-0"
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveWidget(widget.i)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {renderWidget(widget)}
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}

