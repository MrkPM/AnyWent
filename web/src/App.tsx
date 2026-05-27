import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PageShell } from './components/layout/PageShell.js'
import { Home } from './pages/Home.js'
import { EventDetail } from './pages/EventDetail.js'

export function App() {
  return (
    <BrowserRouter>
      <PageShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events/:id" element={<EventDetail />} />
        </Routes>
      </PageShell>
    </BrowserRouter>
  )
}
