import { Routes, Route, Navigate } from "react-router-dom"
import Login from "../pages/Login"
import Issue from "../pages/Issue"
import Verify from "../pages/Verify"
import { useAuth } from "../hooks/useAuth"
import Register from "../pages/Register"

export default function RoutesView() {
  const { token } = useAuth()
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/verify" replace />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/issue" element={token ? <Issue /> : <Navigate to="/login" />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
