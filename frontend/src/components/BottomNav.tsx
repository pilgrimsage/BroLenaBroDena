import { NavLink } from 'react-router-dom'
import { Home, Users, User } from 'lucide-react'

// Define tabs in an array — makes adding new tabs easy
const tabs = [
  { to: '/',        icon: Home,  label: 'Home'    },
  { to: '/friends', icon: Users, label: 'Friends' },
  { to: '/profile', icon: User,  label: 'Profile' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto z-40
                    bg-white border-t border-gray-100 safe-area-pb">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            // end means EXACT match for '/'
            // Without it, '/' matches everything (/ /friends /profile)
            className={({ isActive }) =>
              // NavLink passes isActive — true when URL matches
              `flex-1 flex flex-col items-center gap-1 py-3 transition-colors text-xs font-medium
               ${isActive
                 ? 'text-brand'
                 : 'text-gray-400 hover:text-gray-600'
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