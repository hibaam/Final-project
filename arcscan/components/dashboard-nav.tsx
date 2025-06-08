'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebaseConfig'

export function DashboardNav() {
  const [user] = useAuthState(auth)
  const pathname = usePathname()

  if (!user) return null

  const getPageTitle = () => {
    if (pathname.includes('/history')) return 'History'
    if (pathname.includes('/profile')) return 'Profile'
    if (pathname.includes('/settings')) return 'Settings'
    return 'ArcScan Dashboard'
  }

  return (
    <nav className="bg-white shadow-sm border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">

        {/* Left side: Title + Links */}
        <div className="flex items-center space-x-6">
          <div className="text-xl font-semibold text-gray-800">
            {getPageTitle()}
          </div>

          <Link href="/dashboard" className="text-sm text-gray-700 hover:text-purple-600 font-medium flex items-center gap-1">
  📊 Dashboard
</Link>
<Link href="/dashboard/history" className="text-sm text-gray-700 hover:text-purple-600 font-medium flex items-center gap-1">
  📚 History
</Link>
<Link href="/dashboard/profile" className="text-sm text-gray-700 hover:text-purple-600 font-medium flex items-center gap-1">
  👤 Profile
</Link>
<Link href="/dashboard/settings" className="text-sm text-gray-700 hover:text-purple-600 font-medium flex items-center gap-1">
  ⚙️ Settings
</Link>

        </div>

        {/* Right side: Email */}
        <span className="text-sm text-gray-600">{user.email}</span>
      </div>
    </nav>
  )
}
