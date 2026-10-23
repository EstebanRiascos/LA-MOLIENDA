import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  UserCheck,
  UserPlus,
  KeyRound,
  Lock,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Coffee,
  Receipt,
} from 'lucide-react';
import { SystemUser, UserRole } from '../types';
import {
  getStoredUsers,
  saveStoredUsers,
  createStoredUser,
  updateStoredUser,
  deleteStoredUser,
} from '../utils/authStorage';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUser;
  onUserUpdated: (user: SystemUser) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  const [users, setUsers] = useState<SystemUser[]>(() => getStoredUsers());
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'my_profile'>('list');

  // Notification state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Profile edit state (for currently logged admin)
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileUsername, setProfileUsername] = useState(currentUser.username);
  const [profilePassword, setProfilePassword] = useState(currentUser.password || '');
  const [profilePin, setProfilePin] = useState(currentUser.pin || '');
  const [showProfilePass, setShowProfilePass] = useState(false);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('mesero');
  const [newPin, setNewPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  // Editing existing user from the list
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('mesero');
  const [editUserPin, setEditUserPin] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');

  if (!isOpen) return null;

  const reloadUsers = () => {
    const list = getStoredUsers();
    setUsers(list);
  };

  const showMsg = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileUsername.trim()) {
      showMsg('error', 'El nombre y usuario no pueden estar vacíos.');
      return;
    }
    if (profilePin && profilePin.length !== 4) {
      showMsg('error', 'El PIN de acceso rápido debe tener exactamente 4 dígitos.');
      return;
    }

    const updated: SystemUser = {
      ...currentUser,
      name: profileName.trim(),
      username: profileUsername.trim().toLowerCase(),
      password: profilePassword,
      pin: profilePin.trim(),
    };

    const success = updateStoredUser(updated);
    if (success) {
      onUserUpdated(updated);
      reloadUsers();
      showMsg('success', 'Tus credenciales de Administrador se actualizaron correctamente.');
    } else {
      showMsg('error', 'El nombre de usuario ya está en uso por otra persona.');
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim()) {
      showMsg('error', 'Nombre y nombre de usuario son obligatorios.');
      return;
    }
    if (!newPin || newPin.length !== 4) {
      showMsg('error', 'El PIN debe ser exactamente de 4 dígitos numéricos.');
      return;
    }
    if (newRole === 'admin' && !newPassword) {
      showMsg('error', 'Los usuarios Administradores requieren una contraseña.');
      return;
    }

    const res = createStoredUser({
      name: newName.trim(),
      username: newUsername.trim(),
      role: newRole,
      pin: newPin.trim(),
      password: newRole === 'admin' ? newPassword : (newPassword || undefined),
      active: true,
    });

    if (res.success) {
      showMsg('success', `Usuario "${res.user?.name}" creado con éxito.`);
      setNewName('');
      setNewUsername('');
      setNewPin('');
      setNewPassword('');
      reloadUsers();
      setActiveTab('list');
    } else {
      showMsg('error', res.error || 'Error al crear el usuario.');
    }
  };

  const handleStartEdit = (user: SystemUser) => {
    setEditingUserId(user.id);
    setEditUserName(user.name);
    setEditUserRole(user.role);
    setEditUserPin(user.pin || '');
    setEditUserPassword(user.password || '');
  };

  const handleSaveEdit = (user: SystemUser) => {
    if (!editUserName.trim()) {
      showMsg('error', 'El nombre no puede estar vacío.');
      return;
    }
    if (editUserPin && editUserPin.length !== 4) {
      showMsg('error', 'El PIN debe tener 4 dígitos.');
      return;
    }

    const updated: SystemUser = {
      ...user,
      name: editUserName.trim(),
      role: editUserRole,
      pin: editUserPin.trim() || user.pin,
      password: editUserPassword || user.password,
    };

    updateStoredUser(updated);
    if (currentUser.id === user.id) {
      onUserUpdated(updated);
    }
    setEditingUserId(null);
    reloadUsers();
    showMsg('success', 'Usuario actualizado correctamente.');
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar al usuario "${name}"?`)) {
      const res = deleteStoredUser(id);
      if (res.success) {
        reloadUsers();
        showMsg('success', 'Usuario eliminado del sistema.');
      } else {
        showMsg('error', res.error || 'No se pudo eliminar el usuario.');
      }
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="role-badge role-admin">
            <ShieldCheck size={13} style={{ flexShrink: 0 }} />
            <span>Administrador</span>
          </span>
        );
      case 'cajero':
        return (
          <span className="role-badge role-cajero">
            <Receipt size={13} style={{ flexShrink: 0 }} />
            <span>Cajero</span>
          </span>
        );
      case 'mesero':
        return (
          <span className="role-badge role-mesero">
            <Coffee size={13} style={{ flexShrink: 0 }} />
            <span>Mesero / Barista</span>
          </span>
        );
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container user-mgmt-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge amber">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="modal-title">Gestión de Usuarios & Permisos</h3>
              <p className="modal-subtitle">
                Control de acceso, contraseñas y personal de La Molienda
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="user-mgmt-tabs">
          <button
            type="button"
            className={`user-mgmt-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <UserCheck size={16} />
            <span>Personal & Roles ({users.length})</span>
          </button>
          <button
            type="button"
            className={`user-mgmt-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <UserPlus size={16} />
            <span>Nuevo Usuario</span>
          </button>
          <button
            type="button"
            className={`user-mgmt-tab ${activeTab === 'my_profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('my_profile')}
          >
            <Shield size={16} />
            <span>Mi Perfil Admin</span>
          </button>
        </div>

        {/* Notification Toast */}
        {feedback && (
          <div className={`user-mgmt-feedback ${feedback.type}`}>
            {feedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="modal-body user-mgmt-body">
          {/* TAB 1: LIST USERS */}
          {activeTab === 'list' && (
            <div className="user-list-view">
              <div className="user-table-wrapper">
                <table className="user-mgmt-table">
                  <thead>
                    <tr>
                      <th>Nombre & Usuario</th>
                      <th style={{ width: '165px', whiteSpace: 'nowrap' }}>Rol en Turno</th>
                      <th>PIN de Acceso</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isEditing = editingUserId === user.id;
                      const isSelf = currentUser.id === user.id;

                      if (isEditing) {
                        return (
                          <tr key={user.id} className="row-editing">
                            <td>
                              <input
                                type="text"
                                className="inline-edit-input"
                                value={editUserName}
                                onChange={(e) => setEditUserName(e.target.value)}
                                placeholder="Nombre completo"
                              />
                            </td>
                            <td style={{ width: '165px' }}>
                              <select
                                className="inline-edit-select"
                                value={editUserRole}
                                onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                              >
                                <option value="admin">Administrador</option>
                                <option value="cajero">Cajero</option>
                                <option value="mesero">Mesero / Barista</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="text"
                                maxLength={4}
                                className="inline-edit-input pin"
                                value={editUserPin}
                                onChange={(e) => setEditUserPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="PIN"
                              />
                            </td>
                            <td>
                              <span className="user-status-pill active">Activo</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn-user-action save"
                                onClick={() => handleSaveEdit(user)}
                                title="Guardar cambios"
                              >
                                <Check size={15} />
                              </button>
                              <button
                                type="button"
                                className="btn-user-action cancel"
                                onClick={() => setEditingUserId(null)}
                                title="Cancelar"
                              >
                                <X size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={user.id}>
                          <td>
                            <div className="user-info-cell">
                              <div className={`user-avatar-initials role-${user.role}`}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="user-names-col">
                                <span className="user-display-name">
                                  {user.name} {isSelf && <strong className="you-tag">(Tú)</strong>}
                                </span>
                                <span className="user-login-name">@{user.username}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ width: '165px' }}>{getRoleBadge(user.role)}</td>
                          <td>
                            <div className="user-pin-badge" title="PIN de 4 dígitos">
                              <KeyRound size={13} />
                              <span>{user.pin ? `•••• (${user.pin})` : 'Sin PIN'}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`user-status-pill ${user.active ? 'active' : 'inactive'}`}>
                              {user.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-actions-row">
                              <button
                                type="button"
                                className="btn-user-action edit"
                                onClick={() => handleStartEdit(user)}
                                title="Editar usuario"
                              >
                                <Edit2 size={14} />
                              </button>
                              {!isSelf && (
                                <button
                                  type="button"
                                  className="btn-user-action delete"
                                  onClick={() => handleDelete(user.id, user.name)}
                                  title="Eliminar usuario"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Roles explanation card */}
              <div className="roles-info-banner">
                <div className="roles-info-item">
                  <ShieldCheck size={16} color="#f59e0b" />
                  <div>
                    <strong>Administrador:</strong> Acceso ilimitado a Inventario, Modificación de Costos y Precios, Cierre de Caja, Ventas y Usuarios.
                  </div>
                </div>
                <div className="roles-info-item">
                  <Receipt size={16} color="#38bdf8" />
                  <div>
                    <strong>Cajero:</strong> Cobro de mesas, facturación rápida, tickets térmicos y arqueo del turno.
                  </div>
                </div>
                <div className="roles-info-item">
                  <Coffee size={16} color="#10b981" />
                  <div>
                    <strong>Mesero / Barista:</strong> Toma de pedidos, creación de mesas, comandas, despacho y cobro de cuentas por mesa.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE USER */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateUser} className="user-form-view">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre Completo del Colaborador</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="ej: Andrés Suárez (Bartender)"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre de Usuario (Para Login)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="ej: andres.bar"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rol en el Sistema</label>
                  <select
                    className="form-input"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                  >
                    <option value="mesero">Mesero / Barista (Toma de pedidos)</option>
                    <option value="cajero">Cajero (Cobro y caja)</option>
                    <option value="admin">Administrador (Control total)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">PIN Numérico Rápido (4 Dígitos)</label>
                  <input
                    type="text"
                    maxLength={4}
                    className="form-input"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="ej: 4567"
                    required
                  />
                  <span className="form-hint">Permite ingresar ágilmente desde pantallas táctiles.</span>
                </div>

                {newRole === 'admin' && (
                  <div className="form-group full-width">
                    <label className="form-label">Contraseña de Administrador</label>
                    <div className="input-with-action">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        className="form-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Contraseña segura para ingreso"
                        required
                      />
                      <button
                        type="button"
                        className="btn-input-icon"
                        onClick={() => setShowNewPass(!showNewPass)}
                      >
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-actions-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveTab('list')}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <UserPlus size={16} />
                  <span>Crear Colaborador</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: MY ADMIN PROFILE */}
          {activeTab === 'my_profile' && (
            <form onSubmit={handleSaveProfile} className="user-form-view">
              <div className="profile-banner">
                <div className="profile-avatar-lg">
                  <ShieldCheck size={32} color="#f59e0b" />
                </div>
                <div>
                  <h4 className="profile-title">{currentUser.name}</h4>
                  <span className="profile-subtitle">
                    Administrador Principal con permisos completos en La Molienda
                  </span>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre Mostrado</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre de Usuario para Login</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nueva Contraseña de Administrador</label>
                  <div className="input-with-action">
                    <input
                      type={showProfilePass ? 'text' : 'password'}
                      className="form-input"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="btn-input-icon"
                      onClick={() => setShowProfilePass(!showProfilePass)}
                    >
                      {showProfilePass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="form-hint">Úsala al iniciar sesión en el modo Administrador.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">PIN Numérico Rápido (4 Dígitos)</label>
                  <input
                    type="text"
                    maxLength={4}
                    className="form-input"
                    value={profilePin}
                    onChange={(e) => setProfilePin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                  />
                  <span className="form-hint">Para desbloquear rápidamente la pantalla sin escribir contraseña.</span>
                </div>
              </div>

              <div className="form-actions-row">
                <button type="submit" className="btn-primary">
                  <Check size={16} />
                  <span>Guardar Mis Credenciales</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
