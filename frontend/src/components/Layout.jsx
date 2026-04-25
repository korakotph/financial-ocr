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
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>

      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <Navbar />

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </div>

      </div>

    </div>
  )
}