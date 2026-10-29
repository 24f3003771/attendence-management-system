import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import apiClient from '../api/client';
import OfficeForm from '../components/OfficeForm';
import type { Office, CreateOfficePayload, UpdateOfficePayload } from '../types';

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
const OfficePage: React.FC = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editOffice, setEditOffice] = useState<Office | null>(null);

  /* Fetch offices */
  const { data, isLoading, isError } = useQuery<Office[]>({
    queryKey: ['offices'],
    queryFn: async () => {
      const res = await apiClient.get<Office[]>('/api/offices');
      return res.data;
    },
  });
  const offices: Office[] = data || [];

  /* Create */
  const createMutation = useMutation({
    mutationFn: async (payload: CreateOfficePayload) => {
      const res = await apiClient.post<Office>('/api/offices', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offices'] });
      qc.invalidateQueries({ queryKey: ['offices-all'] });
      setShowForm(false);
      toast.success('Office created successfully!');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create office.';
      toast.error(msg);
    },
  });

  /* Update */
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateOfficePayload }) => {
      const res = await apiClient.put<Office>(`/api/offices/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offices'] });
      qc.invalidateQueries({ queryKey: ['offices-all'] });
      setEditOffice(null);
      toast.success('Office updated successfully!');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update office.';
      toast.error(msg);
    },
  });

  /* Delete */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/offices/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offices'] });
      qc.invalidateQueries({ queryKey: ['offices-all'] });
      toast.success('Office deleted.');
    },
    onError: () => toast.error('Failed to delete office.'),
  });

  const handleCreate = (payload: CreateOfficePayload | UpdateOfficePayload) => {
    createMutation.mutate(payload as CreateOfficePayload);
  };

  const handleUpdate = (payload: CreateOfficePayload | UpdateOfficePayload) => {
    if (!editOffice) return;
    updateMutation.mutate({ id: editOffice.id, payload: payload as UpdateOfficePayload });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Offices</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage office locations and geofencing</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Office
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
          Failed to load offices.
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Office Name', 'Latitude', 'Longitude', 'Radius', 'Actions'].map((h) => (
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
                {offices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      No offices found. Create one to generate QR codes.
                    </td>
                  </tr>
                )}
                {offices.map((office) => (
                  <tr key={office.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{office.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {office.latitude.toFixed(6)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {office.longitude.toFixed(6)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{office.radius} m</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* View QR */}
                        <button
                          onClick={() => navigate(`/offices/${office.id}/qr`)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          <QrCodeIcon className="w-4 h-4" />
                          View QR
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => setEditOffice(office)}
                          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 font-medium"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                          Edit
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (confirm(`Delete office "${office.name}"? This cannot be undone.`)) {
                              deleteMutation.mutate(office.id);
                            }
                          }}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Office Modal */}
      {showForm && (
        <Modal title="Add New Office" onClose={() => setShowForm(false)}>
          <OfficeForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </Modal>
      )}

      {/* Edit Office Modal */}
      {editOffice && (
        <Modal title="Edit Office" onClose={() => setEditOffice(null)}>
          <OfficeForm
            initialData={editOffice}
            onSubmit={handleUpdate}
            onCancel={() => setEditOffice(null)}
            isLoading={updateMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
};

export default OfficePage;

