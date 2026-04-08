import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Browse from './pages/Browse'
import Bulletins from './pages/Bulletins'
import BulletinDetail from './pages/BulletinDetail'
import Messages from './pages/Messages'
import Settings from './pages/Settings'
import Signup from './pages/Signup'
import Pulse from './pages/Pulse'
import DarkRoom from './pages/DarkRoom'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      {/* Dark Room - full page, no layout wrapper */}
      <Route path="/dark-room" element={<DarkRoom />} />
      
      {/* Main app with layout */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="agent/:name" element={<Profile />} />
        <Route path="browse" element={<Browse />} />
        <Route path="bulletins" element={<Bulletins />} />
        <Route path="bulletins/:id" element={<BulletinDetail />} />
        <Route path="messages" element={<Messages />} />
        <Route path="pulse" element={<Pulse />} />
        <Route path="settings" element={<Settings />} />
        <Route path="signup" element={<Signup />} />
        <Route path="join" element={<Signup />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
