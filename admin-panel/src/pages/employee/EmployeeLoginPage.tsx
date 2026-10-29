import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { QrCodeIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';
import apiClient from '../../api/client';
import { useEmployeeAuthStore } from '../../store/employeeAuthStore';

interface LoginFormValues {
  employeeCode: string;
  password: string;
}

const EmployeeLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, deviceId } = useEmployeeAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>();

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      const res = await apiClient.post('/api/auth/employee/login', {
        employeeCode: values.employeeCode.trim().toUpperCase(),
        password: values.password,
        deviceId,
      });

      const { token, employee } = res.data.data;
      login(token, employee);
      toast.success(`Welcome back, ${employee.name}!`);
      navigate('/employee');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Login failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* App Logo */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/10">
            <QrCodeIcon className="w-9 h-9" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Employee Attendance
        </h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          Sign in on your phone to scan and punch your attendance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 border border-slate-800 py-8 px-6 shadow-2xl rounded-3xl sm:px-10 backdrop-blur-md">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {/* Employee Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Employee Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="h-5 w-5" />
                </div>
                <input
                  {...register('employeeCode', { required: 'Employee code is required' })}
                  type="text"
                  placeholder="e.g. EMP001"
                  className={`w-full pl-11 pr-4 py-3 bg-slate-950/70 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    errors.employeeCode ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.employeeCode && (
                <p className="mt-1 text-xs text-red-400">{errors.employeeCode.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <LockClosedIcon className="h-5 w-5" />
                </div>
                <input
                  {...register('password', { required: 'Password is required' })}
                  type="password"
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-4 py-3 bg-slate-950/70 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    errors.password ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In…</span>
                  </div>
                ) : (
                  'Sign In & Open Scanner'
                )}
              </button>
            </div>
          </form>

          {/* Switch to Admin */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
            >
              Are you an Admin? <span className="font-semibold underline">Login to Admin Portal →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLoginPage;
