'use client'

import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { usePathname } from 'next/navigation'

export default function Layout({ children }) {

  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) {
    return children
  }

  return (
    <div className="layout flex">
      
      <Sidebar />

      <div className="main flex-1">

        <Navbar />

        <div className="content">
          {children}
        </div>

      </div>

    </div>
  )
}