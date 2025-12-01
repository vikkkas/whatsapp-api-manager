import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authAPI } from '../lib/api';

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: 'admin@demo.com',
    password: 'admin123'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Check if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/inbox');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.login(credentials.email, credentials.password);
      console.log('Login successful:', response.data.user);
      
      if (window.location.pathname !== '/inbox') {
        navigate('/inbox');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Branding (Black) */}
      <div className="hidden lg:flex lg:w-1/2 bg-black p-12 flex-col justify-between relative overflow-hidden text-white">
        {/* Abstract Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-64 h-64 bg-purple-600 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 text-white">
            <span className="text-2xl font-extrabold tracking-tight">
              WhatsApp<span className="text-yellow-400">Pro</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10">
          <h2 className="text-5xl font-black leading-tight mb-8">
            Welcome back to<br />
            your dashboard
          </h2>
          <div className="space-y-6">
            {[
              'Manage your conversations',
              'View real-time analytics',
              'Update automation flows',
              'Monitor team performance'
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-4 text-gray-300">
                <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-black">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-lg font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-gray-500 text-sm font-medium">
          © 2025 WhatsAppPro. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form (White) */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white text-black">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="text-2xl font-extrabold tracking-tight">
                WhatsApp<span className="text-[#4c47ff]">Pro</span>
              </span>
            </Link>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black text-black mb-2">Sign in</h2>
            <p className="text-gray-500 font-medium">Access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-bold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-black mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  name="email"
                  type="email"
                  required
                  value={credentials.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-black outline-none transition-all font-medium"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  name="password"
                  type="password"
                  required
                  value={credentials.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-black outline-none transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-black text-white rounded-lg font-bold text-lg hover:bg-gray-900 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-sm font-medium text-gray-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-black font-bold hover:underline">
                Create free account
              </Link>
            </p>

            <p className="text-sm font-medium text-gray-500">
              Are you an agent?{' '}
              <Link to="/agent-login" className="text-black font-bold hover:underline">
                Agent Login
              </Link>
            </p>
            
            <div className="text-xs text-gray-400">
              Demo credentials: admin@demo.com / admin123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;