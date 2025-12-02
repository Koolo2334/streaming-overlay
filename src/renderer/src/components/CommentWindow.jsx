import React, { useState, useEffect, useRef } from 'react'

const CommentWindow = () => {
  const [comments, setComments] = useState([])
  const [isInteractive, setIsInteractive] = useState(false)
  
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    // Adminモード同期
    const handleModeChange = (mode) => setIsInteractive(mode)
    window.api.on('admin-mode-changed', handleModeChange)

    // コメント受信
    const handleNewComment = (data) => {
      setComments((prev) => [...prev, data].slice(-50))
    }
    window.api.on('new-comment', handleNewComment)

    return () => {
      window.api.removeAllListeners('admin-mode-changed')
      window.api.removeAllListeners('new-comment')
    }
  }, [])

  // 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

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
        <div className="drag-handle">
          <span>💬 Comments</span>
        </div>
      )}
      
      <div className="comment-list">
        {comments.map((c, i) => (
          <div key={i} className="comment-item" style={{ borderLeft: `5px solid ${c.color}` }}>
            <span className="comment-text">{c.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <style>{`
        .window-container {
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 8px;
        }
        .window-container:not(.interactive) {
          background: transparent;
        }
        .window-container.interactive {
          overflow: auto !important; 
        }

        .comment-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          scrollbar-width: none;
        }
        .comment-list::-webkit-scrollbar {
          display: none;
        }
        
        .comment-item {
          background: rgba(30, 30, 30, 0.85); /* 背景を少し濃くして文字を目立たせる */
          color: white;
          padding: 10px 14px; /* 余白も少し広げる */
          margin-bottom: 8px;
          border-radius: 6px;
          
          /* ★フォント調整 */
          font-size: 18px;       /* 14px -> 18px */
          font-weight: 600;      /* 太字で見やすく */
          line-height: 1.4;      /* 行間を適切に */
          text-shadow: 0 1px 2px rgba(0,0,0,0.8); /* 文字の縁取り（影） */

          animation: slideIn 0.2s ease-out;
          word-break: break-word; 
          white-space: pre-wrap;
        }
        @keyframes slideIn {
          from { transform: translateX(-10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default CommentWindow