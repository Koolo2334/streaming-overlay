import React, { useState, useEffect, useRef } from 'react'

const StatusWindow = () => {
  const [isInteractive, setIsInteractive] = useState(false)
  const containerRef = useRef(null)

  const [status, setStatus] = useState({
    isStreaming: false,
    micMuted: true
  })

  useEffect(() => {
    const handleModeChange = (mode) => setIsInteractive(mode)
    window.api.on('admin-mode-changed', handleModeChange)

    const handleStatusUpdate = (newStatus) => {
      setStatus((prev) => ({ ...prev, ...newStatus }))
    }
    if (window.api.onStatusUpdate) {
      window.api.onStatusUpdate(handleStatusUpdate)
    } else {
      window.api.on('update-status', handleStatusUpdate)
    }

    // ★追加: 起動時に最新状態を取得して表示ズレを防ぐ
    window.api.getObsStatus().then((initialStatus) => {
      if (initialStatus) {
        setStatus((prev) => ({ ...prev, ...initialStatus }))
      }
    })

    return () => {
      window.api.removeAllListeners('admin-mode-changed')
      // window.api.removeAllListeners('update-status')
    }
  }, [])

  // リサイズ監視
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

  return (
    <div 
      ref={containerRef}
      className={`status-container ${isInteractive ? 'interactive' : ''}`}
      style={{
        resize: isInteractive ? 'both' : 'none',
        overflow: isInteractive ? 'auto' : 'hidden',
        width: '100%',
        height: '100%'
      }}
    >
      {isInteractive && (
        <div className="drag-handle">
          <span>📊 Status</span>
        </div>
      )}

      <div className="status-grid">
        <div className={`status-item ${status.isStreaming ? 'live' : ''}`}>
          <span className="icon">📡</span>
          <span className="label">{status.isStreaming ? 'ON AIR' : 'OFFLINE'}</span>
        </div>
        
        <div className={`status-item ${status.micMuted ? 'muted' : ''}`}>
          <span className="icon">{status.micMuted ? '🔇' : '🎙️'}</span>
          <span className="label">{status.micMuted ? 'MUTE' : 'MIC ON'}</span>
        </div>
      </div>

      <style>{`
        .status-container {
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 8px;
          color: white;
        }
        .status-container:not(.interactive) {
          background: transparent;
        }
        
        .status-grid {
          flex: 1;
          display: flex;
          /* レスポンシブ対応: 幅に合わせて折り返す */
          flex-wrap: wrap; 
          align-content: flex-start;
          gap: 5px;
          padding: 5px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.1);
          padding: 5px 10px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 14px;
          white-space: nowrap;
          /* 親幅に合わせて広がる */
          flex-grow: 1; 
          min-width: 80px; 
          justify-content: center;
        }
        
        .status-item.live {
          background: rgba(220, 53, 69, 0.8);
          box-shadow: 0 0 10px rgba(220, 53, 69, 0.5);
        }
        .status-item.muted {
          background: rgba(255, 193, 7, 0.8);
          color: black;
        }
      `}</style>
    </div>
  )
}

export default StatusWindow