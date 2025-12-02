import React, { useState, useEffect } from 'react'
import EffectCanvas from './components/EffectCanvas'
import AdminPanel from './components/AdminPanel'

// ハッシュ取得関数（変更なし）
const getHashRoute = () => {
  const hash = window.location.hash
  const route = hash.replace(/^#\/?/, '')
  return route || 'obs'
}

function App() {
  const [currentHash, setCurrentHash] = useState(getHashRoute())

  useEffect(() => {
    // 1. ハッシュ変更検知
    const handleHashChange = () => {
      setCurrentHash(getHashRoute())
    }
    window.addEventListener('hashchange', handleHashChange)

    // ★追加: 現在のルートに合わせてウィンドウタイトルを変更
    // これでOBSが「別のウィンドウだ」と認識できるようになります
    if (currentHash === 'user') {
      document.title = "Overlay_USER_View"
    } else if (currentHash === 'obs') {
      document.title = "Overlay_OBS_View"
    } else if (currentHash === 'admin') {
      document.title = "Overlay_ADMIN_Panel"
    }

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [currentHash]) // currentHashが変わるたびに実行

  // --- ルーティング分岐（変更なし） ---
  
  if (currentHash === 'user') {
    return (
      <div className="app-container">
        <EffectCanvas viewMode="user" />
        <div style={{ position: 'absolute', top: 10, right: 10, color: 'white', fontSize: '2rem', opacity: 0.5, pointerEvents: 'none' }}>
          User View
        </div>
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

  return <div>Unknown Route: {currentHash}</div>
}

export default App