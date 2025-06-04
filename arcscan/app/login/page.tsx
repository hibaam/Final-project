'use client'

import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth'
import { auth } from '@/lib/firebaseConfig'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()

  // State to store user input for email and password
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  // State for loading spinner and error message
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Handle changes to input fields and update state
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Handle form submission for email/password login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Attempt to sign in the user using Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      )

      // Log the user information (for debug purposes)
      console.log('Logged in:', userCredential.user)

      // Reset the form after successful login
      setFormData({ email: '', password: '' })

      // Navigate to the dashboard
      router.push('/dashboard')
    } catch (error: any) {
      // Handle any login errors (e.g., wrong password, user not found)
      console.error('Login error:', error)
      setError(error.message || 'Login failed')
    } finally {
      // Reset loading state after operation completes
      setLoading(false)
    }
  }

  // Handle login with Google using Firebase Auth provider
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      // Set up Google provider and initiate popup-based login
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Log the result (for debug purposes)
      console.log('Google login:', result.user)

      // Navigate to the dashboard after successful login
      router.push('/dashboard')
    } catch (error: any) {
      // Handle any errors that occur during Google login
      console.error('Google login error:', error)
      setError(error.message || 'Google login failed')
    } finally {
      // Stop showing loading indicator
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>

        {/* Display error message if any */}
        {error && (
          <div className="text-red-500 text-sm mb-4 text-center">{error}</div>
        )}

        {/* Login form for email and password */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          {/* Submit button for email/password login */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        {/* Google login and registration link section */}
        <div className="space-y-4 mt-6">
          {/* Google authentication button */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full"
            disabled={loading}
          >
            Continue with Google
          </Button>

          {/* Link to register page */}
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/register" className="text-blue-600 hover:underline">
              Register here
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
