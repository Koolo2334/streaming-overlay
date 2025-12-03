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
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
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
            <span className="comment-text">
              {/* messageParts がある場合はリッチ表示、なければテキストのみ */}
              {c.messageParts ? c.messageParts.map((part, index) => {
                // 画像URLがある場合（絵文字やスタンプ）
                if (part.url) {
                  return (
                    <img 
                      key={index} 
                      src={part.url} 
                      alt={part.text}
                      className="emoji-img" 
                    />
                  )
                }
                // 通常のテキスト
                return <span key={index}>{part.text}</span>
              }) : c.text}
            </span>
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
          background: rgba(30, 30, 30, 0.85);
          color: white;
          padding: 10px 14px;
          margin-bottom: 8px;
          border-radius: 6px;
          font-size: 18px;
          font-weight: 600;
          line-height: 1.4;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
          animation: slideIn 0.2s ease-out;
          word-break: break-word; 
          white-space: pre-wrap;
        }

        /* ★絵文字用のスタイル */
        .emoji-img {
          height: 1.4em; /* 文字より少し大きく */
          vertical-align: middle; /* 行の中央に揃える */
          margin: 0 2px;
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