import React, { useState, useEffect, useRef } from 'react'

const InfoPanel = () => {
  const [isInteractive, setIsInteractive] = useState(false)
  const containerRef = useRef(null)

  // 設定データ
  const [config, setConfig] = useState({
    messages: [],
    speed: 2,
    interval: 0.2
  })

  // 一時入力用
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    // Adminモード変更の監視
    const handleModeChange = (mode) => setIsInteractive(mode)
    window.api.on('admin-mode-changed', handleModeChange)

    // 初期ロード
    window.api.getInfoConfig().then((loadedConfig) => {
      if (loadedConfig) {
        setConfig(loadedConfig)
      }
    })
    
    // 他のウィンドウからの更新を受信
    window.api.onInfoConfigUpdate((newConfig) => {
      setConfig(newConfig)
    })

    return () => {
      window.api.removeAllListeners('admin-mode-changed')
      window.api.removeAllListeners('update-info-config')
    }
  }, [])

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

  // --- Actions ---

  const saveConfig = (newConfig) => {
    setConfig(newConfig)
    window.api.setInfoConfig(newConfig)
  }

  const handleAddMessage = () => {
    if (!newMessage.trim()) return
    const newMsgObj = {
      id: Date.now().toString(),
      text: newMessage,
      enabled: true
    }
    const newConfig = {
      ...config,
      messages: [...config.messages, newMsgObj]
    }
    saveConfig(newConfig)
    setNewMessage('')
  }

  const handleDeleteMessage = (id) => {
    const newConfig = {
      ...config,
      messages: config.messages.filter(m => m.id !== id)
    }
    saveConfig(newConfig)
  }

  const handleToggleMessage = (id) => {
    const newConfig = {
      ...config,
      messages: config.messages.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)
    }
    saveConfig(newConfig)
  }
  
  const handleMoveMessage = (index, direction) => {
    const items = [...config.messages]
    const targetIndex = index + direction
    
    if (targetIndex < 0 || targetIndex >= items.length) return
    
    const [movedItem] = items.splice(index, 1)
    items.splice(targetIndex, 0, movedItem)
    
    saveConfig({ ...config, messages: items })
  }

  const handleSpeedChange = (e) => {
    saveConfig({ ...config, speed: parseFloat(e.target.value) })
  }

  const handleIntervalChange = (e) => {
    saveConfig({ ...config, interval: parseFloat(e.target.value) })
  }

  return (
    <div 
      ref={containerRef}
      className={`info-panel-container ${isInteractive ? 'interactive' : 'locked'}`}
    >
      {isInteractive && (
        <div className="drag-handle">
          <span>ℹ️ Info Config</span>
        </div>
      )}

      <div className="panel-content">
        
        {/* スクロール設定 */}
        <div className="setting-group">
          <h3>⚙️ Scroll Settings</h3>
          <div className="control-row">
            <label>Speed (px/f): {config.speed}</label>
            <input 
              type="range" min="0.5" max="10" step="0.5" 
              value={config.speed} 
              onChange={handleSpeedChange} 
              disabled={!isInteractive}
            />
          </div>
          <div className="control-row">
            <label>Interval: {config.interval}</label>
            <input 
              type="range" min="0" max="2.0" step="0.1" 
              value={config.interval} 
              onChange={handleIntervalChange} 
              disabled={!isInteractive}
            />
            <div className="help-text">
              0: 直後につなげる<br/>
              1: 画面外に出てから
            </div>
          </div>
        </div>

        {/* メッセージ管理 */}
        <div className="message-group">
          <h3>📝 Messages</h3>
          <div className="add-row">
            <input 
              type="text" 
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)} 
              placeholder="New message..."
              disabled={!isInteractive}
              onKeyDown={e => e.key === 'Enter' && handleAddMessage()}
            />
            <button onClick={handleAddMessage} disabled={!isInteractive} className="add-btn">Add</button>
          </div>

          <ul className="message-list">
            {config.messages.map((msg, index) => (
              <li key={msg.id} className={!msg.enabled ? 'disabled' : ''}>
                <div className="msg-controls">
                  <input 
                    type="checkbox" 
                    checked={msg.enabled} 
                    onChange={() => handleToggleMessage(msg.id)}
                    disabled={!isInteractive}
                  />
                </div>
                <span className="msg-text" title={msg.text}>{msg.text}</span>
                <div className="msg-actions">
                   <button onClick={() => handleMoveMessage(index, -1)} disabled={!isInteractive || index === 0}>↑</button>
                   <button onClick={() => handleMoveMessage(index, 1)} disabled={!isInteractive || index === config.messages.length - 1}>↓</button>
                   <button onClick={() => handleDeleteMessage(msg.id)} className="del-btn" disabled={!isInteractive}>×</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <style>{`
        /* --- Container & Layout --- */
        .info-panel-container {
          width: 100%;
          height: 100%;
          background: rgba(40, 42, 54, 0.95); /* Dracula Theme */
          color: #f8f8f2;
          border: 1px solid #6272a4;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          font-family: 'Segoe UI', sans-serif;
          overflow: hidden;
        }
        
        /* Locked Mode */
        .info-panel-container.locked {
          background: transparent;
          border-color: transparent;
          pointer-events: none;
        }
        .info-panel-container.locked .panel-content {
          display: none;
        }

        /* Interactive Mode (Resizable) */
        .info-panel-container.interactive {
          resize: both;
          overflow: auto; /* 必須: ハンドルを表示するため */
        }
        
        /* リサイズハンドルのカスタマイズ */
        ::-webkit-resizer {
          background-color: rgba(189, 147, 249, 0.5);
        }

        .panel-content {
          padding: 10px;
          overflow-y: auto;
          flex: 1;
        }

        /* --- Headers & Groups --- */
        h3 { margin: 0 0 10px 0; color: #bd93f9; font-size: 14px; border-bottom: 1px solid #44475a; padding-bottom: 5px; }

        .setting-group, .message-group {
          background: rgba(0,0,0,0.2);
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
        }

        /* --- Controls --- */
        .control-row { margin-bottom: 10px; }
        .control-row label { display: block; font-size: 12px; margin-bottom: 4px; color: #8be9fd; }
        .control-row input[type="range"] { width: 100%; cursor: pointer; }
        .help-text { font-size: 10px; color: #6272a4; margin-top: 2px; }

        /* --- Add Message Row --- */
        .add-row { display: flex; gap: 5px; margin-bottom: 10px; }
        .add-row input { 
          flex: 1; padding: 6px; 
          background: #282a36; border: 1px solid #6272a4; 
          color: white; border-radius: 4px; 
        }
        .add-btn { 
          padding: 0 15px; background: #50fa7b; color: #282a36; 
          border: none; border-radius: 4px; font-weight: bold; cursor: pointer; 
        }
        .add-btn:hover:not(:disabled) { background: #40d66d; }
        
        /* --- Message List --- */
        .message-list { list-style: none; padding: 0; margin: 0; max-height: 300px; overflow-y: auto; }
        .message-list li {
          display: flex; align-items: center; gap: 8px;
          padding: 6px; background: #44475a; margin-bottom: 4px; border-radius: 4px;
          transition: background 0.2s;
        }
        .message-list li:hover { background: #535770; }
        .message-list li.disabled { opacity: 0.5; background: #282a36; }
        
        .msg-text { flex: 1; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .msg-actions { display: flex; gap: 2px; }
        .msg-actions button {
          background: #6272a4; color: white; border: none; width: 24px; height: 24px; 
          border-radius: 3px; cursor: pointer; font-size: 12px; 
          display: flex; align-items: center; justify-content: center;
        }
        .msg-actions button:hover:not(:disabled) { background: #7a88cf; }
        .msg-actions button.del-btn { background: #ff5555; }
        .msg-actions button.del-btn:hover:not(:disabled) { background: #ff7777; }
        .msg-actions button:disabled { opacity: 0.3; cursor: default; }

        /* --- Drag Handle --- */
        .drag-handle {
          -webkit-app-region: drag;
          height: 28px; background: #bd93f9; color: #282a36; 
          font-weight: bold; font-size: 12px;
          display: flex; align-items: center; padding-left: 10px; cursor: move;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}

export default InfoPanel