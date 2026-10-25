import React, { useState } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Receipt,
  Smartphone,
  LayoutGrid,
  Package,
  Info,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { AppNotification, NotificationType } from '../types';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onDeleteNotification: (id: string) => void;
  onSelectTable?: (tableNameOrId: string) => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onDeleteNotification,
  onSelectTable,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'prebill' | 'order'>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;
  const prebillCount = notifications.filter((n) => n.type === 'prebill').length;
  const orderCount = notifications.filter((n) => n.type === 'order').length;

  const filtered = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'prebill') return n.type === 'prebill';
    if (activeTab === 'order') return n.type === 'order';
    return true;
  });

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins === 1) return 'Hace 1 min';
      if (diffMins < 60) return `Hace ${diffMins} min`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'prebill':
        return <Receipt size={17} className="notif-type-icon notif-icon-prebill" />;
      case 'order':
        return <Smartphone size={17} className="notif-type-icon notif-icon-order" />;
      case 'table':
        return <LayoutGrid size={17} className="notif-type-icon notif-icon-table" />;
      case 'inventory':
        return <Package size={17} className="notif-type-icon notif-icon-inventory" />;
      default:
        return <Info size={17} className="notif-type-icon notif-icon-system" />;
    }
  };

  const extractTableNumber = (msg: string): string | null => {
    const match = msg.match(/Mesa\s+([A-Za-z0-9_\-]+)/i) || msg.match(/Barra\s+([A-Za-z0-9_\-]+)/i);
    return match ? match[0] : null;
  };

  return (
    <div className="notif-drawer-backdrop" onClick={onClose}>
      <div
        className="notif-drawer-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="notif-drawer-header">
          <div className="notif-header-left">
            <div className="notif-bell-badge-box">
              <Bell size={19} />
              {unreadCount > 0 && <span className="notif-pulse-dot" />}
            </div>
            <div>
              <h3 className="notif-drawer-title">Historial de Notificaciones</h3>
              <span className="notif-drawer-subtitle">
                {unreadCount > 0
                  ? `${unreadCount} ${unreadCount === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}`
                  : 'Todo al día • No hay avisos pendientes'}
              </span>
            </div>
          </div>

          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn-notif-action"
                onClick={onMarkAllAsRead}
                title="Marcar todas como leídas"
              >
                <CheckCheck size={15} />
                <span>Leídas</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                className="btn-notif-action btn-notif-clear"
                onClick={onClearAll}
                title="Borrar todo el historial"
              >
                <Trash2 size={15} />
                <span>Limpiar</span>
              </button>
            )}
            <button
              type="button"
              className="notif-close-btn"
              onClick={onClose}
              title="Cerrar notificaciones"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="notif-tabs-strip">
          <button
            type="button"
            className={`notif-tab-pill ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Todas <span className="tab-pill-badge">{notifications.length}</span>
          </button>
          <button
            type="button"
            className={`notif-tab-pill ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            Sin leer <span className="tab-pill-badge">{unreadCount}</span>
          </button>
          <button
            type="button"
            className={`notif-tab-pill ${activeTab === 'prebill' ? 'active' : ''}`}
            onClick={() => setActiveTab('prebill')}
          >
            Precuentas <span className="tab-pill-badge">{prebillCount}</span>
          </button>
          <button
            type="button"
            className={`notif-tab-pill ${activeTab === 'order' ? 'active' : ''}`}
            onClick={() => setActiveTab('order')}
          >
            Comandas <span className="tab-pill-badge">{orderCount}</span>
          </button>
        </div>

        {/* Body List */}
        <div className="notif-drawer-body">
          {filtered.length === 0 ? (
            <div className="notif-empty-box">
              <div className="notif-empty-icon-wrap">
                <Bell size={32} />
              </div>
              <h4>No hay notificaciones</h4>
              <p>
                {activeTab === 'unread'
                  ? 'Has leído todas tus notificaciones.'
                  : activeTab === 'prebill'
                  ? 'No hay solicitudes de precuenta registradas.'
                  : 'Las alertas de comandas, precuentas y pedidos se registrarán aquí automáticamente.'}
              </p>
            </div>
          ) : (
            <div className="notif-list-wrapper">
              {filtered.map((notif) => {
                const tableRef = extractTableNumber(notif.message);
                return (
                  <div
                    key={notif.id}
                    className={`notif-card-item ${!notif.read ? 'is-unread' : ''} type-${notif.type}`}
                    onClick={() => {
                      if (!notif.read) onMarkAsRead(notif.id);
                    }}
                  >
                    <div className="notif-card-left">
                      <div className={`notif-icon-avatar avatar-${notif.type}`}>
                        {getNotificationIcon(notif.type)}
                      </div>
                    </div>

                    <div className="notif-card-center">
                      <div className="notif-card-top-meta">
                        <span className={`notif-category-pill pill-${notif.type}`}>
                          {notif.type === 'prebill' && '🧾 Precuenta / Cobro'}
                          {notif.type === 'order' && '📱 Comanda Móvil'}
                          {notif.type === 'table' && '🪑 Mesa'}
                          {notif.type === 'inventory' && '📦 Inventario'}
                          {notif.type === 'system' && 'ℹ️ Sistema'}
                        </span>
                        <div className="notif-time-row">
                          <Clock size={11} />
                          <span>{formatTime(notif.timestamp)}</span>
                        </div>
                      </div>

                      <p className="notif-card-msg">{notif.message}</p>

                      {tableRef && onSelectTable && (
                        <div className="notif-card-actions-row">
                          <button
                            type="button"
                            className="btn-notif-jump"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!notif.read) onMarkAsRead(notif.id);
                              onSelectTable(tableRef);
                              onClose();
                            }}
                          >
                            <span>Abrir cuenta de {tableRef}</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="notif-card-right">
                      {!notif.read && <span className="notif-unread-dot" title="Sin leer" />}
                      <button
                        type="button"
                        className="btn-notif-remove-single"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNotification(notif.id);
                        }}
                        title="Eliminar notificación"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="notif-drawer-footer">
          <span className="notif-footer-note">
            Se registran en tiempo real comandas de meseros, solicitudes de cobro y cambios de sala.
          </span>
          <button type="button" className="btn-notif-close-bottom" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
