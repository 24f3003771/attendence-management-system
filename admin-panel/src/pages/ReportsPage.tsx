import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { DocumentArrowDownIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import type { Employee, PaginatedResponse, ReportResponse } from '../types';

const ReportsPage: React.FC = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const lastMonth = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [from, setFrom] = useState<string>(lastMonth);
  const [to, setTo] = useState<string>(today);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [queryEnabled, setQueryEnabled] = useState(false);

  /* Fetch employees for selector */
  const { data: empData } = useQuery<PaginatedResponse<Employee>>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Employee>>('/api/employees');
      return res.data;
    },
  });
  const employees: Employee[] = empData?.data || [];

  /* Report query (triggered manually) */
  const {
    data: report,
    isLoading,
    isError,
    refetch,
  } = useQuery<ReportResponse>({
    queryKey: ['reports', from, to, selectedEmployee],
    queryFn: async () => {
      const params: Record<string, string> = { from, to };
      if (selectedEmployee) params.employeeId = selectedEmployee;
      const res = await apiClient.get<ReportResponse>('/api/reports', { params });
      return res.data;
    },
    enabled: queryEnabled,
  });

  const handleGenerate = () => {
    if (!from || !to) {
      toast.error('Please select both from and to dates.');
      return;
    }
    if (new Date(from) > new Date(to)) {
      toast.error('"From" date must be before "To" date.');
      return;
    }
    setQueryEnabled(true);
    refetch();
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({ format: 'csv', from, to });
      if (selectedEmployee) params.set('employeeId', selectedEmployee);

      const response = await apiClient.get(`/api/reports/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${from}-to-${to}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report exported successfully!');
    } catch {
      toast.error('Failed to export report.');
    }
  };

  const rows = report?.rows || [];

  const totals = rows.reduce(
    (acc, row) => ({
      daysPresent: acc.daysPresent + row.daysPresent,
      daysAbsent: acc.daysAbsent + row.daysAbsent,
      daysIncomplete: acc.daysIncomplete + row.daysIncomplete,
    }),
    { daysPresent: 0, daysAbsent: 0, daysIncomplete: 0 },
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Generate attendance summaries and export data
        </p>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Report Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* From */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              max={to}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* To */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              min={from}
              max={today}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Employee */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          {/* Generate button */}
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ChartBarIcon className="w-4 h-4" />
              Generate Report
            </button>
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
          Failed to generate report.
        </div>
      )}

      {/* Results */}
      {report && !isLoading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Table header with export */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-700">Summary Report</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {format(new Date(report.from), 'dd MMM yyyy')} →{' '}
                {format(new Date(report.to), 'dd MMM yyyy')} · {rows.length} employee
                {rows.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Employee', 'Office', 'Days Present', 'Days Absent', 'Days Incomplete', 'Total Days', 'Attendance %'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No data for the selected period.
                    </td>
                  </tr>
                )}
                {rows.map((row) => {
                  const pct =
                    row.totalDays > 0
                      ? Math.round((row.daysPresent / row.totalDays) * 100)
                      : 0;
                  return (
                    <tr key={row.employeeId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{row.employeeName}</div>
                        <div className="text-xs text-slate-400">{row.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.officeName}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-green-700">{row.daysPresent}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-red-600">{row.daysAbsent}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-yellow-600">{row.daysIncomplete}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.totalDays}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[80px] bg-slate-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                pct >= 80
                                  ? 'bg-green-500'
                                  : pct >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-semibold ${
                              pct >= 80
                                ? 'text-green-700'
                                : pct >= 60
                                ? 'text-yellow-700'
                                : 'text-red-700'
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row */}
              {rows.length > 0 && (
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                      Totals ({rows.length} employees)
                    </td>
                    <td className="px-4 py-3 font-bold text-green-700">{totals.daysPresent}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{totals.daysAbsent}</td>
                    <td className="px-4 py-3 font-bold text-yellow-600">{totals.daysIncomplete}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Empty state – before first generation */}
      {!report && !isLoading && !isError && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <ChartBarIcon className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">Select a date range and click "Generate Report" to see results.</p>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;

