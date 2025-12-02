import React, { useState, useEffect } from 'react'
import EffectCanvas from './components/EffectCanvas'
import AdminPanel from './components/AdminPanel'
import KeybindManager from './components/KeybindManager'
import CommentWindow from './components/CommentWindow' // 追加
import StatusWindow from './components/StatusWindow'   // 追加

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

    if (currentHash === 'user') {
      document.title = "Overlay_USER_View"
    } else if (currentHash === 'obs') {
      document.title = "Overlay_OBS_View"
    } else if (currentHash === 'admin') {
      document.title = "Overlay_ADMIN_Panel"
    } else if (currentHash === 'keybind') {
      document.title = "Overlay_KEYBIND_Manager"
    } else if (currentHash === 'comment') { // 追加
      document.title = "Overlay_COMMENT_Box"
    } else if (currentHash === 'status') {  // 追加
      document.title = "Overlay_STATUS_Box"
    }

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [currentHash])

  // --- ルーティング分岐 ---

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
        <EffectCanvas viewMode="obs" />
      </div>
    )
  }

  if (currentHash === 'admin') {
    return <AdminPanel />
  }

  if (currentHash === 'keybind') {
    return <KeybindManager />
  }

  // 追加: コメントウィンドウ
  if (currentHash === 'comment') {
    return <CommentWindow />
  }

  // 追加: ステータスウィンドウ
  if (currentHash === 'status') {
    return <StatusWindow />
  }

  return <div>Unknown Route: {currentHash}</div>
}

export default App