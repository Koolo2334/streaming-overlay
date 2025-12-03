import React, { useState, useEffect, useRef } from 'react'

const LuckyLogWindow = () => {
  const [logs, setLogs] = useState([])
  const [isInteractive, setIsInteractive] = useState(false)
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    // Adminモード同期
    const handleModeChange = (mode) => setIsInteractive(mode)
    window.api.on('admin-mode-changed', handleModeChange)

    // ラッキーヒット受信
    const handleLuckyHit = (data) => {
      // ログに追加 (最新が下)
      setLogs((prev) => [...prev, { ...data, timestamp: new Date().toLocaleTimeString() }].slice(-50))
    }
    if (window.api.onLuckyHit) window.api.onLuckyHit(handleLuckyHit)

    return () => {
      window.api.removeAllListeners('admin-mode-changed')
      window.api.removeAllListeners('lucky-hit')
    }
  }, [])

  // 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // リサイズ監視
  useEffect(() => {
      if (!containerRef.current) return
      const observer = new ResizeObserver(() => {
        // ★修正
        const { width, height } = containerRef.current.getBoundingClientRect()
        if (width > 0 && height > 0) {
          window.api.resizeWindow(Math.ceil(width), Math.ceil(height))
        }
      })
      observer.observe(containerRef.current)
      return () => observer.disconnect()
    }, [])

  return (
    <div 
      ref={containerRef}
      className={`window-container ${isInteractive ? 'interactive' : ''}`}
      style={{
        resize: isInteractive ? 'both' : 'none',
        overflow: 'hidden',
        width: '100%',
        height: '100%'
      }}
    >
      {isInteractive && (
        <div className="drag-handle" style={{ background: 'rgba(255, 215, 0, 0.2)', color: '#ffd700', borderBottom: '1px solid #ffd700' }}>
          <span>✨ JACKPOT LOG</span>
        </div>
      )}
      
      <div className="log-list">
        {logs.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', marginTop: '20px', fontStyle: 'italic' }}>
            No Winners Yet...
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="log-item">
            <div className="log-time">{log.timestamp}</div>
            <div className="log-content" style={{ borderLeft: `4px solid ${log.color}` }}>
              {log.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <style>{`
        .window-container {
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 8px;
          border: 1px solid rgba(255, 215, 0, 0.3); /* 金色の枠 */
        }
        .window-container:not(.interactive) {
          background: transparent;
          border-color: transparent;
        }
        .window-container.interactive {
          overflow: auto !important; 
        }

        .log-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          scrollbar-width: none;
        }
        .log-list::-webkit-scrollbar {
          display: none;
        }
        
        .log-item {
          margin-bottom: 10px;
          animation: slideIn 0.3s ease-out;
        }
        .log-time {
          font-size: 10px;
          color: #aaa;
          margin-bottom: 2px;
        }
        .log-content {
          background: rgba(50, 40, 10, 0.9); /* 少し黄色っぽい黒 */
          color: #ffd700; /* 金文字 */
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 16px;
          font-weight: bold;
          word-break: break-word;
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.1);
        }

        @keyframes slideIn {
          from { transform: translateX(-10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default LuckyLogWindow