'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Sidebar() {

  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const menu = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: '📊'
    },
    {
      name: 'Documents',
      path: '/documents',
      icon: '📄'
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: '⚙️'
    },
  ]

  return (
    <div
      className={`
        sidebar
        ${collapsed ? 'w-16' : 'w-64'}
        transition-all duration-300
        bg-gray-900 text-white h-screen
      `}
    >

      {/* Header */}
      <div className="flex items-center justify-between p-4">

        {!collapsed && (
          <div className="text-xl font-bold">
            FDV
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-white text-lg"
        >
          {collapsed ? '➡️' : '⬅️'}
        </button>

      </div>

      {/* Menu */}
      <div>

        {menu.map(item => {

          const active = pathname === item.path

          return (
            <Link key={item.path} href={item.path}>

              <div
                className={`
                  flex items-center gap-3
                  px-4 py-3
                  cursor-pointer
                  hover:bg-gray-700
                  ${active ? 'bg-gray-700' : ''}
                `}
              >

                <span className="text-lg">
                  {item.icon}
                </span>

                {!collapsed && (
                  <span>
                    {item.name}
                  </span>
                )}

              </div>

            </Link>
          )
        })}

      </div>

    </div>
  )
}