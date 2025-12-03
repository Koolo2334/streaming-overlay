import React, { useState, useEffect, useRef } from 'react'

const CommentWindow = () => {
  const [comments, setComments] = useState([])
  const [isInteractive, setIsInteractive] = useState(false)
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleModeChange = (mode) => setIsInteractive(mode)
    window.api.on('admin-mode-changed', handleModeChange)

    const handleNewComment = (data) => {
      setComments((prev) => [...prev, data].slice(-50))
    }
    window.api.on('new-comment', handleNewComment)

    return () => {
      window.api.removeAllListeners('admin-mode-changed')
      window.api.removeAllListeners('new-comment')
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

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
      className={`window-container ${isInteractive ? 'interactive' : ''}`}
      style={{
        resize: isInteractive ? 'both' : 'none',
        overflow: isInteractive ? 'auto' : 'hidden',
        width: '100%',
        height: '100%'
      }}
    >
      {isInteractive && (
        <div className="drag-handle"><span>💬 Comments</span></div>
      )}
      
      <div className="comment-list">
        {comments.map((c, i) => {
          const isSC = !!c.superchat;
          const bgStyle = isSC ? { backgroundColor: c.superchat.color } : {};
          
          const nameStyle = {
            fontWeight: 'bold',
            color: c.isMember ? '#2ba640' : '#eee',
            textShadow: '0 1px 1px rgba(0,0,0,0.5)',
            fontSize: '14px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          };

          return (
            <div key={i} className={`comment-item ${isSC ? 'superchat' : ''}`} style={{ borderLeft: isSC ? 'none' : `5px solid ${c.color}`, ...bgStyle }}>
              
              {isSC && (
                <div className="sc-header">
                  <div className="comment-header">
                    {c.authorIcon && <img src={c.authorIcon} alt="" className="author-icon" referrerPolicy="no-referrer" />}
                    <div className="comment-author" style={nameStyle}>{c.authorName || 'Anonymous'}</div>
                  </div>
                  <div className="sc-amount">{c.superchat.amount}</div>
                </div>
              )}

              {!isSC && (
                <div className="comment-header">
                  {c.authorIcon && <img src={c.authorIcon} alt="" className="author-icon" referrerPolicy="no-referrer" />}
                  <div className="comment-author" style={nameStyle}>{c.authorName || 'Anonymous'}</div>
                  {/* ★修正: URLがある場合のみレンダリングする (エラー対策) */}
                  {c.authorBadges && c.authorBadges.map((b, k) => (
                    b.url ? <img key={k} src={b.url} alt={b.label} className="badge-icon" title={b.label} referrerPolicy="no-referrer" /> : null
                  ))}
                </div>
              )}
              
              <div className="comment-content">
                {/* ★修正: ステッカーもURLチェックを追加 */}
                {c.supersticker && c.supersticker.sticker.url ? (
                  <img src={c.supersticker.sticker.url} alt="sticker" className="sticker-img" referrerPolicy="no-referrer" />
                ) : (
                  <span className="comment-text">
                    {c.messageParts ? c.messageParts.map((part, index) => (
                      part.url ? <img key={index} src={part.url} alt="" className="emoji-img" referrerPolicy="no-referrer" /> : <span key={index}>{part.text}</span>
                    )) : c.text}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <style>{`
        .window-container { display: flex; flex-direction: column; background: rgba(0, 0, 0, 0.5); border-radius: 8px; }
        .window-container:not(.interactive) { background: transparent; }
        .window-container.interactive { overflow: auto !important; }
        .comment-list { flex: 1; overflow-y: auto; padding: 10px; scrollbar-width: none; }
        .comment-list::-webkit-scrollbar { display: none; }
        
        .comment-item {
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

        .comment-item.superchat { padding: 0; overflow: hidden; color: #000; text-shadow: none; }
        .sc-header { padding: 8px 12px; background: rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
        .sc-amount { font-weight: 900; font-size: 16px; }
        .comment-item.superchat .comment-content { padding: 8px 12px; background: rgba(255,255,255,0.7); color: black; }
        
        .comment-header { display: flex; align-items: center; margin-bottom: 4px; }
        .author-icon { width: 24px; height: 24px; border-radius: 50%; margin-right: 8px; object-fit: cover; }
        .badge-icon { width: 16px; height: 16px; margin-left: 4px; object-fit: contain; }
        
        .comment-author {
          font-size: 14px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .comment-text { font-size: 18px; font-weight: 600; line-height: 1.4; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
        .comment-item.superchat .comment-text { text-shadow: none; }
        .emoji-img { height: 1.4em; vertical-align: middle; margin: 0 2px; }
        .sticker-img { max-width: 100px; max-height: 100px; display: block; margin: 5px 0; }
        @keyframes slideIn { from { transform: translateX(-10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  )
}

export default CommentWindow