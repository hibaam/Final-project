import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function DashboardNav() {
  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-semibold text-gray-800">
              ArcScan Dashboard
            </Link>
          </div>
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
            <Button variant="outline">Logout</Button>
          </div>
        </div>
      </div>
    </nav>
  )
}

