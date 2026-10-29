import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Office, CreateOfficePayload, UpdateOfficePayload } from '../types';

interface OfficeFormProps {
  initialData?: Office | null;
  onSubmit: (data: CreateOfficePayload | UpdateOfficePayload) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface FormValues {
  name: string;
  latitude: string;
  longitude: string;
  radius: string;
}

const OfficeForm: React.FC<OfficeFormProps> = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        latitude: String(initialData.latitude),
        longitude: String(initialData.longitude),
        radius: String(initialData.radius),
      });
    } else {
      reset({ name: '', latitude: '', longitude: '', radius: '' });
    }
  }, [initialData, reset]);

  const handleFormSubmit = (values: FormValues) => {
    const payload: CreateOfficePayload | UpdateOfficePayload = {
      name: values.name,
      latitude: parseFloat(values.latitude),
      longitude: parseFloat(values.longitude),
      radius: parseInt(values.radius, 10),
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Office Name</label>
        <input
          {...register('name', { required: 'Office name is required' })}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.name ? 'border-red-400' : 'border-slate-300'
          }`}
          placeholder="Head Office"
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      {/* Latitude */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
        <input
          {...register('latitude', {
            required: 'Latitude is required',
            pattern: { value: /^-?[0-9]+(\.[0-9]+)?$/, message: 'Must be a valid decimal number' },
            validate: (v) => {
              const n = parseFloat(v);
              return (n >= -90 && n <= 90) || 'Latitude must be between -90 and 90';
            },
          })}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.latitude ? 'border-red-400' : 'border-slate-300'
          }`}
          placeholder="28.6139"
        />
        {errors.latitude && (
          <p className="text-xs text-red-500 mt-1">{errors.latitude.message}</p>
        )}
      </div>

      {/* Longitude */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
        <input
          {...register('longitude', {
            required: 'Longitude is required',
            pattern: { value: /^-?[0-9]+(\.[0-9]+)?$/, message: 'Must be a valid decimal number' },
            validate: (v) => {
              const n = parseFloat(v);
              return (n >= -180 && n <= 180) || 'Longitude must be between -180 and 180';
            },
          })}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.longitude ? 'border-red-400' : 'border-slate-300'
          }`}
          placeholder="77.2090"
        />
        {errors.longitude && (
          <p className="text-xs text-red-500 mt-1">{errors.longitude.message}</p>
        )}
      </div>

      {/* Radius */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Radius (metres)
        </label>
        <input
          {...register('radius', {
            required: 'Radius is required',
            pattern: { value: /^[0-9]+$/, message: 'Must be a positive integer' },
            validate: (v) => parseInt(v, 10) > 0 || 'Radius must be greater than 0',
          })}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.radius ? 'border-red-400' : 'border-slate-300'
          }`}
          placeholder="100"
        />
        {errors.radius && <p className="text-xs text-red-500 mt-1">{errors.radius.message}</p>}
        <p className="text-xs text-slate-400 mt-1">
          Employees must be within this distance to mark attendance.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {initialData ? 'Save Changes' : 'Create Office'}
        </button>
      </div>
    </form>
  );
};

export default OfficeForm;

