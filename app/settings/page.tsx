'use client';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Bell, Download, Upload, Trash2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AppSettings {
  notifications_enabled: string;
  notification_offset: string;
  schedule_start: string;
  schedule_end: string;
  slot_interval: string;
  staleness_amber: string;
  staleness_red: string;
  theme: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  notifications_enabled: 'false',
  notification_offset: '10',
  schedule_start: '07:00',
  schedule_end: '18:00',
  slot_interval: '30',
  staleness_amber: '4',
  staleness_red: '6',
  theme: 'system',
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => {});
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const saveSetting = async (key: string, value: string) => {
    const prev = settings[key as keyof AppSettings];
    setSettings(s => ({ ...s, [key]: value }));
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error();
      toast.success('Setting saved');
    } catch {
      setSettings(s => ({ ...s, [key]: prev }));
      toast.error('Failed to save setting');
    }
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      // On iOS, Notification API only exists when running as a home screen PWA
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isIOSStandalone = 'standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true;
      if (isIOS && !isIOSStandalone) {
        toast.error('Open the app from your Home Screen icon to enable notifications', { duration: 5000 });
      } else {
        toast.error('Notifications are not supported in this browser');
      }
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      await saveSetting('notifications_enabled', 'true');
      toast.success('Notifications enabled!');
    } else {
      toast.error('Notification permission denied. Check Settings → Notifications to allow them.');
    }
  };

  const exportData = () => {
    window.location.href = '/api/export';
    toast.success('Export started');
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('This will replace ALL existing data. Are you sure?\n\nThis action cannot be undone.')) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Data imported successfully');
    } catch (e) {
      toast.error('Import failed: ' + String(e));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearAllData = async () => {
    const first = confirm('⚠️ This will permanently delete ALL data including schedules, goals, and responses.\n\nAre you sure?');
    if (!first) return;
    const second = confirm('⚠️ Final confirmation: Delete everything?\n\nThis CANNOT be undone.');
    if (!second) return;
    try {
      await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: '1.0.0', activities: [], activity_defaults: [], schedule_entries: [], activity_usage_log: [], goals: [], goal_subcategories: [], goal_responses: [], app_settings: [] }),
      });
      toast.success('All data cleared');
    } catch {
      toast.error('Failed to clear data');
    }
  };

  return (
    <div id="settings-page" className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Notifications */}
      <Card id="settings-notifications">
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-red-600" /> Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="settings-notif-toggle">Activity Reminders</Label>
              <p className="text-xs text-gray-500 mt-0.5">
                {notifPermission === 'granted' ? 'Notifications are allowed' : 'Click Enable to request permission'}
              </p>
            </div>
            {notifPermission === 'granted' ? (
              <Switch
                id="settings-notif-toggle"
                checked={settings.notifications_enabled === 'true'}
                onCheckedChange={v => saveSetting('notifications_enabled', String(v))}
              />
            ) : (
              <Button id="settings-notif-enable" size="sm" onClick={requestNotifications}>
                Enable
              </Button>
            )}
          </div>

          {settings.notifications_enabled === 'true' && (
            <div className="flex items-center gap-4">
              <Label htmlFor="settings-notif-offset">Remind me</Label>
              <Select value={settings.notification_offset}
                onValueChange={v => saveSetting('notification_offset', v)}>
                <SelectTrigger id="settings-notif-offset" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 30].map(m => (
                    <SelectItem key={m} value={String(m)}>{m} min before</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-xs text-gray-400 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            💡 <strong>iPhone/iPad:</strong> Notifications require the app to be added to your Home Screen and opened from there — not from Safari. Tap Share → Add to Home Screen, then reopen the app and enable reminders.
          </p>
        </CardContent>
      </Card>

      {/* Schedule Defaults */}
      <Card id="settings-schedule">
        <CardHeader><CardTitle>Schedule Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="settings-start-time">Day Start Time</Label>
              <input
                id="settings-start-time"
                type="time"
                value={settings.schedule_start}
                onChange={e => saveSetting('schedule_start', e.target.value)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm mt-1"
              />
            </div>
            <div>
              <Label htmlFor="settings-end-time">Day End Time</Label>
              <input
                id="settings-end-time"
                type="time"
                value={settings.schedule_end}
                onChange={e => saveSetting('schedule_end', e.target.value)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="settings-slot-interval">Time Slot Interval</Label>
            <Select value={settings.slot_interval} onValueChange={v => saveSetting('slot_interval', v)}>
              <SelectTrigger id="settings-slot-interval" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Staleness Thresholds */}
      <Card id="settings-staleness">
        <CardHeader><CardTitle>Activity Staleness Warnings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="settings-amber-weeks">Amber Warning (weeks)</Label>
              <input
                id="settings-amber-weeks"
                type="number" min="1" max="20"
                value={settings.staleness_amber}
                onChange={e => saveSetting('staleness_amber', e.target.value)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">Default: 4 weeks</p>
            </div>
            <div>
              <Label htmlFor="settings-red-weeks">Red Warning (weeks)</Label>
              <input
                id="settings-red-weeks"
                type="number" min="1" max="20"
                value={settings.staleness_red}
                onChange={e => saveSetting('staleness_red', e.target.value)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">Default: 6 weeks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card id="settings-theme">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sun className="h-5 w-5 text-red-600" /> Appearance</CardTitle></CardHeader>
        <CardContent>
          <div id="settings-theme-toggle" className="flex rounded-lg border overflow-hidden w-fit">
            {[
              { value: 'light', icon: Sun, label: 'Light' },
              { value: 'dark', icon: Moon, label: 'Dark' },
              { value: 'system', icon: Monitor, label: 'System' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                id={`settings-theme-${value}`}
                onClick={() => { setTheme(value); saveSetting('theme', value); }}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium min-h-[44px] transition-colors ${
                  theme === value
                    ? 'bg-red-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card id="settings-data">
        <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-red-600" /> Data Management</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button id="settings-export" variant="outline" className="w-full justify-start" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" /> Export all data as JSON
          </Button>

          <div>
            <input
              ref={fileInputRef}
              id="settings-import-input"
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
            />
            <Button
              id="settings-import"
              variant="outline"
              className="w-full justify-start"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" /> Import from JSON backup
            </Button>
          </div>

          <Button
            id="settings-clear"
            variant="outline"
            className="w-full justify-start text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
            onClick={clearAllData}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Clear all data
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card id="settings-about">
        <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-gray-400" /> About</CardTitle></CardHeader>
        <CardContent className="text-sm text-gray-500 space-y-1">
          <p><strong>Horizons of Hope</strong> v1.0.0</p>
          <p>Daily activity scheduler and behavioral data tracker for care providers.</p>
          <p className="text-xs">Built for Horizons of Hope · Runs fully offline</p>
        </CardContent>
      </Card>
    </div>
  );
}
