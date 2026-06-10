'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-r-transparent">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600">
            <span className="text-sm font-semibold tracking-tight text-white">JKKN</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">JKKN Mentor</h1>
          <p className="mt-1 text-sm text-gray-500">Mentoring dashboard for JKKN Institutions</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-medium text-gray-900">Sign in</h2>
          <p className="mt-1 mb-6 text-sm text-gray-500">
            Use your MyJKKN account to continue
          </p>

          <button
            onClick={login}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
            aria-label="Sign in with MyJKKN account"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            Sign in with MyJKKN
          </button>

          <p className="mt-6 text-center text-xs text-gray-400">
            By signing in, you agree to our{' '}
            <a href="#" className="text-gray-500 underline hover:text-gray-700">
              Terms
            </a>{' '}
            and{' '}
            <a href="#" className="text-gray-500 underline hover:text-gray-700">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} JKKN Institutions
        </p>
      </div>
    </div>
  );
}
