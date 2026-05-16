import { useState } from 'react';
import {
  Bell,
  Check,
  Filter,
  AlertTriangle,
  DollarSign,
  CreditCard,
  FileText,
  Wifi,
  MessageSquare,
  Megaphone
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useStore } from '../../store';
import type { NotificationType } from '../../types';

const notificationIcons: Record<NotificationType, React.ElementType> = {
  low_balance: DollarSign,
  payment_received: CreditCard,
  payment_reminder: AlertTriangle,
  invoice_generated: FileText,
  rate_update: DollarSign,
  channel_disconnect: Wifi,
  campaign_complete: Megaphone,
  dlr_failure: MessageSquare
};

const notificationColors: Record<NotificationType, string> = {
  low_balance: 'bg-orange-100 text-orange-600',
  payment_received: 'bg-green-100 text-green-600',
  payment_reminder: 'bg-yellow-100 text-yellow-600',
  invoice_generated: 'bg-blue-100 text-blue-600',
  rate_update: 'bg-purple-100 text-purple-600',
  channel_disconnect: 'bg-red-100 text-red-600',
  campaign_complete: 'bg-teal-100 text-teal-600',
  dlr_failure: 'bg-red-100 text-red-600'
};

export function NotificationsList() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useStore();
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');

  const filteredNotifications = notifications.filter((notif) => {
    const matchesType = filterType === 'all' || notif.type === filterType;
    const matchesRead =
      filterRead === 'all' ||
      (filterRead === 'read' && notif.isRead) ||
      (filterRead === 'unread' && !notif.isRead);
    return matchesType && matchesRead;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={markAllNotificationsRead}>
            <Check className="w-4 h-4" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="low_balance">Low Balance</option>
            <option value="payment_received">Payment Received</option>
            <option value="payment_reminder">Payment Reminder</option>
            <option value="invoice_generated">Invoice Generated</option>
            <option value="rate_update">Rate Update</option>
            <option value="channel_disconnect">Channel Disconnect</option>
            <option value="campaign_complete">Campaign Complete</option>
            <option value="dlr_failure">DLR Failure</option>
          </select>
          <select
            value={filterRead}
            onChange={(e) => setFilterRead(e.target.value as typeof filterRead)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </Card>

      {/* Notifications List */}
      <Card padding="none">
        <div className="divide-y divide-gray-200">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notifications found</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const Icon = notificationIcons[notif.type] || Bell;
              const colorClass = notificationColors[notif.type] || 'bg-gray-100 text-gray-600';

              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors ${
                    !notif.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={`font-medium text-gray-900 ${!notif.isRead ? 'font-semibold' : ''}`}>
                          {notif.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notif.isRead && (
                          <button
                            onClick={() => markNotificationRead(notif.id)}
                            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                        <span className={`w-2 h-2 rounded-full ${!notif.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
