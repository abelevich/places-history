'use client'

import { useAuth } from '@/contexts/AuthContext'

export function UserProfile() {
  const { user, signOut } = useAuth()

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">
          {user.user_metadata?.username || user.email}
        </p>
        <p className="text-xs text-gray-500">{user.email}</p>
      </div>
      <button
        onClick={handleSignOut}
        className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm font-medium transition-colors border border-red-200 hover:border-red-300"
      >
        Sign Out
      </button>
    </div>
  )
}
