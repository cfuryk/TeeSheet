import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { loginSchema, LoginFormData } from '@/schemas/userSchemas'
import { Input, Button, Alert } from '@/components/ui'

export function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

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
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-black text-white text-center mb-2">TeeSheet</h1>
        <p className="text-center text-gray-400 mb-8">Sign in to your account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && <Alert message={error} />}
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Sign In
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <hr className="flex-1 border-gray-700" />
          <span className="text-sm text-gray-500">or</span>
          <hr className="flex-1 border-gray-700" />
        </div>

        <Button variant="secondary" onClick={handleGoogle} className="w-full">
          Continue with Google
        </Button>

        <div className="mt-6 text-center text-sm text-gray-500 flex flex-col gap-2">
          <Link to="/forgot-password" className="text-green-400 hover:text-green-300">
            Forgot password?
          </Link>
          <span>
            No account?{' '}
            <Link to="/register" className="text-green-400 font-semibold hover:text-green-300">
              Register
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}
