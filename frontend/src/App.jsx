import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Registration from './pages/Registration'

// Further routes (login, student portal, admin dashboard...) will be added here later.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Registration />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
