'use client'

import { useRouter } from 'next/navigation'
import DataTable from '@/components/DataTable'

export default function DocumentsPage() {

  const router = useRouter()

  const columns = [
    { key: 'id', title: 'ID' },
    { key: 'name', title: 'Document Name' },
    { key: 'status', title: 'Status' },
    { key: 'date', title: 'Date' },
  ]

  const data = [
    {
      id: 1,
      name: 'Invoice001.pdf',
      status: 'Passed',
      date: '2026-03-01',
    },
    {
      id: 2,
      name: 'Invoice002.pdf',
      status: 'Failed',
      date: '2026-03-02',
    },
  ]

  return (
    <div>

      <h1>Documents</h1>

      <DataTable
        columns={columns}
        data={data}
        onRowClick={(row) =>
          router.push(`/documents/${row.id}`)
        }
      />

    </div>
  )
}