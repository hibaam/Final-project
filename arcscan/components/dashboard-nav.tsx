'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/firebaseConfig'
import { useAuthState } from 'react-firebase-hooks/auth'
import { useRouter } from 'next/navigation'

export function DashboardNav() {
  const [user] = useAuthState(auth)
  const router = useRouter()

  const handleLogout = async () => {
    await auth.signOut()
    router.push('/login') 
  }

  if (!user) return null

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* site logo*/}
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-semibold text-gray-800">
              ArcScan Dashboard
            </Link>
          </div>

          {/* movement*/}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Home</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/history">History</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/profile">Profile</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/settings">Settings</Link>
            </Button>

            {/* email*/}
            <span className="text-sm text-gray-600">{user.email}</span>

            {/* sign out*/}
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
