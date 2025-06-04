'use client'

import { DashboardNav } from '@/components/dashboard-nav'
import { Navbar } from '@/components/navbar'
import { auth } from '@/lib/firebaseConfig'
import { useAuthState } from 'react-firebase-hooks/auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get current user and loading status using Firebase Auth
  const [user, loading] = useAuthState(auth)

  // Show nothing (or you can use a spinner) while authentication is still loading
  if (loading) return null

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Display different navigation bars based on user authentication status */}
      {user ? <DashboardNav /> : <Navbar />}
      
      {/* Main page content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
