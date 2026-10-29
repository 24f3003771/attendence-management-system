import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Employee, CreateEmployeePayload, UpdateEmployeePayload, Office } from '../types';

interface EmployeeFormProps {
  initialData?: Employee | null;
  offices: Office[];
  onSubmit: (data: CreateEmployeePayload | UpdateEmployeePayload) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface FormValues {
  employeeCode: string;
  name: string;
  email: string;
  officeId: string;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  initialData,
  offices,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (initialData) {
      reset({
        employeeCode: initialData.employeeCode,
        name: initialData.name,
        email: initialData.email,
        officeId: initialData.officeId,
      });
    } else {
      reset({ employeeCode: '', name: '', email: '', officeId: '' });
    }
  }, [initialData, reset]);

  const handleFormSubmit = (values: FormValues) => {
    if (initialData) {
      const payload: UpdateEmployeePayload = {
        name: values.name,
        email: values.email,
        officeId: values.officeId,
      };
      onSubmit(payload);
    } else {
      const payload: CreateEmployeePayload = {
        employeeCode: values.employeeCode,
        name: values.name,
        email: values.email,
        officeId: values.officeId,
      };
      onSubmit(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Employee Code – read-only when editing */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Employee Code
        </label>
        <input
          {...register('employeeCode', {
            required: !initialData ? 'Employee code is required' : false,
          })}
          readOnly={!!initialData}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            initialData ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-300'
          } ${errors.employeeCode ? 'border-red-400' : 'border-slate-300'}`}
          placeholder="EMP001"
        />
        {errors.employeeCode && (
          <p className="text-xs text-red-500 mt-1">{errors.employeeCode.message}</p>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
        <input
          {...register('name', { required: 'Name is required' })}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.name ? 'border-red-400' : 'border-slate-300'
          }`}
          placeholder="John Doe"
        />
        {errors.name && (
          <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
          })}
          type="email"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.email ? 'border-red-400' : 'border-slate-300'
          }`}
          placeholder="john@company.com"
        />
        {errors.email && (
          <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Office */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Office</label>
        <select
          {...register('officeId', { required: 'Office is required' })}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
            errors.officeId ? 'border-red-400' : 'border-slate-300'
          }`}
        >
          <option value="">Select an office…</option>
          {offices.map((office) => (
            <option key={office.id} value={office.id}>
              {office.name}
            </option>
          ))}
        </select>
        {errors.officeId && (
          <p className="text-xs text-red-500 mt-1">{errors.officeId.message}</p>
        )}
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
          {initialData ? 'Save Changes' : 'Create Employee'}
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;

