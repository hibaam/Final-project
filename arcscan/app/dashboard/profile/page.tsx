'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { auth, db } from '@/lib/firebaseConfig'
import { useAuthState } from 'react-firebase-hooks/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import {
  updateProfile,
  updateEmail,
  updatePassword,
} from 'firebase/auth'

export default function UserProfile() {
  // Get current authenticated user and loading state
  const [user, loadingAuth] = useAuthState(auth)

  // Store user info in form state
  const [formData, setFormData] = useState({ name: '', email: '' })

  // Track password change field separately
  const [newPassword, setNewPassword] = useState('')

  // UI states: loading user data, saving changes, and showing success
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Load user data from Firestore or fallback to Firebase Auth values
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const docRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setFormData({
            name: data.name || '',
            email: data.email || '',
          })
        } else {
          setFormData({
            name: user.displayName || '',
            email: user.email || '',
          })
        }

        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Handle input changes and update form state
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Handle profile form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)

    try {
      // Step 1: Update user's display name in Firebase Auth
      await updateProfile(user, { displayName: formData.name })

      // Step 2: If email has changed, update it in Firebase Auth
      if (user.email !== formData.email) {
        await updateEmail(user, formData.email)
      }

      // Step 3: If a new password was entered, update it
      if (newPassword.trim()) {
        await updatePassword(user, newPassword)
      }

      // Step 4: Update Firestore user document with new data
      await updateDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        email: formData.email,
        updatedAt: new Date(),
      })

      // Show success message
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error: any) {
      // Catch and display any errors during update
      console.error('Error updating profile:', error)
      alert(error.message || 'An error occurred while updating profile.')
    } finally {
      setSaving(false)
    }
  }

  // Show loading message while user data is being fetched
  if (loadingAuth || loading) return <p className="p-6">Loading user data...</p>

  return (
    <div className="space-y-8 max-w-xl mx-auto py-10">
      <h1 className="text-3xl font-bold">User Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name input field */}
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

            {/* Email input field */}
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

            {/* New password input field (optional) */}
            <div>
              <Label htmlFor="newPassword">New Password (optional)</Label>
              <Input
                type="password"
                id="newPassword"
                name="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {/* Save button */}
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>

            {/* Success message after update */}
            {success && (
              <p className="text-green-600 text-sm mt-2">
                ✅ Profile updated successfully.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
