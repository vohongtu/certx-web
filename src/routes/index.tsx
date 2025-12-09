import { Routes, Route, Navigate } from "react-router-dom"
import Login from "../pages/Login"
import Issue from "../pages/Issue"
import Verify from "../pages/Verify"
import Manage from "../pages/Manage"
import AdminManage from "../pages/AdminManage"
import AdminIssue from "../pages/AdminIssue"
import UserManage from "../pages/UserManage"
import CredentialManagement from "../pages/CredentialManagement"
import AuditLog from "../pages/AuditLog"
import { useAuth } from "../hooks/useAuth"
import Register from "../pages/Register"
import { decodeJwt } from "../utils/jwt"

function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles?: string[] }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" />
  if (allowedRoles) {
    const decoded = decodeJwt(token)
    const role = (decoded as any)?.role
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to="/manage" />
    }
  }
  return children
}

export default function RoutesView() {
  const { token } = useAuth()
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/verify" replace />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/issue" element={
        token ? (
          (() => {
            const decoded = decodeJwt(token)
            const role = (decoded as any)?.role
            if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
              return <Navigate to="/admin/issue" replace />
            }
            return <Issue />
          })()
        ) : <Navigate to="/login" />
      } />
      <Route path="/manage" element={token ? <Manage /> : <Navigate to="/login" />} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminManage /></ProtectedRoute>} />
      <Route path="/admin/issue" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminIssue /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><UserManage /></ProtectedRoute>} />
      <Route path="/admin/credentials" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><CredentialManagement /></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AuditLog /></ProtectedRoute>} />
      <Route path="/verify" element={<Verify />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
