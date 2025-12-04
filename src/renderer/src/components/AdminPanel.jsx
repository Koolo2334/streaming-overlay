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

    // Initial Fetch (ステータスの取得)
    window.api.getObsStatus().then((status) => {
      if (status) setStreamStatus((prev) => ({ ...prev, ...status }))
    })
    window.api.getYoutubeStatus().then((status) => {
      if (status) setYoutubeStatus((prev) => ({ ...prev, ...status }))
    })

    // 保存されている設定(ID)を読み込んで State にセットする
    window.api.getYoutubeConfig().then((config) => {
      if (config && config.channelId) {
        setYoutubeConfig((prev) => ({ ...prev, ...config }))
      }
    })
    
    window.api.getObsConfig().then((config) => {
      if (config) setObsConfig((prev) => ({ ...prev, ...config }))
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
      if (!isInteractive) return 

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
    })
  }

  // --- Render ---
  return (
    <div 
      ref={containerRef}
      className={`admin-container ${isInteractive ? 'interactive' : 'locked'}`}
    >
      {isInteractive && (
        <div className="drag-handle">
          <span>::: Admin Panel</span>
          <button 
            onClick={() => setShowSettings(true)}
            className="settings-btn"
          >
            ⚙️
          </button>
        </div>
      )}

      {/* パネル本体 (locked時はCSSで非表示) */}
      <div className="panel-content">
        
        {/* Settings Modal */}
        {showSettings && (
          <div className="settings-modal">
            <h3>⚙️ Settings</h3>
            <div className="setting-group">
              <h4>OBS Studio</h4>
              <div className="control-row">
                <label>URL:</label>
                <input type="text" value={obsConfig.url} onChange={(e) => setObsConfig({...obsConfig, url: e.target.value})} placeholder="ws://127.0.0.1:4455" />
              </div>
              <div className="control-row">
                <label>Pass:</label>
                <input type="password" value={obsConfig.password} onChange={(e) => setObsConfig({...obsConfig, password: e.target.value})} />
              </div>
              <div className="control-row">
                <label>Mic:</label>
                <input type="text" value={obsConfig.micName} onChange={(e) => setObsConfig({...obsConfig, micName: e.target.value})} placeholder="Mic/Aux" />
              </div>
            </div>

            <div className="setting-group">
              <h4>YouTube</h4>
              <div className="control-row">
                <label>ID:</label>
                <input type="text" value={youtubeConfig.channelId} onChange={(e) => setYoutubeConfig({...youtubeConfig, channelId: e.target.value})} placeholder="Channel ID (UC...)" />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn primary" onClick={handleSaveConfig}>Save & Connect</button>
              <button className="btn danger" onClick={() => setShowSettings(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!showSettings && (
          <div className="main-controls">
            
            {/* Scene Control */}
            <div className="control-section" style={{ borderLeft: '4px solid #fcee0a' }}>
              <h3>🎬 Scene Control</h3>
              <div className="btn-row">
                <button onClick={() => handleChangeScene('op')} className={`btn ${currentScene === 'op' ? 'active-scene op' : ''}`}>OP</button>
                <button onClick={() => handleChangeScene('main')} className={`btn ${currentScene === 'main' ? 'active-scene main' : ''}`}>MAIN</button>
                <button onClick={() => handleChangeScene('ed')} className={`btn ${currentScene === 'ed' ? 'active-scene ed' : ''}`}>ED</button>
              </div>
            </div>

            {/* OBS & YouTube */}
            <div className="control-section">
              <h3>📡 Broadcast</h3>
              <div className="btn-row">
                <button onClick={toggleStreaming} className={`btn ${streamStatus.isStreaming ? 'danger' : ''}`} disabled={!streamStatus.obsConnected}>
                  {streamStatus.isStreaming ? 'STOP' : 'LIVE'}
                </button>
                <button onClick={toggleMute} className={`btn ${streamStatus.micMuted ? 'warn' : 'success'}`} disabled={!streamStatus.obsConnected}>
                  {streamStatus.micMuted ? 'UNMUTE' : 'MUTE'}
                </button>
              </div>
              <button onClick={toggleYouTubeConnection} className={`btn full-width ${youtubeStatus.youtubeConnected ? 'danger' : 'primary'}`}>
                {youtubeStatus.youtubeConnected ? 'DISCONNECT YT' : 'CONNECT YT'}
              </button>
            </div>

            {/* Physics */}
            <div className="control-section">
              <h3>🧪 Physics</h3>
              <div className="btn-row">
                <button onClick={handleSpawnTest} className="btn primary">Drop Test</button>
                <button onClick={handleClear} className="btn danger">Clear</button>
              </div>
              
              <div className="slider-row">
                <label>G-Y:</label>
                <input type="range" min="-2" max="2" step="0.1" value={gravity.y} onChange={(e) => handleGravityChange('y', e.target.value)} />
              </div>
            </div>

            <div className="status-footer">
              <span className={streamStatus.obsConnected ? 'status-ok' : 'status-ng'}>
                OBS: {streamStatus.obsConnected ? 'OK' : 'NG'}
              </span>
              <span className={youtubeStatus.youtubeConnected ? 'status-ok' : 'status-ng'}>
                YT: {youtubeStatus.youtubeConnected ? 'OK' : 'NG'}
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* --- Layout & Base --- */
        .admin-container {
          width: 100%;
          height: 100%;
          background: rgba(40, 42, 54, 0.95); /* Dracula Background */
          color: #f8f8f2;
          border: 1px solid #6272a4;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          font-family: 'Segoe UI', sans-serif;
          overflow: hidden;
          transition: opacity 0.2s;
        }
        
        /* Locked Mode (Hidden) */
        .admin-container.locked {
          background: transparent;
          border-color: transparent;
          pointer-events: none;
        }
        .admin-container.locked .panel-content {
          display: none;
        }
        .admin-container.locked .drag-handle {
          display: none;
        }

        /* Interactive Mode */
        .admin-container.interactive {
          resize: both;
          overflow: auto;
        }

        /* --- Header --- */
        .drag-handle {
          -webkit-app-region: drag;
          height: 30px;
          background: #bd93f9; /* Purple */
          color: #282a36;
          font-weight: bold;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
          cursor: move;
          flex-shrink: 0;
        }
        .settings-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          -webkit-app-region: no-drag;
          line-height: 1;
        }

        /* --- Content --- */
        .panel-content {
          padding: 10px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .control-section {
          background: rgba(0,0,0,0.2);
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 10px;
        }
        
        h3 { margin: 0 0 8px 0; color: #bd93f9; font-size: 13px; border-bottom: 1px solid #44475a; padding-bottom: 4px; }
        h4 { margin: 0 0 5px 0; color: #8be9fd; font-size: 12px; }

        /* --- Buttons --- */
        .btn-row { display: flex; gap: 5px; margin-bottom: 5px; }
        
        .btn {
          flex: 1;
          padding: 6px 10px;
          background: #44475a;
          color: #f8f8f2;
          border: 1px solid #6272a4;
          border-radius: 4px;
          font-weight: bold;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.1s;
        }
        .btn:hover:not(:disabled) { background: #6272a4; }
        .btn:active:not(:disabled) { transform: translateY(1px); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .btn.primary { background: #50fa7b; color: #282a36; border-color: #50fa7b; }
        .btn.primary:hover:not(:disabled) { background: #40d66d; }
        
        .btn.danger { background: #ff5555; color: white; border-color: #ff5555; }
        .btn.danger:hover:not(:disabled) { background: #ff4444; }
        
        .btn.warn { background: #ffb86c; color: #282a36; border-color: #ffb86c; }
        .btn.success { background: #50fa7b; color: #282a36; border-color: #50fa7b; }
        
        .btn.full-width { width: 100%; margin-top: 5px; }

        /* Active Scene Buttons */
        .btn.active-scene { border: 2px solid white; box-shadow: 0 0 5px rgba(255,255,255,0.5); }
        .btn.active-scene.op { background: #f1fa8c; color: black; border-color: #f1fa8c; }
        .btn.active-scene.main { background: #8be9fd; color: black; border-color: #8be9fd; }
        .btn.active-scene.ed { background: #ff79c6; color: black; border-color: #ff79c6; }

        /* --- Inputs --- */
        .slider-row { display: flex; align-items: center; font-size: 11px; }
        .slider-row label { width: 30px; }
        .slider-row input { flex: 1; }

        .control-row { 
          display: flex; 
          align-items: center; 
          margin-bottom: 5px; 
          font-size: 11px;
          /* ★横並びを防ぐため width: 100% を指定 */
          width: 100%;
        }
        .control-row label { 
          width: 50px; /* ラベル幅を少し広げる */
          color: #6272a4;
          flex-shrink: 0; /* ラベルが潰れないように */
        }
        .control-row input { 
          flex: 1; 
          padding: 4px; 
          background: #282a36; border: 1px solid #6272a4; 
          color: white; border-radius: 3px; 
          min-width: 0; /* Flexアイテムのはみ出し防止 */
        }

        /* --- Settings Modal --- */
        .settings-modal {
          position: absolute; inset: 0;
          background: rgba(40, 42, 54, 0.98);
          z-index: 100;
          padding: 15px;
          display: flex; 
          flex-direction: column; /* ★ここが重要（縦並びにする） */
        }
        .setting-group { 
          margin-bottom: 15px; 
          width: 100%; /* 幅いっぱい */
        }
        .modal-actions { 
          margin-top: auto; 
          display: flex; 
          gap: 10px; 
          width: 100%;
        }

        /* --- Status Footer --- */
        .status-footer {
          margin-top: auto;
          border-top: 1px solid #44475a;
          padding-top: 8px;
          font-size: 10px;
          display: flex;
          justify-content: space-around;
        }
        .status-ok { color: #50fa7b; }
        .status-ng { color: #ff5555; }

      `}</style>
    </div>
  )
}

export default AdminPanel