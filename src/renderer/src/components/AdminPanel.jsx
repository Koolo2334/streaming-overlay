import React, { useState, useEffect, useRef } from 'react'

const AdminPanel = () => {
  // --- State: 物理演算・UI ---
  const [gravity, setGravity] = useState({ x: 0, y: 1 })
  const [isInteractive, setIsInteractive] = useState(false)
  const [lifeTime, setLifeTime] = useState(15) // 秒単位

  // --- State: OBS ---
  const [streamStatus, setStreamStatus] = useState({
    isStreaming: false,
    micMuted: true,
    obsConnected: false
  })

  // --- State: YouTube ---
  const [youtubeStatus, setYoutubeStatus] = useState({
    youtubeConnected: false
  })

  // --- State: 設定モーダル ---
  const [showSettings, setShowSettings] = useState(false)
  const [obsConfig, setObsConfig] = useState({ url: '', password: '', micName: '' })
  const [youtubeConfig, setYoutubeConfig] = useState({ channelId: '' })

  // --- Ref ---
  const containerRef = useRef(null)

  // --- 初期化 & リスナー設定 ---
  useEffect(() => {
    // 1. Admin操作モード同期
    const handleModeChange = (mode) => setIsInteractive(mode)
    window.api.on('admin-mode-changed', handleModeChange)

    // 2. OBS状態同期
    const handleStatusUpdate = (newStatus) => {
      setStreamStatus((prev) => ({ ...prev, ...newStatus }))
    }
    if (window.api.onStatusUpdate) {
      window.api.onStatusUpdate(handleStatusUpdate)
    } else {
      window.api.on('update-status', handleStatusUpdate)
    }

    // 3. YouTube状態同期
    const handleYoutubeStatusUpdate = (newStatus) => {
      setYoutubeStatus((prev) => ({ ...prev, ...newStatus }))
    }
    window.api.onYoutubeStatusUpdate(handleYoutubeStatusUpdate)

    // 4. 初期状態の取得 (起動時の表示ズレ防止)
    window.api.getObsStatus().then((status) => {
      if (status) setStreamStatus((prev) => ({ ...prev, ...status }))
    })
    window.api.getYoutubeStatus().then((status) => {
      if (status) setYoutubeStatus((prev) => ({ ...prev, ...status }))
    })
    window.api.getCommentLifeTime().then((ms) => {
      if (ms) setLifeTime(ms / 1000)
    })

    // クリーンアップ
    return () => {
      window.api.removeAllListeners('admin-mode-changed')
      window.api.removeAllListeners('update-status')
      window.api.removeAllListeners('update-youtube-status')
    }
  }, [])

  // --- 設定読み込み (モーダルが開いた時) ---
  useEffect(() => {
    if (showSettings) {
      window.api.getObsConfig().then(setObsConfig)
      window.api.getYoutubeConfig().then(setYoutubeConfig)
    }
  }, [showSettings])

  // --- リサイズ監視 (ResizeObserver) ---
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(() => {
      // パディング込みのサイズを取得してメインプロセスへ通知
      const { width, height } = containerRef.current.getBoundingClientRect()
      if (width > 0 && height > 0) {
        window.api.resizeWindow(Math.ceil(width), Math.ceil(height))
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // --- ハンドラ ---

  // テスト用コメント生成
  const handleSpawnTest = () => {
    const testComments = ['草', 'www', 'ナイス！', '初見です', '888888', 'Hello World']
    const text = testComments[Math.floor(Math.random() * testComments.length)]
    const color = `hsl(${Math.random() * 360}, 70%, 60%)`
    window.api.spawnComment(text, color)
  }

  // 重力操作
  const handleGravityChange = (axis, value) => {
    const newVal = parseFloat(value)
    const newGravity = { ...gravity, [axis]: newVal }
    setGravity(newGravity)
    window.api.setGravity(newGravity.x, newGravity.y)
  }

  // ワールドリセット
  const handleClear = () => {
    window.api.clearWorld()
  }

  // OBS操作
  const toggleStreaming = () => {
    window.api.updateStatus({ isStreaming: !streamStatus.isStreaming })
  }
  const toggleMute = () => {
    window.api.updateStatus({ micMuted: !streamStatus.micMuted })
  }

  // YouTube操作
  const toggleYouTubeConnection = () => {
    if (youtubeStatus.youtubeConnected) {
      window.api.disconnectYouTube()
    } else {
      if (!youtubeConfig.channelId) return alert('Please set Channel ID first.')
      window.api.connectYouTube(youtubeConfig.channelId)
    }
  }

  // 寿命設定変更
  const handleLifeTimeChange = (e) => {
    const seconds = parseInt(e.target.value, 10)
    setLifeTime(seconds)
    window.api.setCommentLifeTime(seconds * 1000)
  }

  // 設定保存
  const handleSaveConfig = () => {
    Promise.all([
      window.api.setObsConfig(obsConfig),
      window.api.setYoutubeConfig(youtubeConfig)
    ]).then(() => {
      setShowSettings(false)
      // 再接続中の表示フィードバック
      setStreamStatus(prev => ({ ...prev, obsConnected: false }))
    })
  }

  // --- 描画 ---
  return (
    <div 
      ref={containerRef}
      className={`admin-container enable-mouse ${isInteractive ? '' : 'locked'}`}
      style={{
        resize: isInteractive ? 'both' : 'none',
        overflow: isInteractive ? 'auto' : 'hidden',
        width: '100%',
        height: '100%',
        position: 'relative'
      }}
    >
      {/* ドラッグハンドル */}
      {isInteractive && (
        <div className="drag-handle" style={{ justifyContent: 'space-between', paddingRight: '10px' }}>
          <span>::: Admin Panel</span>
          {/* 設定ボタン (ドラッグ除外) */}
          <button 
            onClick={() => setShowSettings(true)}
            style={{ 
              background: 'none', border: 'none', color: '#00d4ff', 
              cursor: 'pointer', fontSize: '1.2rem', WebkitAppRegion: 'no-drag' 
            }}
          >
            ⚙️
          </button>
        </div>
      )}

      {/* ロック中表示 */}
      {!isInteractive && (
        <div style={{ padding: '5px', color: '#aaa', fontSize: '0.8rem' }}>
          🔒 Locked (Press Ctrl+Alt+A)
        </div>
      )}

      {/* 設定モーダル */}
      {showSettings && (
        <div className="settings-modal" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.95)', padding: '20px', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '15px',
          color: 'white', overflowY: 'auto'
        }}>
          <h3>⚙️ Settings</h3>
          
          {/* OBS Settings */}
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

          {/* YouTube Settings */}
          <h4 style={{borderBottom: '1px solid #555', paddingBottom:'5px', marginTop:'10px'}}>YouTube Live</h4>
          <div className="control-group">
            <label style={{width:'60px'}}>ID:</label>
            <input type="text" value={youtubeConfig.channelId} onChange={(e) => setYoutubeConfig({...youtubeConfig, channelId: e.target.value})} placeholder="Channel ID (UC...)" />
          </div>
          <div style={{fontSize:'0.7rem', color:'#aaa'}}>※ Channel ID (UC...) required. Handle (@...) not supported.</div>

          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '20px' }}>
            <button className="btn primary" onClick={handleSaveConfig}>Save & Connect</button>
            <button className="btn danger" onClick={() => setShowSettings(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* OBS Control */}
        <div className="section">
          <h3>📡 OBS Broadcast</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={toggleStreaming} 
              className={`btn ${streamStatus.isStreaming ? 'danger' : ''}`}
              disabled={!isInteractive || !streamStatus.obsConnected}
            >
              {streamStatus.isStreaming ? 'STOP STREAM' : 'GO LIVE'}
            </button>
            <button 
              onClick={toggleMute} 
              className="btn"
              style={{ background: streamStatus.micMuted ? '#ffc107' : '#28a745', color: streamStatus.micMuted ? 'black' : 'white' }}
              disabled={!isInteractive || !streamStatus.obsConnected}
            >
              {streamStatus.micMuted ? 'UNMUTE' : 'MUTE'}
            </button>
          </div>
        </div>

        {/* YouTube Control */}
        <div className="section">
          <h3>🔴 YouTube Chat</h3>
          <button 
            onClick={toggleYouTubeConnection} 
            className={`btn ${youtubeStatus.youtubeConnected ? 'danger' : 'primary'}`}
            disabled={!isInteractive}
          >
            {youtubeStatus.youtubeConnected ? 'DISCONNECT' : 'CONNECT'}
          </button>
          <div style={{ marginTop: '5px', fontSize: '0.8rem', color: youtubeStatus.youtubeConnected ? '#0f0' : '#aaa' }}>
            State: {youtubeStatus.youtubeConnected ? 'Monitoring Live Chat...' : 'Idle'}
          </div>
        </div>

        {/* Physics Control */}
        <div className="section">
          <h3>🧪 Physics & Test</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button onClick={handleSpawnTest} className="btn primary" disabled={!isInteractive}>Test Drop</button>
            <button onClick={handleClear} className="btn danger" disabled={!isInteractive}>Clear All</button>
          </div>
          
          {/* LifeTime */}
          <div className="control-group" style={{ marginBottom: '10px' }}>
             <label style={{width:'auto', fontSize:'0.8rem'}}>Life: {lifeTime}s</label>
             <input type="range" min="5" max="60" step="1" value={lifeTime} onChange={handleLifeTimeChange} disabled={!isInteractive} />
          </div>

          {/* Gravity */}
          <div className="control-group">
            <label>G-X:</label>
            <input type="range" min="-2" max="2" step="0.1" value={gravity.x} onChange={(e) => handleGravityChange('x', e.target.value)} disabled={!isInteractive} />
          </div>
          <div className="control-group">
            <label>G-Y:</label>
            <input type="range" min="-2" max="2" step="0.1" value={gravity.y} onChange={(e) => handleGravityChange('y', e.target.value)} disabled={!isInteractive} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
             <button onClick={() => handleGravityChange('y', -1)} className="btn" style={{fontSize:'0.8rem'}} disabled={!isInteractive}>Reverse G</button>
             <button onClick={() => { handleGravityChange('x', 0); handleGravityChange('y', 1) }} className="btn" style={{fontSize:'0.8rem'}} disabled={!isInteractive}>Reset G</button>
          </div>
        </div>

      </div>

      {/* ステータスバー */}
      <div className="status-bar" style={{ 
        marginTop: '20px', 
        borderTop: '1px solid #555', 
        paddingTop: '10px',
        fontSize: '0.8rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
      }}>
        <div style={{ color: streamStatus.obsConnected ? '#0f0' : '#f00' }}>
          OBS: {streamStatus.obsConnected ? 'Connected' : 'Disconnected'}
        </div>
        <div style={{ color: youtubeStatus.youtubeConnected ? '#0f0' : '#888' }}>
          YT: {youtubeStatus.youtubeConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel