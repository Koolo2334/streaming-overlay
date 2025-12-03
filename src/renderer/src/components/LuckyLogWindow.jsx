import React, { useState, useEffect, useRef } from 'react'

const LuckyLogWindow = () => {
  const [logs, setLogs] = useState([])
  const [isInteractive, setIsInteractive] = useState(false)
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleModeChange = (mode) => setIsInteractive(mode)
    window.api.on('admin-mode-changed', handleModeChange)

    const handleLuckyHit = (data) => {
      setLogs((prev) => [...prev, { 
        ...data, 
        timestamp: new Date().toLocaleTimeString() 
      }].slice(-50))
    }
    if (window.api.onLuckyHit) window.api.onLuckyHit(handleLuckyHit)

    return () => {
      window.api.removeAllListeners('admin-mode-changed')
      window.api.removeAllListeners('lucky-hit')
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        if (width > 0 && height > 0) {
          window.api.resizeWindow(Math.ceil(width), Math.ceil(height))
        }
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
        overflow: isInteractive ? 'auto' : 'hidden',
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
          <div style={{ textAlign: 'center', color: '#aaa', marginTop: '20px', fontStyle: 'italic', fontSize: '14px' }}>
            No Winners Yet...
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="log-item" style={{ borderLeft: `5px solid ${log.color}` }}>
            <div className="log-header">
              {log.authorIcon && <img src={log.authorIcon} alt="" className="author-icon" referrerPolicy="no-referrer" />}
              {/* LuckyLogは常に金色 */}
              <span className="log-author" style={{ color: '#ffd700' }}>{log.authorName || 'Guest'}</span>
              
              {/* ★修正: URLチェック */}
              {log.authorBadges && log.authorBadges.map((b, k) => (
                b.url ? <img key={k} src={b.url} alt={b.label} className="badge-icon" title={b.label} referrerPolicy="no-referrer" /> : null
              ))}

              <span className="log-time">{log.timestamp}</span>
            </div>
            
            <span className="log-text">
              {log.text}
            </span>
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
          border: 1px solid rgba(255, 215, 0, 0.3);
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
          background: rgba(30, 30, 30, 0.85);
          color: white;
          padding: 8px 12px;
          margin-bottom: 8px;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.2s ease-out;
          word-break: break-word; 
        }

        .log-header {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
        }

        .author-icon { width: 20px; height: 20px; border-radius: 50%; margin-right: 6px; border: 1px solid #ffd700; object-fit: cover; }
        .badge-icon { width: 14px; height: 14px; margin-left: 4px; object-fit: contain; }

        .log-author {
          font-size: 14px;
          color: #ffd700;
          font-weight: bold;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-shadow: 0 1px 1px rgba(0,0,0,0.5);
        }

        .log-time {
          font-size: 11px;
          color: #aaa;
          margin-left: auto;
        }

        .log-text {
          font-size: 18px;
          font-weight: 600;
          line-height: 1.4;
          color: #ffd700;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
          padding-left: 26px;
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