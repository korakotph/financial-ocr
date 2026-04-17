import '../styles/globals.css'
import Layout from '@/components/Layout'

export const metadata = {
  title: 'Financial Document Verification',
}

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  )
}