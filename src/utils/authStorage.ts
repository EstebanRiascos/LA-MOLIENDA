import { SystemUser } from '../types';
import { syncUsersToCloud } from './firebaseSync';

const STORAGE_KEY_USERS = 'lamolienda_users_prod_v2';
const STORAGE_KEY_CURRENT_SESSION = 'lamolienda_session_user_v2';

export const DEFAULT_USERS: SystemUser[] = [
  {
    id: 'user_admin_01',
    username: 'admin',
    name: 'Administrador',
    role: 'admin',
    password: 'admin', // Contraseña solicitada: admin
    pin: '1234',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

/**
 * Obtener todos los usuarios registrados (solo admin por defecto)
 */
export function getStoredUsers(): SystemUser[] {
  try {
    // Si existía la clave de usuarios anterior con usuarios demo, migrar/limpiar a solo admin
    if (localStorage.getItem('lamolienda_users_prod_v1')) {
      localStorage.removeItem('lamolienda_users_prod_v1');
      localStorage.removeItem('lamolienda_session_user_v1');
      saveStoredUsers(DEFAULT_USERS);
      return DEFAULT_USERS;
    }

    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      saveStoredUsers(DEFAULT_USERS);
      return DEFAULT_USERS;
    }
    const parsed: SystemUser[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveStoredUsers(DEFAULT_USERS);
      return DEFAULT_USERS;
    }

    // Si la lista aún contiene los usuarios demo antiguos ('caja' o 'carlos'), depurarlos
    const hasOldDemos = parsed.some((u) => u.username === 'caja' || u.username === 'carlos');
    if (hasOldDemos) {
      saveStoredUsers(DEFAULT_USERS);
      return DEFAULT_USERS;
    }

    return parsed;
  } catch (err) {
    console.error('Error al cargar usuarios:', err);
    return DEFAULT_USERS;
  }
}

/**
 * Sincroniza la lista de usuarios y personal activo con el servidor local Wi-Fi y celulares
 */
export function broadcastUsersSync(users: SystemUser[]): void {
  try {
    const safeUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      pin: u.pin,
      password: u.password,
      active: u.active,
    }));
    const activeStaff = users.filter((u) => u.active).map((u) => u.name);

    if (typeof window !== 'undefined') {
      const api = (window as any).electronAPI;
      if (api && typeof api.broadcastState === 'function') {
        api.broadcastState({
          systemUsers: safeUsers,
          staffList: activeStaff.length > 0 ? activeStaff : ['Administrador'],
        });
      }

      // Solo llamar a /api/sync si estamos en la máquina anfitriona (Electron o localhost)
      const isLocal =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        Boolean(api);

      if (isLocal) {
        fetch('http://localhost:4545/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemUsers: safeUsers,
            staffList: activeStaff.length > 0 ? activeStaff : ['Administrador'],
          }),
        }).catch(() => {});

        fetch('http://localhost:4545/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemUsers: safeUsers }),
        }).catch(() => {});
      }

      window.dispatchEvent(
        new CustomEvent('lamolienda:users-changed', {
          detail: { users: safeUsers, staffList: activeStaff },
        })
      );
    }
  } catch (err) {
    console.error('Error al sincronizar usuarios con el servidor:', err);
  }
}

/**
 * Guardar lista de usuarios en almacenamiento local y sincronizar con red
 */
export function saveStoredUsers(users: SystemUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    broadcastUsersSync(users);
    syncUsersToCloud(users);
  } catch (err) {
    console.error('Error al guardar usuarios:', err);
  }
}

/**
 * Obtener usuario con sesión activa en este momento
 */
export function getStoredSessionUser(): SystemUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_SESSION);
    if (!raw) return null;
    const user: SystemUser = JSON.parse(raw);
    // Verificar que el usuario aún exista y esté activo
    const allUsers = getStoredUsers();
    const current = allUsers.find((u) => u.id === user.id && u.active);
    return current || null;
  } catch (err) {
    console.error('Error al recuperar sesión:', err);
    return null;
  }
}

/**
 * Guardar o limpiar sesión activa
 */
export function saveStoredSessionUser(user: SystemUser | null): void {
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY_CURRENT_SESSION);
    } else {
      localStorage.setItem(STORAGE_KEY_CURRENT_SESSION, JSON.stringify(user));
    }
  } catch (err) {
    console.error('Error al guardar sesión activa:', err);
  }
}

/**
 * Autenticación mediante Usuario y Contraseña (Recomendado para Administrador)
 */
export function authenticateWithPassword(
  usernameInput: string,
  passwordInput: string
): { success: boolean; user?: SystemUser; error?: string } {
  const users = getStoredUsers();
  const cleanUsername = usernameInput.trim().toLowerCase();

  const found = users.find(
    (u) =>
      (u.id === usernameInput ||
        u.username.toLowerCase() === cleanUsername ||
        u.name.toLowerCase() === cleanUsername) &&
      u.active
  );

  if (!found) {
    return { success: false, error: 'Usuario no encontrado o inactivo.' };
  }

  const isValidPass =
    (found.password && found.password === passwordInput) ||
    (found.pin && found.pin === passwordInput);

  if (!isValidPass) {
    return { success: false, error: 'Contraseña incorrecta.' };
  }

  // Actualizar lastLoginAt
  const updatedUser = { ...found, lastLoginAt: new Date().toISOString() };
  const updatedUsers = users.map((u) => (u.id === found.id ? updatedUser : u));
  saveStoredUsers(updatedUsers);
  saveStoredSessionUser(updatedUser);

  return { success: true, user: updatedUser };
}

/**
 * Autenticación mediante PIN numérico de 4 dígitos (Meseros, Cajeros y acceso rápido)
 * Permite validar opcionalmente contra un usuario específico
 */
export function authenticateWithPin(
  pinInput: string,
  userIdOrUsername?: string
): { success: boolean; user?: SystemUser; error?: string } {
  const users = getStoredUsers();
  const cleanPin = pinInput.trim();

  if (cleanPin.length !== 4) {
    return { success: false, error: 'El PIN debe ser exactamente de 4 dígitos.' };
  }

  let found: SystemUser | undefined;

  if (userIdOrUsername) {
    const cleanIdOrUser = userIdOrUsername.trim().toLowerCase();
    found = users.find(
      (u) =>
        (u.id === userIdOrUsername || u.username.toLowerCase() === cleanIdOrUser) &&
        u.active
    );
    if (!found) {
      return { success: false, error: 'Usuario no encontrado o inactivo.' };
    }
    if (found.pin !== cleanPin) {
      return { success: false, error: `PIN incorrecto para ${found.name}.` };
    }
  } else {
    found = users.find((u) => u.pin === cleanPin && u.active);
    if (!found) {
      return { success: false, error: 'PIN incorrecto o usuario no asignado.' };
    }
  }

  // Actualizar lastLoginAt
  const updatedUser = { ...found, lastLoginAt: new Date().toISOString() };
  const updatedUsers = users.map((u) => (u.id === found.id ? updatedUser : u));
  saveStoredUsers(updatedUsers);
  saveStoredSessionUser(updatedUser);

  return { success: true, user: updatedUser };
}

/**
 * Cerrar sesión
 */
export function logoutSession(): void {
  saveStoredSessionUser(null);
}

/**
 * Actualizar datos de un usuario existente
 */
export function updateStoredUser(updated: SystemUser): boolean {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === updated.id);
  if (index === -1) return false;

  // Validación: si se edita el username, verificar que no esté duplicado
  const dup = users.find(
    (u) => u.id !== updated.id && u.username.toLowerCase() === updated.username.toLowerCase()
  );
  if (dup) return false;

  users[index] = updated;
  saveStoredUsers(users);

  // Si se actualizó el usuario actual de la sesión, refrescar sesión
  const current = getStoredSessionUser();
  if (current && current.id === updated.id) {
    saveStoredSessionUser(updated);
  }

  return true;
}

/**
 * Crear un nuevo usuario en el sistema
 */
export function createStoredUser(
  newUser: Omit<SystemUser, 'id' | 'createdAt'>
): { success: boolean; user?: SystemUser; error?: string } {
  const users = getStoredUsers();
  const cleanUsername = newUser.username.trim().toLowerCase();

  if (!cleanUsername) {
    return { success: false, error: 'El nombre de usuario es obligatorio.' };
  }

  const exists = users.some((u) => u.username.toLowerCase() === cleanUsername);
  if (exists) {
    return { success: false, error: `El usuario "${cleanUsername}" ya existe.` };
  }

  if (newUser.pin) {
    const pinExists = users.some((u) => u.pin === newUser.pin);
    if (pinExists) {
      return { success: false, error: `El PIN "${newUser.pin}" ya está en uso por otro usuario.` };
    }
  }

  const created: SystemUser = {
    ...newUser,
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    createdAt: new Date().toISOString(),
  };

  users.push(created);
  saveStoredUsers(users);

  return { success: true, user: created };
}

/**
 * Eliminar o desactivar usuario
 */
export function deleteStoredUser(id: string): { success: boolean; error?: string } {
  const users = getStoredUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return { success: false, error: 'Usuario no encontrado.' };

  // Evitar eliminar el único admin
  if (user.role === 'admin') {
    const activeAdmins = users.filter((u) => u.role === 'admin' && u.active);
    if (activeAdmins.length <= 1) {
      return { success: false, error: 'No se puede eliminar el único Administrador del sistema.' };
    }
  }

  const filtered = users.filter((u) => u.id !== id);
  saveStoredUsers(filtered);

  return { success: true };
}
