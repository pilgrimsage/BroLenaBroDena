import { NavLink } from 'react-router-dom'
import { Home, Users, Ghost, User } from 'lucide-react'

const tabs = [
  { to: '/',        icon: Home,  label: 'Home'    },
  { to: '/friends', icon: Users, label: 'Friends' },
  { to: '/guests',  icon: Ghost, label: 'Guests'  },
  { to: '/profile', icon: User,  label: 'Profile' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto z-40 safe-bottom
                    bg-white/90 dark:bg-gray-900/90 backdrop-blur-md
                    border-t border-gray-100 dark:border-white/5">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3
               transition-colors text-xs font-medium
               ${isActive
                 ? 'text-brand'
                 : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
               }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}