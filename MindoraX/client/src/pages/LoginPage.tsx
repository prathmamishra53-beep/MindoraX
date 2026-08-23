import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { loginSchema, LoginFormData } from '../utils/validators';
import FormInput from '../components/FormInput';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await login(data);
      toast.success('Welcome back! 👋');
      navigate('/');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Invalid credentials. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page flex-center">
      <div className="auth-card card card-glass">

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="auth-logo text-gradient">MindoraX</div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-heading)', margin: '0.5rem 0 0.25rem' }}>
            Welcome back
          </h1>
          <p className="auth-subtitle" style={{ marginBottom: 0 }}>Log in to continue to your account</p>
        </div>

        {/* Inline error banner */}
        {errorMsg && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Email or Username */}
          <FormInput
            id="identifier"
            label="Email or Username"
            type="text"
            autoComplete="username"
            placeholder="john@example.com or john_doe"
            register={register('identifier')}
            error={errors.identifier?.message}
          />

          {/* Password */}
          <div className="form-group">
            <FormInput
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              register={register('password')}
              error={errors.password?.message}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.375rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: 'var(--accent)', width: '14px', height: '14px' }} />
                Remember me
              </label>
              <a
                href="#"
                style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              >
                Forgot password?
              </a>
            </div>
          </div>

          {/* Submit — disabled until both fields filled */}
          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={!isValid || !isDirty || isLoading}
            style={{ marginTop: '0.5rem' }}
          >
            {isLoading ? <><LoadingSpinner size="sm" /> Logging in…</> : 'Log In'}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">or</div>

        {/* Register prompt */}
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign up free</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
