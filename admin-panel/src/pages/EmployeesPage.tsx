import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  DevicePhoneMobileIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import apiClient from '../api/client';
import EmployeeForm from '../components/EmployeeForm';
import type {
  Employee,
  Office,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  CreateEmployeeResponse,
  PaginatedResponse,
} from '../types';

/* ── Modal wrapper ──────────────────────────────────────────────────────────── */
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">{title}</h2>
      {children}
    </div>
  </div>
);

/* ── Page ───────────────────────────────────────────────────────────────────── */
const EmployeesPage: React.FC = () => {
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Employee | null>(null);

  /* Fetch offices for dropdown */
  const { data: officesData } = useQuery<Office[]>({
    queryKey: ['offices-all'],
    queryFn: async () => {
      const res = await apiClient.get<Office[]>('/api/offices');
      return res.data;
    },
  });
  const offices: Office[] = officesData || [];

  /* Fetch employees */
  const { data, isLoading, isError } = useQuery<PaginatedResponse<Employee>>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Employee>>('/api/employees');
      return res.data;
    },
  });
  const employees: Employee[] = data?.data || [];

  /* Create */
  const createMutation = useMutation({
    mutationFn: async (payload: CreateEmployeePayload) => {
      const res = await apiClient.post<CreateEmployeeResponse>('/api/employees', payload);
      return res.data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setShowForm(false);
      setNewPassword(result.generatedPassword);
      toast.success('Employee created successfully!');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create employee.';
      toast.error(msg);
    },
  });

  /* Update */
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateEmployeePayload }) => {
      const res = await apiClient.put<Employee>(`/api/employees/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setEditEmployee(null);
      toast.success('Employee updated successfully!');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update employee.';
      toast.error(msg);
    },
  });

  /* Deactivate */
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/employees/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setConfirmDeactivate(null);
      toast.success('Employee deactivated.');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to deactivate employee.';
      toast.error(msg);
    },
  });

  /* Reset device */
  const resetDeviceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/employees/${id}/reset-device`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Device binding reset.');
    },
    onError: () => toast.error('Failed to reset device binding.'),
  });

  const handleCreate = (payload: CreateEmployeePayload | UpdateEmployeePayload) => {
    createMutation.mutate(payload as CreateEmployeePayload);
  };

  const handleUpdate = (payload: CreateEmployeePayload | UpdateEmployeePayload) => {
    if (!editEmployee) return;
    updateMutation.mutate({ id: editEmployee.id, payload: payload as UpdateEmployeePayload });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage all registered employees</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-4 text-sm">
          Failed to load employees.
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Code', 'Name', 'Office', 'Status', 'Device Bound', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No employees found. Add one to get started.
                    </td>
                  </tr>
                )}
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{emp.employeeCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{emp.name}</div>
                      <div className="text-xs text-slate-400">{emp.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{emp.officeName || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.deviceBound
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {emp.deviceBound ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Edit */}
                        <button
                          onClick={() => setEditEmployee(emp)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          title="Edit employee"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                          Edit
                        </button>

                        {/* Reset Device */}
                        <button
                          onClick={() => {
                            if (confirm(`Reset device binding for ${emp.name}?`)) {
                              resetDeviceMutation.mutate(emp.id);
                            }
                          }}
                          disabled={!emp.deviceBound}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Reset device"
                        >
                          <DevicePhoneMobileIcon className="w-4 h-4" />
                          Reset Device
                        </button>

                        {/* Deactivate */}
                        {emp.status === 'ACTIVE' && (
                          <button
                            onClick={() => setConfirmDeactivate(emp)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                            title="Deactivate employee"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showForm && (
        <Modal title="Add New Employee" onClose={() => setShowForm(false)}>
          <EmployeeForm
            offices={offices}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </Modal>
      )}

      {/* Edit Employee Modal */}
      {editEmployee && (
        <Modal title="Edit Employee" onClose={() => setEditEmployee(null)}>
          <EmployeeForm
            initialData={editEmployee}
            offices={offices}
            onSubmit={handleUpdate}
            onCancel={() => setEditEmployee(null)}
            isLoading={updateMutation.isPending}
          />
        </Modal>
      )}

      {/* New Password Modal */}
      {newPassword && (
        <Modal title="Employee Created" onClose={() => setNewPassword(null)}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <KeyIcon className="w-5 h-5" />
                <span className="font-semibold text-sm">Save this password — shown only once</span>
              </div>
              <p className="font-mono text-2xl font-bold text-amber-800 text-center py-2 bg-white rounded-lg border border-amber-100">
                {newPassword}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Share this temporary password with the employee. They will use it to log into the mobile app.
            </p>
            <button
              onClick={() => setNewPassword(null)}
              className="w-full py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Done — I've saved the password
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm Deactivate Modal */}
      {confirmDeactivate && (
        <Modal title="Confirm Deactivation" onClose={() => setConfirmDeactivate(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to deactivate{' '}
              <span className="font-semibold text-slate-800">{confirmDeactivate.name}</span>? They
              will no longer be able to log in.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeactivate(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deactivateMutation.mutate(confirmDeactivate.id)}
                disabled={deactivateMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EmployeesPage;

