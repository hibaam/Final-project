'use client'

import { useState } from 'react'
import { User, LogOut, Settings, UserCircle2 } from 'lucide-react'
import Link from 'next/link'

export function Navbar() {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16 relative">
        {/* Logo on the left */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
  <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
     ArcScan
  </h1>
</Link>


        {/* Avatar with dropdown */}
        <div
          className="relative"
          onMouseEnter={() => setShowMenu(true)}
          onMouseLeave={() => setShowMenu(false)}
        >
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg cursor-pointer">
            <User className="w-5 h-5 text-white" />
          </div>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-xl py-2 border border-gray-100 z-50">
              <Link href="/dashboard/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-2">
                <UserCircle2 className="w-4 h-4" /> Profile
              </Link>
              <Link href="/dashboard/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Settings
              </Link>
              <button
                onClick={() => alert('Logging out...')} // لاحقًا نربطه فعليًا مع auth
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
