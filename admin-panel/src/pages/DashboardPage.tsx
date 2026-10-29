import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import apiClient from '../api/client';
import StatCard from '../components/StatCard';
import type { DashboardData } from '../types';

const statusBadge: Record<string, { label: string; cls: string }> = {
  SIGNED_IN:  { label: 'Signed In',  cls: 'bg-green-100 text-green-700' },
  ABSENT:     { label: 'Absent',     cls: 'bg-red-100 text-red-700' },
  INCOMPLETE: { label: 'Incomplete', cls: 'bg-yellow-100 text-yellow-700' },
  COMPLETE:   { label: 'Complete',   cls: 'bg-blue-100 text-blue-700' },
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

const DashboardPage: React.FC = () => {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<DashboardData>('/api/dashboard');
      return res.data;
    },
    refetchInterval: 60_000,
  });

  // Show last refresh time
  const lastUpdated = dataUpdatedAt ? format(new Date(dataUpdatedAt), 'HH:mm:ss') : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Good {getGreeting()}, Admin 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">Last updated: {lastUpdated}</span>
          )}
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>
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

      {/* Error */}
      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-4 text-sm">
          Failed to load dashboard data. The server may be unavailable.
        </div>
      )}

      {data && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Signed In Today"
              value={data.stats.signedInToday}
              color="green"
              icon={<CheckCircleIcon className="w-7 h-7" />}
              subtitle="Successfully marked attendance"
            />
            <StatCard
              title="Absent"
              value={data.stats.absent}
              color="red"
              icon={<XCircleIcon className="w-7 h-7" />}
              subtitle="No check-in recorded"
            />
            <StatCard
              title="Incomplete"
              value={data.stats.incomplete}
              color="yellow"
              icon={<ExclamationTriangleIcon className="w-7 h-7" />}
              subtitle="Checked in, not checked out"
            />
          </div>

          {/* Employee Status Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-700">Today's Attendance Status</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Auto-refreshes every 60 seconds · {data.employees.length} employees
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Employee', 'Office', 'Status', 'Sign-In Time', 'Sign-Out Time'].map((h) => (
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
                  {data.employees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">
                        No employee records for today.
                      </td>
                    </tr>
                  )}
                  {data.employees.map((emp) => {
                    const badge = statusBadge[emp.status] || { label: emp.status, cls: 'bg-slate-100 text-slate-600' };
                    return (
                      <tr key={emp.employeeId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{emp.employeeName}</div>
                          <div className="text-xs text-slate-400">{emp.employeeCode}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{emp.officeName}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {emp.signInTime ? format(new Date(emp.signInTime), 'HH:mm:ss') : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {emp.signOutTime ? format(new Date(emp.signOutTime), 'HH:mm:ss') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;

