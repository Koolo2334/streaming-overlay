import React, { useState, useEffect, useRef } from 'react'
import EffectCanvas from './EffectCanvas'
import { OBS_GAME_LAYOUT } from '../constants'

const OBS_View = () => {
  const [currentScene, setCurrentScene] = useState('main')
  const [luckyData, setLuckyData] = useState(null)
  const [comments, setComments] = useState([])
  const commentBottomRef = useRef(null)

  const { x, y, width, height } = OBS_GAME_LAYOUT
  const FULL_WIDTH = 1920
  const FULL_HEIGHT = 1080

  const GAP = 20
  const commentX = x + width + GAP
  const commentY = y
  const commentW = FULL_WIDTH - commentX - 40
  const commentH = height
  const infoX = x
  const infoY = y + height + GAP
  const infoW = width
  const infoH = FULL_HEIGHT - infoY - 40
  const avatarX = commentX
  const avatarY = infoY
  const avatarW = commentW
  const avatarH = infoH

  useEffect(() => {
    const handleSceneChange = (sceneName) => setCurrentScene(sceneName)
    if (window.api.onSceneChange) window.api.onSceneChange(handleSceneChange)

    const handleLuckyHit = (data) => {
      setLuckyData(data)
      setTimeout(() => setLuckyData(null), 3000)
    }
    if (window.api.onLuckyHit) window.api.onLuckyHit(handleLuckyHit)

    const handleNewComment = (data) => {
      setComments((prev) => [...prev, data].slice(-30))
    }
    if (window.api.on) {
      window.api.on('new-comment', handleNewComment)
    }

    return () => {
      if (window.api.removeAllListeners) {
        window.api.removeAllListeners('change-scene')
        window.api.removeAllListeners('lucky-hit')
        window.api.removeAllListeners('new-comment')
      }
    }
  }, [])

  useEffect(() => {
    if (commentBottomRef.current) {
      commentBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments])

  return (
    <div className={`obs-container scene-${currentScene}`}>
      
      <div className="bg-mask-container">
        <div className="bg-part top" style={{ top: 0, left: 0, width: '100%', height: y }} />
        <div className="bg-part bottom" style={{ top: y + height, left: 0, width: '100%', height: FULL_HEIGHT - (y + height) }} />
        <div className="bg-part left" style={{ top: y, left: 0, width: x, height: height }} />
        <div className="bg-part right" style={{ top: y, left: x + width, width: FULL_WIDTH - (x + width), height: height }} />
      </div>

      <div className={`full-cover-bg ${currentScene !== 'main' ? 'visible' : ''}`} />

      <div className={`scene-content main-scene ${currentScene === 'main' ? 'active' : ''}`}>
        
        <div className="tech-window game-window" style={{ left: x, top: y, width, height }}>
          <div className="window-header">
            <div className="window-title">🔵 GAME_CAPTURE.exe</div>
            <div className="window-controls"><span/><span/><span/></div>
          </div>
          <div className="window-body transparent-body">
            <div className="rec-indicator">● REC</div>
          </div>
        </div>

        {/* Comment Window */}
        <div className="tech-window comment-window" style={{ left: commentX, top: commentY, width: commentW, height: commentH }}>
          <div className="window-header">
            <div className="window-title">🟡 CHAT_STREAM.log</div>
            <div className="window-controls"><span/><span/><span/></div>
          </div>
          <div className="window-body comment-list-container">
            <ul className="comment-list">
              {comments.map((c, i) => {
                const isSC = !!c.superchat;
                const bgStyle = isSC ? { backgroundColor: c.superchat.color } : {};
                
                return (
                  <li key={i} className={`comment-row ${isSC ? 'superchat' : ''}`} style={{ borderLeft: isSC ? 'none' : `3px solid ${c.color}`, ...bgStyle }}>
                    
                    {isSC && (
                      <div className="sc-header-row">
                        <div className="comment-header">
                          {c.authorIcon && <img src={c.authorIcon} alt="" className="author-icon" />}
                          <div className={`comment-author ${c.isMember ? 'member' : ''}`}>{c.authorName || 'Anonymous'}</div>
                        </div>
                        <div className="sc-amount">{c.superchat.amount}</div>
                      </div>
                    )}

                    {!isSC && (
                      <div className="comment-header">
                        {c.authorIcon && <img src={c.authorIcon} alt="" className="author-icon" />}
                        <div className={`comment-author ${c.isMember ? 'member' : ''}`}>{c.authorName || 'Anonymous'}</div>
                      </div>
                    )}

                    <div className="comment-content">
                      {c.supersticker ? (
                        <img src={c.supersticker.sticker.url} alt="sticker" className="sticker-img" />
                      ) : (
                        <span className="comment-text">
                          {c.messageParts ? c.messageParts.map((part, idx) => (
                            part.url ? <img key={idx} src={part.url} alt="" className="emoji" /> : <span key={idx}>{part.text}</span>
                          )) : c.text}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
              <div ref={commentBottomRef} />
            </ul>
          </div>
        </div>

        {/* ... (他パーツ省略なしで完全版) ... */}
        <div className="tech-window info-window" style={{ left: infoX, top: infoY, width: infoW, height: infoH }}>
          <div className="window-header">
            <div className="window-title">🟣 SYSTEM_STATUS</div>
            <div className="window-controls"><span/><span/><span/></div>
          </div>
          <div className="window-body flex-center" style={{ position: 'relative' }}>
            <div className="scrolling-text">
              🎵 Now Playing: Cyber Pop Synth // 📢 Don't forget to Subscribe! // 🚀 System Engineer Gaming
            </div>
          </div>
        </div>

        <div className="avatar-area" style={{ left: avatarX, top: avatarY, width: avatarW, height: avatarH }}>
          <div className="avatar-placeholder">
            <div className="avatar-circle"></div>
            <div className="speech-bubble">HELLO WORLD!</div>
          </div>
        </div>

        <div className="target-zone-container" style={{ position: 'absolute', bottom: '0px', left: infoX, width: infoW, display: 'flex', justifyContent: 'center' }}>
          <div className="target-zone">WIN ZONE</div>
        </div>

      </div>

      <div className={`scene-content op-scene ${currentScene === 'op' ? 'active' : ''}`}>
        <div className="pop-box"><h1>STARTING!</h1><div className="loader">Loading...</div></div>
      </div>
      <div className={`scene-content ed-scene ${currentScene === 'ed' ? 'active' : ''}`}>
        <div className="pop-box"><h1>SEE YOU!</h1><p>Thanks for watching</p></div>
      </div>

      {luckyData && (
        <div className="lucky-overlay" style={{ left: infoX, width: infoW, bottom: 0 }}>
          <div className="lucky-box">
            <h1 className="lucky-title">✨ JACKPOT!! ✨</h1>
            <div className="lucky-comment" style={{ color: luckyData.color }}>
              <div style={{ fontSize: '20px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {luckyData.authorIcon && <img src={luckyData.authorIcon} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '10px', border: '2px solid #ffd700' }} />}
                <span>Winner: {luckyData.authorName}</span>
              </div>
              {luckyData.text}
            </div>
          </div>
        </div>
      )}

      <div className="physics-layer">
        <EffectCanvas viewMode="obs" />
      </div>

      <style>{`
        /* ... CSS ... */
        :root { --col-bg: #1e1e2e; --col-win-bg: #282a36; --col-border: #44475a; --col-cyan: #8be9fd; --col-pink: #ff79c6; --col-yellow: #f1fa8c; --col-purple: #bd93f9; --col-text: #f8f8f2; }
        .obs-container { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: 'Consolas', monospace; color: var(--col-text); }
        .bg-part, .full-cover-bg { position: absolute; background-color: var(--col-bg); background-image: radial-gradient(var(--col-border) 15%, transparent 16%); background-size: 20px 20px; z-index: 5; }
        .full-cover-bg { inset: 0; z-index: 6; opacity: 0; transition: opacity 0.5s; pointer-events: none; }
        .full-cover-bg.visible { opacity: 1; pointer-events: auto; }
        .physics-layer { position: absolute; inset: 0; z-index: 100; pointer-events: none; }
        .scene-content { position: absolute; inset: 0; z-index: 20; opacity: 0; transition: opacity 0.5s; pointer-events: none; }
        .scene-content.active { opacity: 1; pointer-events: auto; }
        
        .tech-window { position: absolute; background: var(--col-win-bg); border: 2px solid var(--col-border); border-radius: 8px; box-shadow: 8px 8px 0px rgba(0,0,0,0.3); display: flex; flex-direction: column; overflow: hidden; }
        .game-window { background: transparent !important; box-shadow: none; border: 3px solid var(--col-cyan); }
        .game-window .window-header { background: var(--col-win-bg); border-bottom: 2px solid var(--col-cyan); }
        .window-header { height: 32px; background: var(--col-border); display: flex; align-items: center; justify-content: space-between; padding: 0 10px; border-bottom: 2px solid var(--col-border); }
        .window-title { font-weight: bold; font-size: 14px; }
        .game-window .window-title { color: var(--col-cyan); }
        .comment-window .window-title { color: var(--col-yellow); }
        .info-window .window-title { color: var(--col-purple); }
        .window-controls { display: flex; gap: 6px; }
        .window-controls span { width: 10px; height: 10px; border-radius: 50%; background: #6272a4; }
        .window-controls span:nth-child(1) { background: #ff5555; }
        .window-controls span:nth-child(2) { background: #f1fa8c; }
        .window-controls span:nth-child(3) { background: #50fa7b; }
        .window-body { flex: 1; padding: 10px; position: relative; }
        .transparent-body { background: transparent; }
        .rec-indicator { position: absolute; top: 10px; right: 10px; color: #ff5555; font-weight: bold; animation: blink 1s infinite; text-shadow: 0 0 5px red; }
        @keyframes blink { 50% { opacity: 0; } }
        .scrolling-text { white-space: nowrap; font-size: 20px; color: var(--col-pink); animation: scroll 15s linear infinite; }
        @keyframes scroll { from { transform: translateX(100%); } to { transform: translateX(-100%); } }
        
        .avatar-area { position: absolute; display: flex; align-items: center; justify-content: center; }
        .avatar-circle { width: 150px; height: 150px; background: #44475a; border: 4px solid var(--col-text); border-radius: 50%; background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2344475a"/><circle cx="50" cy="40" r="20" fill="white"/><path d="M20 90 Q50 60 80 90" fill="white"/></svg>'); background-size: cover; }
        .speech-bubble { position: absolute; top: 20px; right: 20px; background: white; color: black; padding: 10px 20px; border-radius: 20px; border-bottom-left-radius: 0; font-weight: bold; box-shadow: 4px 4px 0 rgba(0,0,0,0.2); }
        .target-zone { width: 200px; height: 20px; background: rgba(255, 121, 198, 0.5); border: 2px dashed var(--col-pink); border-bottom: none; border-radius: 4px 4px 0 0; display: flex; justify-content: center; align-items: flex-start; color: white; font-weight: bold; font-size: 10px; box-shadow: 0 0 20px var(--col-pink); z-index: 60; }
        
        .comment-list-container { overflow-y: hidden; display: flex; flex-direction: column; justify-content: flex-end; }
        .comment-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; scrollbar-width: none; }
        .comment-list::-webkit-scrollbar { display: none; }
        
        .comment-row { margin-bottom: 8px; padding: 6px 10px; background: rgba(0, 0, 0, 0.3); border-left: 3px solid #fff; border-radius: 4px; animation: slideIn 0.3s ease-out; font-size: 16px; word-break: break-word; line-height: 1.4; display: flex; flex-direction: column; }
        .comment-row.superchat { padding: 0; overflow: hidden; color: black; text-shadow: none; }
        .sc-header-row { padding: 6px 10px; background: rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
        .sc-amount { font-weight: 900; }
        .comment-row.superchat .comment-content { padding: 6px 10px; background: rgba(255,255,255,0.7); }

        .comment-header { display: flex; align-items: center; margin-bottom: 4px; }
        .author-icon { width: 20px; height: 20px; border-radius: 50%; margin-right: 6px; }
        .comment-author { font-size: 14px; color: #eee; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 1px 1px rgba(0,0,0,0.5); }
        .comment-author.member { color: #2ba640 !important; }
        .comment-content { padding-left: 26px; }
        .comment-row.superchat .comment-content { padding-left: 10px; }

        .emoji { height: 1.4em; vertical-align: middle; margin: 0 2px; }
        .sticker-img { max-width: 80px; max-height: 80px; display: block; margin: 5px 0; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }

        .pop-box { background: white; color: black; padding: 40px 80px; border: 4px solid black; box-shadow: 15px 15px 0 var(--col-purple); text-align: center; transform: rotate(-2deg); }
        .pop-box h1 { font-size: 60px; margin: 0; color: var(--col-pink); -webkit-text-stroke: 2px black; }
        .loader { font-weight: bold; margin-top: 10px; }
        
        .lucky-overlay { position: absolute; display: flex; justify-content: center; align-items: flex-end; z-index: 200; pointer-events: none; }
        .lucky-box { background: rgba(0, 0, 0, 0.9); border: 4px solid var(--col-yellow); padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 0 50px var(--col-yellow); animation: jumpOut 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; transform-origin: center bottom; }
        @keyframes jumpOut { 0% { opacity: 0; transform: translateY(50px) scale(0.5); } 50% { opacity: 1; transform: translateY(-180px) scale(1.1); } 100% { opacity: 1; transform: translateY(-150px) scale(1); } }
        .lucky-title { font-size: 60px; margin: 0; color: var(--col-yellow); text-shadow: 0 0 10px orange; animation: pulse 0.5s infinite; }
        .lucky-comment { font-size: 30px; margin-top: 20px; font-weight: bold; text-shadow: 0 0 5px white; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  )
}

export default OBS_View