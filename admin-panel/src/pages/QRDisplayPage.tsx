import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import apiClient from '../api/client';
import type { QRResponse } from '../types';

const REFRESH_INTERVAL_MS = 25_000; // 25 seconds
const COUNTDOWN_SECONDS = 30;

const QRDisplayPage: React.FC = () => {
  const { id: officeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery<QRResponse>({
    queryKey: ['qr', officeId],
    queryFn: async () => {
      const res = await apiClient.get<QRResponse>(`/api/offices/${officeId}/qr`);
      return res.data;
    },
    enabled: !!officeId,
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: REFRESH_INTERVAL_MS,
  });

  // Reset countdown whenever QR data is refreshed
  useEffect(() => {
    setCountdown(COUNTDOWN_SECONDS);
  }, [dataUpdatedAt]);

  // Countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refetch();
          return COUNTDOWN_SECONDS;
        }
        return prev - 1;
      });
    }, 1_000);
    return () => clearInterval(timer);
  }, [refetch]);

  const qrValue = data
    ? JSON.stringify({
        token: data.qrData.token,
        officeId: data.qrData.officeId,
        expiresAt: data.qrData.expiresAt,
      })
    : '';

  const expiresAt = data ? format(new Date(data.qrData.expiresAt), 'HH:mm:ss') : '';

  const circumference = 2 * Math.PI * 22;
  const strokeDashoffset = circumference - (countdown / COUNTDOWN_SECONDS) * circumference;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative px-4">
      {/* Back button */}
      <button
        onClick={() => navigate('/offices')}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Offices
      </button>

      {/* Office name */}
      {data && (
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">
          {data.officeName}
        </h1>
      )}
      <p className="text-slate-400 text-sm mb-8">
        Scan QR code to mark your attendance
      </p>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-64 h-64 bg-slate-800 rounded-2xl flex items-center justify-center">
            <svg className="animate-spin w-12 h-12 text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">Generating QR code…</p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-xl px-6 py-5 text-center max-w-sm">
          <p className="font-semibold mb-1">Failed to load QR code</p>
          <p className="text-sm text-red-400">Check server connection and try again.</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-1.5 text-sm bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* QR Code */}
      {data && !isLoading && (
        <div className="flex flex-col items-center gap-6">
          {/* QR with white card */}
          <div className="bg-white p-5 rounded-3xl shadow-2xl">
            <QRCodeSVG
              value={qrValue}
              size={280}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#1e293b"
            />
          </div>

          {/* Countdown ring + info */}
          <div className="flex items-center gap-6 mt-2">
            {/* Circular countdown */}
            <div className="relative flex items-center justify-center w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="3"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute text-white font-bold text-sm">{countdown}</span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-slate-300 text-sm">
                <ClockIcon className="w-4 h-4 text-indigo-400" />
                <span>Refreshes every 25 seconds</span>
              </div>
              {expiresAt && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Current QR expires at {expiresAt}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer hint */}
      <p className="absolute bottom-5 text-xs text-slate-600">
        AttendQR · QR codes are time-limited and rotate automatically
      </p>
    </div>
  );
};

export default QRDisplayPage;

