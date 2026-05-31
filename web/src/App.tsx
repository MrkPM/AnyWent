import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PageShell } from './components/layout/PageShell.js'
import { Home } from './pages/Home.js'
import { EventDetail } from './pages/EventDetail.js'
import { Taste } from './pages/Taste.js'

export function App() {
  return (
    <BrowserRouter>
      <PageShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/taste" element={<Taste />} />
        </Routes>
      </PageShell>
    </BrowserRouter>
  )
}
