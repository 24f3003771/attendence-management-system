import { create } from 'zustand';

export interface EmployeeUser {
  id: string;
  name: string;
  employeeCode: string;
  officeId: string;
}

interface EmployeeAuthState {
  token: string | null;
  employee: EmployeeUser | null;
  deviceId: string;
  login: (token: string, employee: EmployeeUser) => void;
  logout: () => void;
}

const getOrCreateDeviceId = (): string => {
  let id = localStorage.getItem('employee_device_id');
  if (!id) {
    id = 'web_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
    localStorage.setItem('employee_device_id', id);
  }
  return id;
};

export const useEmployeeAuthStore = create<EmployeeAuthState>((set) => {
  const savedToken = localStorage.getItem('employee_token');
  const savedUser = localStorage.getItem('employee_user');

  return {
    token: savedToken,
    employee: savedUser ? JSON.parse(savedUser) : null,
    deviceId: getOrCreateDeviceId(),

    login: (token, employee) => {
      localStorage.setItem('employee_token', token);
      localStorage.setItem('employee_user', JSON.stringify(employee));
      set({ token, employee });
    },

    logout: () => {
      localStorage.removeItem('employee_token');
      localStorage.removeItem('employee_user');
      set({ token: null, employee: null });
    },
  };
});
