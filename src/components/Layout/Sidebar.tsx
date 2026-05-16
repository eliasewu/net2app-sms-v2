import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Network,
  DollarSign,
  MessageSquare,
  Bell,
  Settings,
  Activity,
  Globe,
  Shield,
  CreditCard,
  BarChart3,
  Megaphone,
  ChevronDown,
  ChevronRight,
  Server,
  FlaskConical
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../store';
import clsx from 'clsx';

interface MenuItem {
  name: string;
  icon: React.ElementType;
  path?: string;
  children?: { name: string; path: string }[];
  roles?: string[];
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    name: 'Clients',
    icon: Users,
    children: [
      { name: 'All Clients', path: '/clients' },
      { name: 'Add Client', path: '/clients/add' },
      { name: 'Client Routes', path: '/clients/routes' },
      { name: 'Client Rates', path: '/clients/rates' }
    ],
    roles: ['super_admin', 'admin', 'support', 'billing', 'agent']
  },
  {
    name: 'Suppliers',
    icon: Building2,
    children: [
      { name: 'All Suppliers', path: '/suppliers' },
      { name: 'Add Supplier', path: '/suppliers/add' },
      { name: 'Supplier Rates', path: '/suppliers/rates' },
      { name: 'API Connectors', path: '/suppliers/api' },
      { name: 'OTT Device Pairing', path: '/suppliers/ott' }
    ],
    roles: ['super_admin', 'admin', 'support']
  },
  {
    name: 'Routing',
    icon: Network,
    children: [
      { name: 'Trunks', path: '/routing/trunks' },
      { name: 'Routes', path: '/routing/routes' },
      { name: 'Routing Plans', path: '/routing/plans' }
    ]
  },
  {
    name: 'Rates',
    icon: DollarSign,
    children: [
      { name: 'Rate Management', path: '/rates' },
      { name: 'Bulk Upload', path: '/rates/bulk' },
      { name: 'MCC/MNC Database', path: '/rates/mccmnc' }
    ]
  },
  {
    name: 'Billing',
    icon: CreditCard,
    children: [
      { name: 'Overview', path: '/billing' },
      { name: 'Invoices', path: '/billing/invoices' },
      { name: 'Payments', path: '/billing/payments' },
      { name: 'Credit & Funds', path: '/billing/credit' }
    ]
  },
  { name: 'SMS Logs', icon: MessageSquare, path: '/logs' },
  {
    name: 'Reports',
    icon: BarChart3,
    children: [
      { name: 'Real-time', path: '/reports/realtime' },
      { name: 'Hourly', path: '/reports/hourly' },
      { name: 'Daily', path: '/reports/daily' },
      { name: 'Monthly', path: '/reports/monthly' }
    ]
  },
  { name: 'Campaigns', icon: Megaphone, path: '/campaigns' },
  { name: 'Bind Status', icon: Activity, path: '/bind-status' },
  {
    name: 'Testing',
    icon: FlaskConical,
    children: [
      { name: 'Test SMS', path: '/testing/sms' },
      { name: 'Test SMPP Bind', path: '/testing/smpp' },
      { name: 'Test HTTP API', path: '/testing/http' },
      { name: 'Testing Tools', path: '/testing/tools' }
    ]
  },
  {
    name: 'Translations',
    icon: Globe,
    path: '/translations'
  },
  {
    name: 'Notifications',
    icon: Bell,
    children: [
      { name: 'Alerts', path: '/notifications' },
      { name: 'Settings', path: '/notifications/settings' },
      { name: 'Email Templates', path: '/notifications/templates' }
    ]
  },
  {
    name: 'Users',
    icon: Shield,
    children: [
      { name: 'User Management', path: '/users' },
      { name: 'Roles & Permissions', path: '/users/roles' }
    ],
    roles: ['super_admin', 'admin']
  },
  {
    name: 'System',
    icon: Settings,
    children: [
      { name: 'License', path: '/system/license' },
      { name: 'Kannel / SMPP', path: '/system/kannel' },
      { name: 'Database', path: '/system/database' },
      { name: 'API Endpoints', path: '/system/api' },
      { name: 'Backup & Restore', path: '/system/backup' },
      { name: 'Platform Settings', path: '/system/settings' }
    ],
    roles: ['super_admin', 'admin']
  }
];

export function Sidebar() {
  const [expandedItems, setExpandedItems] = useState<string[]>(['Clients', 'Routing']);
  const { currentUser } = useStore();

  const toggleExpand = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return currentUser && item.roles.includes(currentUser.role);
  });

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen overflow-y-auto fixed left-0 top-0 z-40">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">net2app SMS</h1>
            <p className="text-xs text-gray-400">Enterprise Hub</p>
          </div>
        </div>
      </div>

      <nav className="p-2 space-y-1">
        {filteredMenuItems.map((item) => (
          <div key={item.name}>
            {item.path ? (
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.name}</span>
              </NavLink>
            ) : (
              <>
                <button
                  onClick={() => toggleExpand(item.name)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  {expandedItems.includes(item.name) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedItems.includes(item.name) && item.children && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive
                              ? 'bg-blue-600/20 text-blue-400'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          )
                        }
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {child.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
