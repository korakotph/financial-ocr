export default function DocumentDetail({ params }) {

  const { id } = params

  return (
    <div>

      <h1>Document Detail #{id}</h1>

      <div className="card">
        Status: Passed
      </div>

      <div className="card">
        Amount: 15,000 THB
      </div>

      <div className="card">
        AI Result: Valid
      </div>

    </div>
  )
}