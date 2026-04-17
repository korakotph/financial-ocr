'use client'

export default function LoginPage() {

  return (
    <div className="login-container">

      <div className="login-box">

        <h2>Login</h2>

        <input placeholder="Username" />
        <input placeholder="Password" type="password" />

        <button>Login</button>

      </div>

    </div>
  )
}