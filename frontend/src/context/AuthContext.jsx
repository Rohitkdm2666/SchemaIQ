import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// Sample credentials
export const DEMO_CREDENTIALS = [
  { id: 'admin@schemaiq.ai', password: 'Kaizen@2025', role: 'Admin', name: 'Aditya Kachwaha', initials: 'AK' },
  { id: 'analyst@schemaiq.ai', password: 'Analyst@123', role: 'Analyst', name: 'Rohit Kadam', initials: 'RK' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const login = (id, password) => {
    const match = DEMO_CREDENTIALS.find(c => c.id === id && c.password === password)
    if (match) {
      setUser(match)
      return { ok: true }
    }
    return { ok: false, error: 'Invalid credentials. Check your ID and password.' }
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
