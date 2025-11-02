import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApiFetch } from '../hooks/useApiFetch.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { writeStoredUser } from '../utils/storage'
import AuthPage from './AuthPage.jsx'

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
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const navigate = useNavigate()
  const { postJson } = useApiFetch()

  useEffect(() => {
    if (!accessToken) return
    navigate('/dashboard', { replace: true })
  }, [accessToken, navigate])

  const isUnderage = useMemo(() => {
    if (!formData.dateOfBirth) return false
    return calculateAge(formData.dateOfBirth) < 15
  }, [formData.dateOfBirth])

  function handleFieldChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function validate() {
    const nextErrors = {}
    if (!role) nextErrors.role = 'Please choose account type.'
    if (!formData.email) nextErrors.email = 'Email is required.'
    if (!formData.fullName) nextErrors.fullName = 'Full name is required.'
    if (!formData.phone) nextErrors.phone = 'Phone is required.'
    if (!formData.nationality) nextErrors.nationality = 'Nationality is required.'
    if (!formData.dateOfBirth) nextErrors.dateOfBirth = 'Date of birth is required.'
    if (isUnderage) nextErrors.dateOfBirth = 'You must be at least 15 years old.'
    if (!formData.gender) nextErrors.gender = 'Gender is required.'
    if (!formData.password) nextErrors.password = 'Password is required.'
    return nextErrors
  }

  function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setSubmitted(false)
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

        writeStoredUser(nextUser)

        const redirectTo = data?.redirect_to
        if (redirectTo) {
          navigate(redirectTo, { replace: true })
          return
        }

        navigate('/dashboard', { replace: true })
      })
      .catch((error) => {
        setErrors({ submit: error.message })
      })
  }

  if (accessToken) {
    return null
  }

  return (
    <AuthPage
      title="Create your account"
      footer={<>
        Already have an account? <Link to="/login">Log in</Link>
      </>}
    >
      {/* Step 1: Choose role */}
      <div className="role-select">
        <p className="label-inline">How would you like to use the platform?</p>
        <div className="role-options">
          <button
            type="button"
            className={`role-card${role === 'customer' ? ' active' : ''}`}
            onClick={() => setRole('customer')}
          >
            I'm a Customer
          </button>
          <button
            type="button"
            className={`role-card${role === 'freelancer' ? ' active' : ''}`}
            onClick={() => setRole('freelancer')}
          >
            I'm a Freelancer
          </button>
        </div>
        {errors.role && <div className="form-error" role="alert">{errors.role}</div>}
      </div>

      {/* Step 2: Details */}
      <form onSubmit={handleSubmit} className="form">
        {errors.submit && <div className="form-error" role="alert">{errors.submit}</div>}
        <label className="label">
          <span>Email</span>
          <input
            type="email"
            className="input"
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            placeholder="you@example.com"
            required
          />
          {errors.email && <small className="field-error">{errors.email}</small>}
        </label>

        <label className="label">
          <span>Full Name</span>
          <input
            type="text"
            className="input"
            value={formData.fullName}
            onChange={(e) => handleFieldChange('fullName', e.target.value)}
            placeholder="Jane Doe"
            required
          />
          {errors.fullName && <small className="field-error">{errors.fullName}</small>}
        </label>

        <label className="label">
          <span>Phone</span>
          <input
            type="tel"
            className="input"
            value={formData.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="+1 555 123 4567"
            required
          />
          {errors.phone && <small className="field-error">{errors.phone}</small>}
        </label>

        <label className="label">
          <span>Nationality</span>
          <input
            type="text"
            className="input"
            value={formData.nationality}
            onChange={(e) => handleFieldChange('nationality', e.target.value)}
            placeholder="e.g., Egyptian"
            required
          />
          {errors.nationality && <small className="field-error">{errors.nationality}</small>}
        </label>

        <label className="label">
          <span>Date of Birth</span>
          <input
            type="date"
            className="input"
            value={formData.dateOfBirth}
            onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
            required
          />
          {errors.dateOfBirth && <small className="field-error">{errors.dateOfBirth}</small>}
        </label>

        <label className="label">
          <span>Gender</span>
          <select
            className="input"
            value={formData.gender}
            onChange={(e) => handleFieldChange('gender', e.target.value)}
            required
          >
            <option value="" disabled>Choose...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {errors.gender && <small className="field-error">{errors.gender}</small>}
        </label>

        <label className="label">
          <span>Password</span>
          <input
            type="password"
            className="input"
            value={formData.password}
            onChange={(e) => handleFieldChange('password', e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
          />
          {errors.password && <small className="field-error">{errors.password}</small>}
        </label>

        <button type="submit" className="btn btn-primary">Create account</button>
        {submitted && (
          <p className="success-msg">Account created. You can now log in.</p>
        )}
      </form>
    </AuthPage>
  )
}

export default Register


