import React, { useState, useEffect } from 'react'
import EffectCanvas from './components/EffectCanvas'
import AdminPanel from './components/AdminPanel'
import KeybindManager from './components/KeybindManager'
import CommentWindow from './components/CommentWindow'
import StatusWindow from './components/StatusWindow'
import OBS_View from './components/OBS_View'
import LuckyLogWindow from './components/LuckyLogWindow' // ★追加

const getHashRoute = () => {
  const hash = window.location.hash
  const route = hash.replace(/^#\/?/, '')
  return route || 'obs'
}

function App() {
  const [currentHash, setCurrentHash] = useState(getHashRoute())

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(getHashRoute())
    }
    window.addEventListener('hashchange', handleHashChange)

    if (currentHash === 'user') document.title = "Overlay_USER_View"
    else if (currentHash === 'obs') document.title = "Overlay_OBS_View"
    else if (currentHash === 'admin') document.title = "Overlay_ADMIN_Panel"
    else if (currentHash === 'keybind') document.title = "Overlay_KEYBIND_Manager"
    else if (currentHash === 'comment') document.title = "Overlay_COMMENT_Box"
    else if (currentHash === 'status') document.title = "Overlay_STATUS_Box"
    else if (currentHash === 'lucky') document.title = "Overlay_LUCKY_Log" // ★追加

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [currentHash])

  // --- ルーティング ---

  if (currentHash === 'user') {
    return (
      <div className="app-container">
        <EffectCanvas viewMode="user" />
      </div>
    )
  }

  if (currentHash === 'obs') {
    return (
      <div className="app-container">
        <OBS_View />
      </div>
    )
  }

  if (currentHash === 'admin') return <AdminPanel />
  if (currentHash === 'keybind') return <KeybindManager />
  if (currentHash === 'comment') return <CommentWindow />
  if (currentHash === 'status') return <StatusWindow />
  
  // ★追加
  if (currentHash === 'lucky') return <LuckyLogWindow />

  return <div>Unknown Route: {currentHash}</div>
}

export default App