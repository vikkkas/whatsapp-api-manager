import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, ArrowLeft, Mail, Lock, User, Building2, 
  CheckCircle2, Eye, EyeOff, Loader2, MessageSquare
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../lib/api';
import { toast } from 'sonner';

const API_BASE_URL = (import.meta.env as any).VITE_BACKEND_URL || 'http://localhost:3000';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Account
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2: Personal Info
    name: '',
    phone: '',
    
    // Step 3: Company Info
    companyName: '',
    industry: '',
    teamSize: '',
    useCase: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const industries = [
    'E-commerce',
    'Healthcare',
    'Education',
    'Real Estate',
    'Finance',
    'Technology',
    'Retail',
    'Other'
  ];

  const teamSizes = [
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '500+'
  ];

  const useCases = [
    'Customer Support',
    'Marketing',
    'Sales',
    'Notifications',
    'All of the above'
  ];

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }

      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (currentStep === 2) {
      if (!formData.name) {
        newErrors.name = 'Name is required';
      }
    }

    if (currentStep === 3) {
      if (!formData.companyName) {
        newErrors.companyName = 'Company name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setLoading(true);
    try {
      // Register user - using the correct API signature
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          tenantName: formData.companyName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create account');
      }

      toast.success('Account created successfully!');
      
      // Auto-login after registration
      const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (loginResponse.ok) {
        const data = await loginResponse.json();
        // Store token and navigate
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength, label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength, label: 'Good', color: 'bg-blue-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

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
            Join 10,000+ brands<br />
            automating growth
          </h2>
          <div className="space-y-6">
            {[
              'Send unlimited messages',
              'Automate customer conversations',
              'Track analytics in real-time',
              '24/7 customer support'
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

          {/* Progress Indicator */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    s < step ? 'bg-black text-white' :
                    s === step ? 'bg-yellow-400 text-black' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`flex-1 h-0.5 mx-2 transition-all ${
                      s < step ? 'bg-black' : 'bg-gray-100'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Steps */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-3xl font-black text-black mb-2">Create account</h2>
                <p className="text-gray-500 mb-8 font-medium">Get started with your 14-day free trial</p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-black mb-2">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:ring-0 focus:border-black outline-none transition-all font-medium ${
                          errors.email ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="you@company.com"
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-sm text-red-500 font-bold">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full pl-10 pr-12 py-3 border-2 rounded-lg focus:ring-0 focus:border-black outline-none transition-all font-medium ${
                          errors.password ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${passwordStrength.color} transition-all`}
                              style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-500">{passwordStrength.label}</span>
                        </div>
                      </div>
                    )}
                    {errors.password && <p className="mt-1 text-sm text-red-500 font-bold">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black mb-2">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className={`w-full pl-10 pr-12 py-3 border-2 rounded-lg focus:ring-0 focus:border-black outline-none transition-all font-medium ${
                          errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-sm text-red-500 font-bold">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full mt-8 py-4 bg-black text-white rounded-lg font-bold text-lg hover:bg-gray-900 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="h-5 w-5" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-3xl font-black text-black mb-2">Personal details</h2>
                <p className="text-gray-500 mb-8 font-medium">Help us personalize your experience</p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-black mb-2">
                      Full name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:ring-0 focus:border-black outline-none transition-all font-medium ${
                          errors.name ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="John Doe"
                      />
                    </div>
                    {errors.name && <p className="mt-1 text-sm text-red-500 font-bold">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black mb-2">
                      Phone number (optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-black outline-none transition-all font-medium"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-4 border-2 border-gray-200 text-black rounded-lg font-bold hover:border-black transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 py-4 bg-black text-white rounded-lg font-bold hover:bg-gray-900 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  >
                    Continue
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-3xl font-black text-black mb-2">Company details</h2>
                <p className="text-gray-500 mb-8 font-medium">Almost done! Just a few more details</p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-black mb-2">
                      Company name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:ring-0 focus:border-black outline-none transition-all font-medium ${
                          errors.companyName ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="Acme Inc."
                      />
                    </div>
                    {errors.companyName && <p className="mt-1 text-sm text-red-500 font-bold">{errors.companyName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black mb-2">
                      Industry
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-black outline-none transition-all font-medium bg-white"
                    >
                      <option value="">Select industry</option>
                      {industries.map((industry) => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black mb-2">
                      Team size
                    </label>
                    <select
                      value={formData.teamSize}
                      onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-black outline-none transition-all font-medium bg-white"
                    >
                      <option value="">Select team size</option>
                      {teamSizes.map((size) => (
                        <option key={size} value={size}>{size} employees</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black mb-2">
                      Primary use case
                    </label>
                    <select
                      value={formData.useCase}
                      onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-black outline-none transition-all font-medium bg-white"
                    >
                      <option value="">Select use case</option>
                      {useCases.map((useCase) => (
                        <option key={useCase} value={useCase}>{useCase}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-4 border-2 border-gray-200 text-black rounded-lg font-bold hover:border-black transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-4 bg-black text-white rounded-lg font-bold hover:bg-gray-900 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create account
                        <CheckCircle2 className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-black font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
