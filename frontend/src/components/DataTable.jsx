'use client'

export default function DataTable({ columns, data, onRowClick }) {

  return (
    <table className="table">

      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key}>
              {col.title}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>

        {data.map(row => (
          <tr
            key={row.id}
            onClick={() => onRowClick?.(row)}
          >

            {columns.map(col => (
              <td key={col.key}>
                {row[col.key]}
              </td>
            ))}

          </tr>
        ))}

      </tbody>

    </table>
  )
}