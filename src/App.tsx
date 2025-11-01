import RoutesView from './routes'
import Header from './components/Header'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="layout-shell">
      <Header />
      <main className="layout-content">
        <RoutesView />
      </main>
      <Footer />
    </div>
  )
}
