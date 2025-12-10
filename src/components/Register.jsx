import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  HiOutlineMail, 
  HiOutlineLockClosed, 
  HiOutlineUser, 
  HiOutlinePhone,
  HiOutlineGlobe,
  HiOutlineCalendar,
  HiOutlineArrowRight,
  HiOutlineBriefcase,
  HiOutlineShoppingBag
} from 'react-icons/hi'
import { useApiFetch } from '../hooks/useApiFetch.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import AuthPage from './AuthPage.jsx'
import AddressForm from './address/AddressForm.jsx'
import GoogleLoginButton from './Google.jsx'

function calculateAge(dateString) {
  const dob = new Date(dateString)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const hasNotHadBirthdayThisYear =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  if (hasNotHadBirthdayThisYear) age -= 1
  return age
}

function Register() {
  const { accessToken, setAccessToken, setUser } = useAuth();
  const [role, setRole] = useState('') // 'customer' | 'freelancer'
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    nationality: '',
    dateOfBirth: '',
    gender: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState('register')
  const navigate = useNavigate()
  const { postJson } = useApiFetch()

  const handleAddressSuccess = useCallback(() => {
    navigate('/dashboard', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (!accessToken) return
    if (step === 'address') return
    navigate('/dashboard', { replace: true })
  }, [accessToken, navigate, step])

  const isUnderage = useMemo(() => {
    if (!formData.dateOfBirth) return false
    return calculateAge(formData.dateOfBirth) < 15
  }, [formData.dateOfBirth])

  function handleFieldChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear field error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }))
    }
  }

  function validate() {
    const nextErrors = {}
    if (!role) nextErrors.role = 'Please choose how you want to use E8GHT.'
    if (!formData.email) nextErrors.email = 'Email is required.'
    if (!formData.fullName) nextErrors.fullName = 'Full name is required.'
    if (!formData.phone) nextErrors.phone = 'Phone is required.'
    if (!formData.nationality) nextErrors.nationality = 'Nationality is required.'
    if (!formData.dateOfBirth) nextErrors.dateOfBirth = 'Date of birth is required.'
    if (isUnderage) nextErrors.dateOfBirth = 'You must be at least 15 years old.'
    if (!formData.gender) nextErrors.gender = 'Gender is required.'
    if (!formData.password) nextErrors.password = 'Password is required.'
    else if (formData.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'
    if (!formData.confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.'
    else if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.'
    return nextErrors
  }

  function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    
    setSubmitted(false)
    setIsLoading(true)
    
    postJson('/users', {
      email: formData.email,
      full_name: formData.fullName,
      phone: formData.phone,
      role,
      gender: formData.gender,
      nationality: formData.nationality,
      date_of_birth: formData.dateOfBirth,
      password: formData.password,
    })
      .then((data) => {
        setSubmitted(true)

        const nextAccessToken = data?.access_token ?? null
        const nextUser = data?.user ?? null

        setAccessToken(nextAccessToken)
        setUser(nextUser)
        setErrors({})
        setStep('address')
      })
      .catch((error) => {
        setErrors({ submit: error.message })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  if (accessToken && step !== 'address') {
    return null
  }

  if (step === 'address') {
    return (
      <AuthPage 
        title="Almost there!" 
        subtitle="Add your default address to complete your account setup"
      >
        {submitted && (
          <div className="auth-success" role="status">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15"/>
              <path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Account created successfully!</span>
          </div>
        )}
        <AddressForm
          submitLabel="Save address"
          submittingLabel="Saving address..."
          onSuccess={handleAddressSuccess}
        />
      </AuthPage>
    )
  }

  return (
    <AuthPage
      title="Create your account"
      subtitle="Join E8GHT and connect with talented freelancers"
      footer={<>
        Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
      </>}
    >
      <GoogleLoginButton
        redirectTo="/dashboard"
        onStart={() => setErrors({})}
        onSuccess={() => setErrors({})}
        onError={(message) => setErrors({ submit: message ?? 'Unable to sign up with Google.' })}
        buttonLabel="Sign up with Google"
      />

      <div className="auth-divider">
        <span>or create account with email</span>
      </div>

      {/* Role Selection */}
      <div className="role-selection">
        <p className="role-selection__label">How would you like to use E8GHT?</p>
        <div className="role-selection__options">
          <button
            type="button"
            className={`role-card${role === 'customer' ? ' role-card--active' : ''}`}
            onClick={() => {
              setRole('customer')
              if (errors.role) setErrors((prev) => ({ ...prev, role: null }))
            }}
          >
            <span className="role-card__icon">
              <HiOutlineShoppingBag size={24} />
            </span>
            <span className="role-card__content">
              <span className="role-card__title">I'm a Customer</span>
              <span className="role-card__desc">Looking to hire freelancers</span>
            </span>
          </button>
          <button
            type="button"
            className={`role-card${role === 'freelancer' ? ' role-card--active' : ''}`}
            onClick={() => {
              setRole('freelancer')
              if (errors.role) setErrors((prev) => ({ ...prev, role: null }))
            }}
          >
            <span className="role-card__icon">
              <HiOutlineBriefcase size={24} />
            </span>
            <span className="role-card__content">
              <span className="role-card__title">I'm a Freelancer</span>
              <span className="role-card__desc">Want to offer my services</span>
            </span>
          </button>
        </div>
        {errors.role && <small className="auth-field-error">{errors.role}</small>}
      </div>

      {errors.submit && (
        <div className="auth-error" role="alert">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.15"/>
            <path d="M8 4v4m0 2.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>{errors.submit}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-form__grid">
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email address</label>
            <div className="auth-input-wrapper">
              <HiOutlineMail className="auth-input-icon" />
              <input
                id="email"
                type="email"
                className={`auth-input${errors.email ? ' auth-input--error' : ''}`}
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            {errors.email && <small className="auth-field-error">{errors.email}</small>}
          </div>

          <div className="auth-field">
            <label htmlFor="fullName" className="auth-label">Full Name</label>
            <div className="auth-input-wrapper">
              <HiOutlineUser className="auth-input-icon" />
              <input
                id="fullName"
                type="text"
                className={`auth-input${errors.fullName ? ' auth-input--error' : ''}`}
                value={formData.fullName}
                onChange={(e) => handleFieldChange('fullName', e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
              />
            </div>
            {errors.fullName && <small className="auth-field-error">{errors.fullName}</small>}
          </div>

          <div className="auth-field">
            <label htmlFor="phone" className="auth-label">Phone Number</label>
            <div className="auth-input-wrapper">
              <HiOutlinePhone className="auth-input-icon" />
              <input
                id="phone"
                type="tel"
                className={`auth-input${errors.phone ? ' auth-input--error' : ''}`}
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="+1 555 123 4567"
                autoComplete="tel"
              />
            </div>
            {errors.phone && <small className="auth-field-error">{errors.phone}</small>}
          </div>

          <div className="auth-field">
            <label htmlFor="nationality" className="auth-label">Nationality</label>
            <div className="auth-input-wrapper">
              <HiOutlineGlobe className="auth-input-icon" />
              <input
                id="nationality"
                type="text"
                className={`auth-input${errors.nationality ? ' auth-input--error' : ''}`}
                value={formData.nationality}
                onChange={(e) => handleFieldChange('nationality', e.target.value)}
                placeholder="e.g., Egyptian"
              />
            </div>
            {errors.nationality && <small className="auth-field-error">{errors.nationality}</small>}
          </div>

          <div className="auth-field">
            <label htmlFor="dateOfBirth" className="auth-label">Date of Birth</label>
            <div className="auth-input-wrapper">
              <HiOutlineCalendar className="auth-input-icon" />
              <input
                id="dateOfBirth"
                type="date"
                className={`auth-input${errors.dateOfBirth ? ' auth-input--error' : ''}`}
                value={formData.dateOfBirth}
                onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
              />
            </div>
            {errors.dateOfBirth && <small className="auth-field-error">{errors.dateOfBirth}</small>}
          </div>

          <div className="auth-field">
            <label htmlFor="gender" className="auth-label">Gender</label>
            <div className="auth-input-wrapper auth-input-wrapper--select">
              <select
                id="gender"
                className={`auth-input auth-select${errors.gender ? ' auth-input--error' : ''}`}
                value={formData.gender}
                onChange={(e) => handleFieldChange('gender', e.target.value)}
              >
                <option value="" disabled>Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            {errors.gender && <small className="auth-field-error">{errors.gender}</small>}
          </div>
        </div>

        <div className="auth-field auth-field--full">
          <label htmlFor="password" className="auth-label">Password</label>
          <div className="auth-input-wrapper">
            <HiOutlineLockClosed className="auth-input-icon" />
            <input
              id="password"
              type="password"
              className={`auth-input${errors.password ? ' auth-input--error' : ''}`}
              value={formData.password}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              placeholder="Min. 8 characters"
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {errors.password && <small className="auth-field-error">{errors.password}</small>}
        </div>

        <div className="auth-field auth-field--full">
          <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
          <div className="auth-input-wrapper">
            <HiOutlineLockClosed className="auth-input-icon" />
            <input
              id="confirmPassword"
              type="password"
              className={`auth-input${errors.confirmPassword ? ' auth-input--error' : ''}`}
              value={formData.confirmPassword}
              onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
              placeholder="Re-enter password"
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {errors.confirmPassword && <small className="auth-field-error">{errors.confirmPassword}</small>}
        </div>

        <button 
          type="submit" 
          className="btn btn-primary auth-submit"
          disabled={isLoading}
        >
          <span>{isLoading ? 'Creating account...' : 'Create account'}</span>
          {!isLoading && <HiOutlineArrowRight />}
        </button>
      </form>
    </AuthPage>
  )
}

export default Register
