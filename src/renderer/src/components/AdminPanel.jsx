import React, { useState, useEffect, useRef } from 'react'

const AdminPanel = () => {
  // --- State ---
  const [gravity, setGravity] = useState({ x: 0, y: 1 })
  const [isInteractive, setIsInteractive] = useState(false)

  const [streamStatus, setStreamStatus] = useState({
    isStreaming: false,
    micMuted: true,
    obsConnected: false
  })
  const [youtubeStatus, setYoutubeStatus] = useState({
    youtubeConnected: false
  })

  const [showSettings, setShowSettings] = useState(false)
  const [obsConfig, setObsConfig] = useState({ url: '', password: '', micName: '' })
  const [youtubeConfig, setYoutubeConfig] = useState({ channelId: '' })

  const [currentScene, setCurrentScene] = useState('main')

  const containerRef = useRef(null)

  // --- Init ---
  useEffect(() => {
    // Mode
    const handleModeChange = (mode) => setIsInteractive(mode)
    window.api.on('admin-mode-changed', handleModeChange)

    // OBS
    const handleStatusUpdate = (newStatus) => {
      setStreamStatus((prev) => ({ ...prev, ...newStatus }))
    }
    if (window.api.onStatusUpdate) window.api.onStatusUpdate(handleStatusUpdate)
    else window.api.on('update-status', handleStatusUpdate)

    // YouTube
    const handleYoutubeStatusUpdate = (newStatus) => {
      setYoutubeStatus((prev) => ({ ...prev, ...newStatus }))
    }
    window.api.onYoutubeStatusUpdate(handleYoutubeStatusUpdate)

    // Scene
    window.api.onSceneChange((scene) => setCurrentScene(scene))

    // Initial Fetch
    window.api.getObsStatus().then((status) => {
      if (status) setStreamStatus((prev) => ({ ...prev, ...status }))
    })
    window.api.getYoutubeStatus().then((status) => {
      if (status) setYoutubeStatus((prev) => ({ ...prev, ...status }))
    })

    return () => {
      window.api.removeAllListeners('admin-mode-changed')
      window.api.removeAllListeners('update-status')
      window.api.removeAllListeners('update-youtube-status')
    }
  }, [])

  useEffect(() => {
    if (showSettings) {
      window.api.getObsConfig().then(setObsConfig)
      window.api.getYoutubeConfig().then(setYoutubeConfig)
    }
  }, [showSettings])

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      // ★修正ポイント1: インタラクティブモードでないなら、サイズ同期リクエストを送らない
      if (!isInteractive) return 

      // (StatusWindowなど一部のファイルでは entries ループを使わず直接 getBoundingClientRect している場合がありますが、中身のロジックの前にこのif文を入れてください)
      for (const entry of entries) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        if (width > 0 && height > 0) {
          window.api.resizeWindow(Math.ceil(width), Math.ceil(height))
        }
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [isInteractive])

  // --- Handlers ---

  const handleSpawnTest = () => {
    const testComments = ['草', 'www', 'Nice!', 'Hello', '8888', 'Test']
    const text = testComments[Math.floor(Math.random() * testComments.length)]
    const color = `hsl(${Math.random() * 360}, 70%, 60%)`
    window.api.spawnComment(text, color)
  }

  const handleGravityChange = (axis, value) => {
    const newVal = parseFloat(value)
    const newGravity = { ...gravity, [axis]: newVal }
    setGravity(newGravity)
    window.api.setGravity(newGravity.x, newGravity.y)
  }

  const handleClear = () => {
    window.api.clearWorld()
  }

  const toggleStreaming = () => {
    window.api.updateStatus({ isStreaming: !streamStatus.isStreaming })
  }
  const toggleMute = () => {
    window.api.updateStatus({ micMuted: !streamStatus.micMuted })
  }

  const toggleYouTubeConnection = () => {
    if (youtubeStatus.youtubeConnected) {
      window.api.disconnectYouTube()
    } else {
      if (!youtubeConfig.channelId) return alert('Please set Channel ID first.')
      window.api.connectYouTube(youtubeConfig.channelId)
    }
  }

  const handleChangeScene = (scene) => {
    window.api.changeScene(scene)
  }

  const handleSaveConfig = () => {
    Promise.all([
      window.api.setObsConfig(obsConfig),
      window.api.setYoutubeConfig(youtubeConfig)
    ]).then(() => {
      setShowSettings(false)
      // ★以下の行を削除またはコメントアウトしてください
      // setStreamStatus(prev => ({ ...prev, obsConnected: false })) 
    })
  }

  // --- Render ---
  return (
    <div 
      ref={containerRef}
      className={`admin-container enable-mouse ${isInteractive ? '' : 'locked'}`}
      style={{
        resize: isInteractive ? 'both' : 'none',
        overflow: isInteractive ? 'auto' : 'hidden',
        width: '100%', height: '100%', position: 'relative'
      }}
    >
      {isInteractive && (
        <div className="drag-handle" style={{ justifyContent: 'space-between', paddingRight: '10px' }}>
          <span>::: Admin Panel</span>
          <button 
            onClick={() => setShowSettings(true)}
            style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '1.2rem', WebkitAppRegion: 'no-drag' }}
          >
            ⚙️
          </button>
        </div>
      )}

      {!isInteractive && (
        <div style={{ padding: '5px', color: '#aaa', fontSize: '0.8rem' }}>🔒 Locked (Ctrl+Alt+A)</div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-modal" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.95)', padding: '20px', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '15px', color: 'white', overflowY: 'auto'
        }}>
          <h3>⚙️ Settings</h3>
          <h4 style={{borderBottom: '1px solid #555', paddingBottom:'5px'}}>OBS Studio</h4>
          <div className="control-group">
            <label style={{width:'60px'}}>URL:</label>
            <input type="text" value={obsConfig.url} onChange={(e) => setObsConfig({...obsConfig, url: e.target.value})} placeholder="ws://127.0.0.1:4455" />
          </div>
          <div className="control-group">
            <label style={{width:'60px'}}>Pass:</label>
            <input type="password" value={obsConfig.password} onChange={(e) => setObsConfig({...obsConfig, password: e.target.value})} />
          </div>
          <div className="control-group">
            <label style={{width:'60px'}}>Mic:</label>
            <input type="text" value={obsConfig.micName} onChange={(e) => setObsConfig({...obsConfig, micName: e.target.value})} placeholder="Mic/Aux" />
          </div>

          <h4 style={{borderBottom: '1px solid #555', paddingBottom:'5px', marginTop:'10px'}}>YouTube</h4>
          <div className="control-group">
            <label style={{width:'60px'}}>ID:</label>
            <input type="text" value={youtubeConfig.channelId} onChange={(e) => setYoutubeConfig({...youtubeConfig, channelId: e.target.value})} placeholder="Channel ID (UC...)" />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '20px' }}>
            <button className="btn primary" onClick={handleSaveConfig}>Save & Connect</button>
            <button className="btn danger" onClick={() => setShowSettings(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Scene Control */}
        <div className="section" style={{ borderLeft: '4px solid #fcee0a' }}>
          <h3>🎬 Scene Control</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => handleChangeScene('op')} className="btn" style={{ background: currentScene === 'op' ? '#fcee0a' : '#333', color: currentScene === 'op' ? 'black' : 'white' }} disabled={!isInteractive}>OP</button>
            <button onClick={() => handleChangeScene('main')} className="btn" style={{ background: currentScene === 'main' ? '#00f3ff' : '#333', color: currentScene === 'main' ? 'black' : 'white' }} disabled={!isInteractive}>MAIN</button>
            <button onClick={() => handleChangeScene('ed')} className="btn" style={{ background: currentScene === 'ed' ? '#ff00ff' : '#333', color: currentScene === 'ed' ? 'black' : 'white' }} disabled={!isInteractive}>ED</button>
          </div>
        </div>

        {/* OBS & YouTube */}
        <div className="section">
          <h3>📡 Broadcast & Chat</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button onClick={toggleStreaming} className={`btn ${streamStatus.isStreaming ? 'danger' : ''}`} disabled={!isInteractive || !streamStatus.obsConnected}>
              {streamStatus.isStreaming ? 'STOP' : 'LIVE'}
            </button>
            <button onClick={toggleMute} className="btn" style={{ background: streamStatus.micMuted ? '#ffc107' : '#28a745', color: streamStatus.micMuted ? 'black' : 'white' }} disabled={!isInteractive || !streamStatus.obsConnected}>
              {streamStatus.micMuted ? 'UNMUTE' : 'MUTE'}
            </button>
          </div>
          <button onClick={toggleYouTubeConnection} className={`btn ${youtubeStatus.youtubeConnected ? 'danger' : 'primary'}`} disabled={!isInteractive}>
            {youtubeStatus.youtubeConnected ? 'DISCONNECT YT' : 'CONNECT YT'}
          </button>
        </div>

        {/* Physics (Simplified) */}
        <div className="section">
          <h3>🧪 Physics</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button onClick={handleSpawnTest} className="btn primary" disabled={!isInteractive}>Drop Test</button>
            <button onClick={handleClear} className="btn danger" disabled={!isInteractive}>Clear</button>
          </div>
          
          <div className="control-group">
            <label>G-Y:</label>
            <input type="range" min="-2" max="2" step="0.1" value={gravity.y} onChange={(e) => handleGravityChange('y', e.target.value)} disabled={!isInteractive} />
          </div>
        </div>

      </div>

      <div className="status-bar" style={{ marginTop: '20px', borderTop: '1px solid #555', paddingTop: '10px', fontSize: '0.8rem' }}>
        <span style={{ color: streamStatus.obsConnected ? '#0f0' : '#f00', marginRight: '10px' }}>
          OBS: {streamStatus.obsConnected ? 'OK' : 'NG'}
        </span>
        <span style={{ color: youtubeStatus.youtubeConnected ? '#0f0' : '#888' }}>
          YT: {youtubeStatus.youtubeConnected ? 'OK' : 'NG'}
        </span>
      </div>
    </div>
  )
}

export default AdminPanel