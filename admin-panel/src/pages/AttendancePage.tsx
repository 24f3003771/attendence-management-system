import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { FunnelIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import apiClient from '../api/client';
import AttendanceTable from '../components/AttendanceTable';
import type { AttendanceRecord, AttendanceCorrectionPayload, Employee, PaginatedResponse } from '../types';

const AttendancePage: React.FC = () => {
  const qc = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const handleDownloadZip = async () => {
    try {
      setIsDownloadingZip(true);
      const res = await apiClient.get(`/api/reports/photos-zip?date=${selectedDate}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-photos-${selectedDate}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Photos ZIP for ${selectedDate} downloaded!`);
    } catch {
      toast.error('Failed to download photos ZIP. No photos found or error.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  /* Fetch employees for filter */
  const { data: empData } = useQuery<PaginatedResponse<Employee>>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Employee>>('/api/employees');
      return res.data;
    },
  });
  const employees: Employee[] = empData?.data || [];

  /* Fetch attendance records */
  const { data, isLoading, isError } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', selectedDate, selectedEmployee],
    queryFn: async () => {
      const params: Record<string, string> = { date: selectedDate };
      if (selectedEmployee) params.employeeId = selectedEmployee;
      const res = await apiClient.get<AttendanceRecord[]>('/api/attendance', { params });
      return res.data;
    },
  });
  const records: AttendanceRecord[] = data || [];

  /* Correction mutation */
  const correctMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: AttendanceCorrectionPayload }) => {
      const res = await apiClient.put<AttendanceRecord>(`/api/attendance/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance record updated.');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update record.';
      toast.error(msg);
    },
  });

  const handleCorrect = (id: string, payload: AttendanceCorrectionPayload) => {
    correctMutation.mutate({ id, payload });
  };

  /* Counts */
  const flaggedCount = records.filter((r) => r.status === 'FLAGGED').length;
  const rejectedCount = records.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Attendance Records</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          View and correct individual attendance entries
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <FunnelIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />

          {/* Date picker */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Employee filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          {/* Download Photos ZIP Button */}
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {isDownloadingZip ? 'Downloading...' : 'Photos (.ZIP)'}
          </button>

          {/* Summary badges */}
          <div className="flex gap-2 ml-auto flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
              {records.length} records
            </span>
            {flaggedCount > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                {flaggedCount} flagged
              </span>
            )}
            {rejectedCount > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                {rejectedCount} rejected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-4 text-sm">
          Failed to load attendance records.
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <AttendanceTable
            records={records}
            onCorrect={handleCorrect}
            isCorrecting={correctMutation.isPending}
          />
        </div>
      )}
    </div>
  );
};

export default AttendancePage;

