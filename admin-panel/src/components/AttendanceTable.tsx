import React, { useState } from 'react';
import { format } from 'date-fns';
import { PencilSquareIcon, MapPinIcon, CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { AttendanceRecord, AttendanceCorrectionPayload } from '../types';
import { useForm } from 'react-hook-form';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onCorrect: (id: string, payload: AttendanceCorrectionPayload) => void;
  isCorrecting: boolean;
}

interface CorrectionFormValues {
  correctedTime: string;
  correctionReason: string;
}

const statusBadge: Record<string, string> = {
  VALID: 'bg-green-100 text-green-700',
  FLAGGED: 'bg-yellow-100 text-yellow-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const typeBadge: Record<string, string> = {
  IN: 'bg-indigo-100 text-indigo-700',
  OUT: 'bg-slate-100 text-slate-700',
};

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AttendanceTable: React.FC<AttendanceTableProps> = ({ records, onCorrect, isCorrecting }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CorrectionFormValues>();

  const openEdit = (record: AttendanceRecord) => {
    setEditingId(record.id);
    reset({
      correctedTime: record.correctedTime
        ? format(new Date(record.correctedTime), "yyyy-MM-dd'T'HH:mm")
        : format(new Date(record.timestamp), "yyyy-MM-dd'T'HH:mm"),
      correctionReason: record.correctionReason || '',
    });
  };

  const closeEdit = () => {
    setEditingId(null);
    reset();
  };

  const submitCorrection = (values: CorrectionFormValues) => {
    if (!editingId) return;
    onCorrect(editingId, {
      correctedTime: new Date(values.correctedTime).toISOString(),
      correctionReason: values.correctionReason,
    });
    closeEdit();
  };

  const formatTime = (iso: string) => format(new Date(iso), 'dd MMM yyyy, HH:mm');

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Employee', 'Photo', 'Type', 'Time', 'GPS', 'Accuracy', 'Device', 'Status', 'Flag Reason', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {records.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-slate-400">
                  No attendance records found.
                </td>
              </tr>
            )}
            {records.map((rec) => {
              const photoFullUrl = rec.photoUrl
                ? (rec.photoUrl.startsWith('http') ? rec.photoUrl : `${BASE_URL}${rec.photoUrl}`)
                : null;

              return (
                <React.Fragment key={rec.id}>
                  <tr
                    className={
                      rec.status === 'REJECTED'
                        ? 'bg-red-50'
                        : rec.status === 'FLAGGED'
                        ? 'bg-yellow-50'
                        : ''
                    }
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {rec.employeeName}
                      <div className="text-xs text-slate-400">{rec.employeeCode}</div>
                    </td>

                    {/* Photo Thumbnail */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {photoFullUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPhoto({
                              url: photoFullUrl,
                              title: `${rec.employeeName} (${rec.type}) - ${formatTime(rec.timestamp)}`,
                            })
                          }
                          className="group relative flex items-center gap-1.5 focus:outline-none"
                        >
                          <img
                            src={photoFullUrl}
                            alt={rec.employeeName}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm group-hover:scale-105 group-hover:ring-2 group-hover:ring-indigo-400 transition-all"
                          />
                          <span className="text-xs text-indigo-600 font-medium group-hover:underline">
                            View
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-300">
                          <CameraIcon className="w-5 h-5" />
                          <span className="text-xs">—</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge[rec.type]}`}>
                        {rec.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {formatTime(rec.correctedTime || rec.timestamp)}
                      {rec.correctedTime && (
                        <div className="text-xs text-indigo-500">Corrected</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <a
                        href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <MapPinIcon className="w-3.5 h-3.5" />
                        <span className="text-xs">
                          {rec.latitude.toFixed(5)}, {rec.longitude.toFixed(5)}
                        </span>
                      </a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{rec.accuracy}m</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 max-w-[100px] truncate" title={rec.deviceId}>
                      {rec.deviceId}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[rec.status]}`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[140px]">
                      <span className="text-xs">{rec.flagReason || '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => openEdit(rec)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        Edit
                      </button>
                    </td>
                  </tr>

                  {/* Inline correction form */}
                  {editingId === rec.id && (
                    <tr className="bg-indigo-50">
                      <td colSpan={10} className="px-4 py-4">
                        <form onSubmit={handleSubmit(submitCorrection)} className="flex flex-wrap gap-4 items-end">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Corrected Time
                            </label>
                            <input
                              {...register('correctedTime', { required: 'Time is required' })}
                              type="datetime-local"
                              className={`rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                errors.correctedTime ? 'border-red-400' : 'border-slate-300'
                              }`}
                            />
                            {errors.correctedTime && (
                              <p className="text-xs text-red-500 mt-0.5">{errors.correctedTime.message}</p>
                            )}
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Reason for Correction
                            </label>
                            <input
                              {...register('correctionReason', { required: 'Reason is required' })}
                              className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                errors.correctionReason ? 'border-red-400' : 'border-slate-300'
                              }`}
                              placeholder="Admin manual correction – employee forgot to sign out"
                            />
                            {errors.correctionReason && (
                              <p className="text-xs text-red-500 mt-0.5">{errors.correctionReason.message}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={isCorrecting}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                            >
                              {isCorrecting ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={closeEdit}
                              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Watermarked Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl overflow-hidden max-w-xl w-full shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 text-sm truncate">
                📷 {selectedPhoto.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex flex-col items-center justify-center bg-slate-900">
              <img
                src={selectedPhoto.url}
                alt="Attendance Photo"
                className="max-h-[70vh] rounded-lg object-contain shadow-lg"
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="text-xs text-slate-500">
                Watermarked with timestamp, employee details & GPS location
              </span>
              <a
                href={selectedPhoto.url}
                download
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
              >
                Open Full Resolution
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttendanceTable;
