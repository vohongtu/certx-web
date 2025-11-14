import { useState, useEffect, useMemo } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { decodeJwt } from '../utils/jwt'

export default function Header() {
  const { token, clear } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false)
  
  const userRole = useMemo(() => {
    if (!token) return null
    const decoded = decodeJwt(token)
    return (decoded as any)?.role || null
  }, [token])
  
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
  
  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin'
      case 'ADMIN':
        return 'Admin'
      case 'USER':
        return 'User'
      default:
        return ''
    }
  }
  
  const getRoleBadgeClass = (role: string | null) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'role-badge role-badge--super-admin'
      case 'ADMIN':
        return 'role-badge role-badge--admin'
      case 'USER':
        return 'role-badge role-badge--user'
      default:
        return 'role-badge'
    }
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const handleLogout = () => {
    clear()
    navigate('/login')
    setIsMenuOpen(false)
  }

  const handleNavClick = () => {
    setIsMenuOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isAdminDropdownOpen && !target.closest('.admin-dropdown')) {
        setIsAdminDropdownOpen(false)
      }
    }

    if (isAdminDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isAdminDropdownOpen])

  return (
    <header className='navbar'>
      <div className='navbar-inner'>
        <Link to='/verify' className='brand' onClick={handleNavClick}>
          <span className='brand-dot'>CX</span>
          <span className='brand-text'>
            <strong>CertX</strong>
            <span className='brand-tagline'>Blockchain Credential Registry</span>
          </span>
        </Link>

        {/* Hamburger button for mobile */}
        <button 
          className='menu-toggle'
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label='Toggle menu'
        >
          <span className={isMenuOpen ? 'menu-toggle-line open' : 'menu-toggle-line'}></span>
          <span className={isMenuOpen ? 'menu-toggle-line open' : 'menu-toggle-line'}></span>
          <span className={isMenuOpen ? 'menu-toggle-line open' : 'menu-toggle-line'}></span>
        </button>

        {/* Desktop navigation */}
        <nav className='nav-links desktop-nav'>
          <NavLink to='/verify' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Tra cứu</NavLink>
          {token && (
            <NavLink to='/issue' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Upload</NavLink>
          )}
          {token && (
            <NavLink to='/manage' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Lịch sử</NavLink>
          )}
          {isAdmin && (
            <div className='admin-dropdown' style={{ position: 'relative' }}>
              <button
                className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Admin
                <span style={{ fontSize: '12px' }}>▼</span>
              </button>
              {isAdminDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '8px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  minWidth: '180px',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <NavLink
                    to='/admin'
                    className={({ isActive }) => ''}
                    onClick={() => setIsAdminDropdownOpen(false)}
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '12px 16px',
                      textDecoration: 'none',
                      color: isActive ? '#2563eb' : '#374151',
                      background: isActive ? '#eff6ff' : 'white',
                      borderBottom: '1px solid #f3f4f6',
                      fontWeight: isActive ? '600' : '400',
                      transition: 'background-color 0.2s'
                    })}
                    onMouseEnter={(e) => {
                      if (location.pathname !== '/admin') {
                        e.currentTarget.style.background = '#f9fafb'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = location.pathname === '/admin' ? '#eff6ff' : 'white'
                    }}
                  >
                    Quản lý chứng chỉ
                  </NavLink>
                  <NavLink
                    to='/admin/users'
                    className={({ isActive }) => ''}
                    onClick={() => setIsAdminDropdownOpen(false)}
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '12px 16px',
                      textDecoration: 'none',
                      color: isActive ? '#2563eb' : '#374151',
                      background: isActive ? '#eff6ff' : 'white',
                      borderBottom: '1px solid #f3f4f6',
                      fontWeight: isActive ? '600' : '400',
                      transition: 'background-color 0.2s'
                    })}
                    onMouseEnter={(e) => {
                      if (location.pathname !== '/admin/users') {
                        e.currentTarget.style.background = '#f9fafb'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = location.pathname === '/admin/users' ? '#eff6ff' : 'white'
                    }}
                  >
                    Quản lý người dùng
                  </NavLink>
                  <NavLink
                    to='/admin/credentials'
                    className={({ isActive }) => ''}
                    onClick={() => setIsAdminDropdownOpen(false)}
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '12px 16px',
                      textDecoration: 'none',
                      color: isActive ? '#2563eb' : '#374151',
                      background: isActive ? '#eff6ff' : 'white',
                      fontWeight: isActive ? '600' : '400',
                      transition: 'background-color 0.2s'
                    })}
                    onMouseEnter={(e) => {
                      if (location.pathname !== '/admin/credentials') {
                        e.currentTarget.style.background = '#f9fafb'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = location.pathname === '/admin/credentials' ? '#eff6ff' : 'white'
                    }}
                  >
                    Quản lý văn bằng
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </nav>

        <div className='nav-actions desktop-nav'>
          {token ? (
            <>
              {userRole && (
                <span className={getRoleBadgeClass(userRole)} title={`Tài khoản ${getRoleLabel(userRole)}`}>
                  {getRoleLabel(userRole)}
                </span>
              )}
            <button className='btn btn-ghost' onClick={handleLogout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <Link to='/login' className='btn btn-ghost'>Đăng nhập</Link>
              <Link to='/register' className='btn btn-primary'>Đăng ký Issuer</Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMenuOpen && (
        <div className='mobile-menu-overlay' onClick={() => setIsMenuOpen(false)}>
          <div className='mobile-menu' onClick={(e) => e.stopPropagation()}>
            <nav className='mobile-nav-links'>
              <NavLink to='/verify' className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')} onClick={handleNavClick}>
                Tra cứu
              </NavLink>
              {token && (
                <NavLink to='/issue' className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')} onClick={handleNavClick}>
                  Upload
                </NavLink>
              )}
              {token && (
                <NavLink to='/manage' className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')} onClick={handleNavClick}>
                  Lịch sử
                </NavLink>
              )}
              {isAdmin && (
                <>
                  <div style={{ padding: '8px 16px', fontSize: '14px', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                    Admin
                  </div>
                  <NavLink to='/admin' className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')} onClick={handleNavClick} style={{ paddingLeft: '32px' }}>
                    Quản lý chứng chỉ
                  </NavLink>
                  <NavLink to='/admin/users' className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')} onClick={handleNavClick} style={{ paddingLeft: '32px' }}>
                    Quản lý người dùng
                  </NavLink>
                  <NavLink to='/admin/credentials' className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')} onClick={handleNavClick} style={{ paddingLeft: '32px' }}>
                    Quản lý văn bằng
                  </NavLink>
                </>
              )}
            </nav>

            <div className='mobile-nav-actions'>
              {token ? (
                <>
                  {userRole && (
                    <span className={getRoleBadgeClass(userRole)} title={`Tài khoản ${getRoleLabel(userRole)}`}>
                      {getRoleLabel(userRole)}
                    </span>
                  )}
                <button className='btn btn-ghost' onClick={handleLogout}>Đăng xuất</button>
                </>
              ) : (
                <>
                  <Link to='/login' className='btn btn-ghost' onClick={handleNavClick}>Đăng nhập</Link>
                  <Link to='/register' className='btn btn-primary' onClick={handleNavClick}>Đăng ký Issuer</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
