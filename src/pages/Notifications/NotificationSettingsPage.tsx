import { useState } from 'react';
import { Mail, Layout, Save } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useStore } from '../../store';
import type { NotificationType } from '../../types';

const notificationLabels: Record<NotificationType, string> = {
  low_balance: 'Low Balance Alerts',
  payment_received: 'Payment Received',
  payment_reminder: 'Payment Reminders (Mon & Thu)',
  invoice_generated: 'Invoice Generation',
  rate_update: 'Rate Updates',
  channel_disconnect: 'Channel Disconnect',
  campaign_complete: 'Campaign Completion',
  dlr_failure: 'DLR Failure Alerts'
};

export function NotificationSettingsPage() {
  const { notificationSettings, updateNotificationSetting } = useStore();
  const [saved, setSaved] = useState(false);

  const handleToggle = (id: string, field: 'emailEnabled' | 'dashboardEnabled', value: boolean) => {
    updateNotificationSetting(id, { [field]: value });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
          <p className="text-gray-500">Configure alert preferences</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <div className="space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
            <div className="flex-1" />
            <div className="w-24 text-center">
              <Mail className="w-5 h-5 mx-auto text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Email</span>
            </div>
            <div className="w-24 text-center">
              <Layout className="w-5 h-5 mx-auto text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Dashboard</span>
            </div>
          </div>

          {notificationSettings.map((setting) => (
            <div key={setting.id} className="flex items-center gap-4 py-2">
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {notificationLabels[setting.notificationType]}
                </p>
              </div>
              <div className="w-24 flex justify-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setting.emailEnabled}
                    onChange={(e) => handleToggle(setting.id, 'emailEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="w-24 flex justify-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setting.dashboardEnabled}
                    onChange={(e) => handleToggle(setting.id, 'dashboardEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Low Balance Threshold */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Balance Threshold</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alert when balance falls below
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                defaultValue={100}
                className="w-32 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
