import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { loginSchema, LoginFormData } from '@/schemas/userSchemas'
import { Input, Button, Alert } from '@/components/ui'

export function LoginPage() {
  const { signIn, signInWithGoogle, currentUser, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  if (!loading && currentUser) return <Navigate to="/" replace />

  async function onSubmit(data: LoginFormData) {
    try {
      setError('')
      await signIn(data.email, data.password)
      navigate('/')
    } catch {
      setError('Invalid email or password')
    }
  }

  async function handleGoogle() {
    try {
      setError('')
      await signInWithGoogle()
      navigate('/')
    } catch {
      setError('Google sign-in failed')
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <img src="/images/events/USBROPEN_LOGIN3.png" alt="USBROPEN" className="w-3/4 h-auto mx-auto" />
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && <Alert message={error} />}
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Sign In
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <hr className="flex-1 border-card-border" />
          <span className="text-sm text-muted">or</span>
          <hr className="flex-1 border-card-border" />
        </div>

        <Button variant="secondary" onClick={handleGoogle} className="w-full">
          Continue with Google
        </Button>

        <div className="mt-6 text-center text-sm text-muted flex flex-col gap-2">
          <Link to="/forgot-password" className="text-brand hover:text-brand/70">
            Forgot password?
          </Link>
          <span>
            No account?{' '}
            <Link to="/register" className="text-brand font-semibold hover:text-brand/70">
              Register
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}
