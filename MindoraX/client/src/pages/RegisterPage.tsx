import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { registerSchema, RegisterFormData } from '../utils/validators';
import FormInput from '../components/FormInput';
import LoadingSpinner from '../components/LoadingSpinner';
import axiosInstance from '../api/axiosInstance';

// ── Password strength calculation ────────────────────────────────────────────
function getPasswordStrength(pass: string) {
  if (!pass) return 0;
  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 12) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'var(--error)', 'var(--warning)', '#60a5fa', 'var(--success)'];

// ── Username availability states ─────────────────────────────────────────────
type AvailState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const RegisterPage: React.FC = () => {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [usernameState, setUsernameState] = useState<AvailState>('idle');
  const [usernameMsg, setUsernameMsg] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isValid, isDirty },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange', // validate on every keystroke
  });

  const passwordValue = watch('password') || '';
  const usernameValue = watch('username') || '';
  const strength = getPasswordStrength(passwordValue);

  // ── Debounced username availability check ──────────────────────────────────
  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameState('idle');
      setUsernameMsg('');
      return;
    }
    setUsernameState('checking');
    try {
      const res = await axiosInstance.get(`/users/check-username?username=${encodeURIComponent(username)}`);
      if (res.data.available) {
        setUsernameState('available');
        setUsernameMsg(res.data.message);
      } else {
        setUsernameState('taken');
        setUsernameMsg(res.data.message);
      }
    } catch {
      setUsernameState('idle');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!errors.username) checkUsername(usernameValue);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [usernameValue, errors.username, checkUsername]);

  // ── Form submit ────────────────────────────────────────────────────────────
  const onSubmit = async (data: RegisterFormData) => {
    if (usernameState === 'taken') {
      setError('username', { message: 'This username is already taken.' });
      return;
    }

    setIsLoading(true);
    setApiErrors({});

    // Strip confirmPassword before sending to API
    const { confirmPassword: _, ...payload } = data;

    try {
      await authRegister(payload);
      toast.success('Welcome to MindoraX! 🎉');
      navigate('/');
    } catch (error: any) {
      const resp = error.response?.data;
      if (resp?.errors?.length) {
        // Map field-level errors from backend
        const fieldErrors: Record<string, string> = {};
        resp.errors.forEach((e: { field: string; message: string }) => {
          fieldErrors[e.field] = e.message;
          setError(e.field as keyof RegisterFormData, { message: e.message });
        });
        setApiErrors(fieldErrors);
      } else {
        toast.error(resp?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Submit is disabled unless form is valid, username available, and not loading
  const canSubmit = isValid && isDirty && usernameState !== 'taken' && !isLoading;

  // ── Username feedback icon / message ───────────────────────────────────────
  const usernameAdornment = () => {
    if (usernameState === 'checking') return <LoadingSpinner size="sm" />;
    if (usernameState === 'available') return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
    if (usernameState === 'taken') return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
    return null;
  };

  return (
    <div className="auth-page flex-center">
      <div className="auth-card card card-glass">

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="auth-logo text-gradient">MindoraX</div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-heading)', margin: '0.5rem 0 0.25rem' }}>
            Create your account
          </h1>
          <p className="auth-subtitle" style={{ marginBottom: 0 }}>Join thousands connecting on MindoraX</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Display Name */}
          <FormInput
            id="displayName"
            label="Display Name"
            placeholder="John Doe"
            register={register('displayName')}
            error={errors.displayName?.message || apiErrors.displayName}
          />

          {/* Username + availability */}
          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <input
                id="username"
                autoComplete="username"
                placeholder="john_doe123"
                className={`form-input${errors.username || usernameState === 'taken' ? ' input-error' : ''}${usernameValue.length >= 3 ? ' has-suffix' : ''}`}
                {...register('username')}
              />
              {usernameValue.length >= 3 && (
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                  {usernameAdornment()}
                </span>
              )}
            </div>
            {(errors.username?.message || usernameMsg) && (
              <span className="form-error" style={{ color: usernameState === 'available' ? 'var(--success)' : undefined }}>
                {usernameState !== 'available' && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
                {errors.username?.message || usernameMsg}
              </span>
            )}
          </div>

          {/* Email */}
          <FormInput
            id="email"
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="john@example.com"
            register={register('email')}
            error={errors.email?.message || apiErrors.email}
          />

          {/* Password + strength meter */}
          <div className="form-group">
            <FormInput
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              register={register('password')}
              error={errors.password?.message}
            />
            {passwordValue.length > 0 && (
              <div>
                <div className="password-strength-bar">
                  {[1, 2, 3, 4].map((lvl) => (
                    <div
                      key={lvl}
                      className="strength-segment"
                      style={{ backgroundColor: strength >= lvl ? STRENGTH_COLORS[strength] : undefined }}
                    />
                  ))}
                </div>
                {strength > 0 && (
                  <span className="strength-label" style={{ color: STRENGTH_COLORS[strength] }}>
                    {STRENGTH_LABELS[strength]} password
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <FormInput
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            register={register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={!canSubmit}
            style={{ marginTop: '0.5rem' }}
          >
            {isLoading ? <><LoadingSpinner size="sm" /> Creating account…</> : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
