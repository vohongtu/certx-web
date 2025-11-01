import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Header() {
  const { token, clear } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
            <NavLink to='/manage' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Quản lý</NavLink>
          )}
          {token && (
            <NavLink to='/issue' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Cấp phát</NavLink>
          )}
        </nav>

        <div className='nav-actions desktop-nav'>
          {token ? (
            <button className='btn btn-ghost' onClick={handleLogout}>Đăng xuất</button>
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
                <NavLink to='/manage' className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')} onClick={handleNavClick}>
                  Quản lý
                </NavLink>
              )}
              {token && (
                <NavLink to='/issue' className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')} onClick={handleNavClick}>
                  Cấp phát
                </NavLink>
              )}
            </nav>

            <div className='mobile-nav-actions'>
              {token ? (
                <button className='btn btn-ghost' onClick={handleLogout}>Đăng xuất</button>
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
