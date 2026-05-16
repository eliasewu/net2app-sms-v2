import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  type?: 'connection' | 'message' | 'invoice' | 'campaign' | 'default';
}

export function StatusBadge({ status, type = 'default' }: StatusBadgeProps) {
  const getStatusStyles = () => {
    // Connection status
    if (type === 'connection') {
      switch (status) {
        case 'bound':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'unbound':
          return 'bg-gray-100 text-gray-800 border-gray-200';
        case 'connecting':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'error':
          return 'bg-red-100 text-red-800 border-red-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }

    // Message status
    if (type === 'message') {
      switch (status) {
        case 'delivered':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'submitted':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'pending':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'failed':
        case 'rejected':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'expired':
          return 'bg-orange-100 text-orange-800 border-orange-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }

    // Invoice status
    if (type === 'invoice') {
      switch (status) {
        case 'paid':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'sent':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'draft':
          return 'bg-gray-100 text-gray-800 border-gray-200';
        case 'partial':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'overdue':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'cancelled':
          return 'bg-red-100 text-red-800 border-red-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }

    // Campaign status
    if (type === 'campaign') {
      switch (status) {
        case 'running':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'scheduled':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'completed':
          return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'paused':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'draft':
          return 'bg-gray-100 text-gray-800 border-gray-200';
        case 'cancelled':
          return 'bg-red-100 text-red-800 border-red-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }

    // Default
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize',
        getStatusStyles()
      )}
    >
      {status}
    </span>
  );
}
