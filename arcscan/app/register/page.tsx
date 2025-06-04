'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db } from '@/lib/firebaseConfig'
import { doc, setDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

export default function Register() {
  const router = useRouter()

  // This state holds the form input values (name, email, password)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  // A loading flag to disable the form while waiting for async operations
  const [loading, setLoading] = useState(false)

  // Handles input field changes and updates formData state accordingly
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }))
  }

  // Handles form submission and triggers user registration logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Step 1: Create a new user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      )
      const user = userCredential.user

      // Step 2: Update the displayName field in Firebase user profile
      await updateProfile(user, {
        displayName: formData.name,
      })

      // Step 3: Store user data in Firestore under "users" collection
      await setDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        email: formData.email,
        createdAt: new Date(), // Timestamp of account creation
      })

      // Step 4: Navigate to the dashboard page after successful registration
      router.push('/dashboard')
    } catch (error: any) {
      // If any error occurs during the signup process, display an alert
      console.error('Signup error:', error)
      alert(error.message || 'Signup failed')
    } finally {
      // Re-enable the form by setting loading to false
      setLoading(false)
    }
  }

  // JSX for the registration form UI
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Register</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field */}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email field */}
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

          {/* Password field */}
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

          {/* Submit button */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </Button>
        </form>
      </div>
    </div>
  )
}
