import React, { useState, useEffect, useRef } from 'react'
import EffectCanvas from './EffectCanvas'
import { OBS_GAME_LAYOUT } from '../constants'

const OBS_View = () => {
  // --- Basic State (From Old) ---
  const [currentScene, setCurrentScene] = useState('main')
  const [luckyData, setLuckyData] = useState(null)
  const [comments, setComments] = useState([])
  const commentBottomRef = useRef(null)

  const { x: contentX, y: contentY, width: contentW, height: contentH, frame } = OBS_GAME_LAYOUT
  
  const borderWidth = frame ? frame.borderWidth : 2
  const headerHeight = frame ? frame.headerHeight : 32
  
  const width = contentW + (borderWidth * 2)
  const height = contentH + headerHeight + (borderWidth * 2)
  const x = contentX - borderWidth
  const y = contentY - headerHeight - borderWidth

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

  // --- Info Scroll Logic ---
  const [infoConfig, setInfoConfig] = useState({ messages: [], speed: 2, interval: 0.2 })
  const scrollContainerRef = useRef(null)
  const scrollItemsRef = useRef([]) 
  const reqRef = useRef(null)
  const nextMsgIndexRef = useRef(0)

  // --- Boot / Transition State ---
  const [visualMode, setVisualMode] = useState('main') 
  const [bootLogs, setBootLogs] = useState([])
  const [bootProgress, setBootProgress] = useState(0)
  
  const [gameActive, setGameActive] = useState(false)
  
  // --- Avatar & Audio State ---
  const [avatarUrl, setAvatarUrl] = useState(null)
  
  // 音量解析用
  const BUFFER_SIZE = 50 
  const audioDataRef = useRef(new Array(BUFFER_SIZE).fill(0)) 
  const audioCanvasRef = useRef(null)
  const audioAnimRef = useRef(null)
  const currentVolRef = useRef(0)
  const lastVolRef = useRef(0) 

  const bootStateRef = useRef({
    isRunning: false,
    phase: 0,
    textIndex: 0,
    logs: [],
    progress: 0,
    timer: null
  })

  useEffect(() => {
    const handleSceneChange = (sceneName) => {
        setCurrentScene((prev) => {
            if (prev === 'op' && sceneName === 'main') {
                handleTransitionOpToMain()
                return sceneName
            }
            setVisualMode(sceneName)
            return sceneName
        })
    }
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

    window.api.getInfoConfig().then(cfg => { if (cfg) setInfoConfig(cfg) })
    window.api.onInfoConfigUpdate(newCfg => { setInfoConfig(newCfg) })
    
    window.api.getAvatarImage().then(url => { if(url) setAvatarUrl(url) })
    window.api.onAvatarImageUpdate(url => { setAvatarUrl(url) })

    // マイク音量
    const handleVolume = (vol) => {
        const threshold = 0.01
        const adjustedVol = vol < threshold ? 0 : (vol - threshold) * 3.0 
        currentVolRef.current = Math.min(adjustedVol, 1.0)
    }
    if (window.api.onMicVolumeUpdate) {
        window.api.onMicVolumeUpdate(handleVolume)
    }

    return () => {
      if (window.api.removeAllListeners) {
        window.api.removeAllListeners('change-scene')
        window.api.removeAllListeners('lucky-hit')
        window.api.removeAllListeners('new-comment')
        window.api.removeAllListeners('update-info-config')
        window.api.removeAllListeners('update-avatar-image')
        window.api.removeAllListeners('mic-volume')
      }
      cancelAnimationFrame(reqRef.current)
      cancelAnimationFrame(audioAnimRef.current)
      clearTimeout(bootStateRef.current.timer)
    }
  }, [])

  // --- Audio Visualizer Loop ---
  useEffect(() => {
    const canvas = audioCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    
    const size = 300 
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    const centerX = size / 2
    const centerY = size / 2
    
    const baseRadius = 82 
    const maxWaveHeight = 60 

    const render = () => {
        const data = audioDataRef.current
        const shiftSpeed = 20 
        const targetVol = currentVolRef.current
        
        if (targetVol > lastVolRef.current) {
            lastVolRef.current = lastVolRef.current + (targetVol - lastVolRef.current) * 0.5
        } else {
            lastVolRef.current = lastVolRef.current + (targetVol - lastVolRef.current) * 0.2
        }
        
        for (let k = 0; k < shiftSpeed; k++) {
            data.pop()
            const jaggedFactor = 0.2 + Math.random() * 1.8
            const noisyVol = lastVolRef.current * jaggedFactor
            data.unshift(noisyVol)
        }
        currentVolRef.current *= 0.8 

        ctx.clearRect(0, 0, size, size)
        
        ctx.lineCap = 'butt' 
        ctx.lineJoin = 'miter' 
        ctx.lineWidth = 2
        ctx.strokeStyle = '#f1fa8c'
        ctx.shadowBlur = 6
        ctx.shadowColor = '#f1fa8c'

        const anchors = [ -Math.PI / 2, 0, Math.PI / 2, Math.PI ]
        const sectorArc = Math.PI / 4 

        ctx.beginPath()

        anchors.forEach(anchorAngle => {
            for (let i = 0; i < data.length; i++) {
                const vol = data[i]
                const progress = i / (data.length - 1)
                const angle = anchorAngle + (progress * sectorArc)
                const r = baseRadius + (vol * maxWaveHeight)
                const x = centerX + Math.cos(angle) * r
                const y = centerY + Math.sin(angle) * r
                if (i === 0) ctx.moveTo(x, y) 
                else ctx.lineTo(x, y)
            }
            ctx.moveTo(
                centerX + Math.cos(anchorAngle) * (baseRadius + data[0] * maxWaveHeight),
                centerY + Math.sin(anchorAngle) * (baseRadius + data[0] * maxWaveHeight)
            )
            for (let i = 0; i < data.length; i++) {
                const vol = data[i]
                const progress = i / (data.length - 1)
                const angle = anchorAngle - (progress * sectorArc)
                const r = baseRadius + (vol * maxWaveHeight)
                const x = centerX + Math.cos(angle) * r
                const y = centerY + Math.sin(angle) * r
                ctx.lineTo(x, y)
            }
        })
        ctx.stroke()
        audioAnimRef.current = requestAnimationFrame(render)
    }
    render()
    return () => cancelAnimationFrame(audioAnimRef.current)
  }, []) 

  // --- Boot Sequence Logic ---
  const addBootLog = (text) => {
    const newLogs = [...bootStateRef.current.logs.slice(-14), text]
    bootStateRef.current.logs = newLogs
    setBootLogs(newLogs)
  }
  const updateProgress = (val) => {
    bootStateRef.current.progress = val
    setBootProgress(val)
  }
  const BOOT_PHASES = [
    { name: "HARDWARE_INIT", baseProgress: 0, steps: [ { text: "BIOS DATE 01/01/2025 12:34:56 VER 2.1.0", delay: 800 }, { text: "CPU: QUANTUM CORE i99 128-CORE DETECTED", delay: 600 }, { text: "CHECKING NVRAM..", delay: 400, suffix: " [ OK ]" }, { text: "DRAM FREQUENCY: 6400MHz", delay: 400 }, { text: "USB CONTROLLER INITIALIZED", delay: 300 } ] },
    { name: "DRIVERS_LOAD", baseProgress: 20, steps: [ { text: "LOADING KERNEL IMAGE", delay: 1200, progressAdd: 5, suffix: "... 100%" }, { text: "MOUNTING FILESYSTEM [ROOT]", delay: 800, suffix: " [ OK ]" }, { text: "INIT: GPU DRIVER (RTX_9090_TI)", delay: 1500, progressAdd: 10 }, { text: "INIT: AUDIO SUBSYSTEM", delay: 600 }, { text: "INIT: NETWORK ADAPTER (10GbE)", delay: 900 } ] },
    { name: "SYSTEM_SERVICES", baseProgress: 60, steps: [ { text: "STARTING: POWER MANAGEMENT", delay: 400, suffix: " [ OK ]" }, { text: "STARTING: CRON DAEMON", delay: 300, suffix: " [ OK ]" }, { text: "STARTING: SECURITY AUDIT", delay: 600 }, { text: "CONNECTING TO STREAM SERVERS...", delay: 2000, progressAdd: 15, suffix: " CONNECTED" }, { text: "SYNCING TIME WITH NTP...", delay: 500, suffix: " [ OK ]" } ] },
    { name: "USER_SPACE", baseProgress: 90, steps: [ { text: "PREPARING USER SESSION", delay: 800 }, { text: "LOADING OVERLAY CONFIGURATION", delay: 600 }, { text: "WAITING FOR SYSTEM READY...", delay: 1500 } ] }
  ]
  const runBootSequence = async () => {
    if (!bootStateRef.current.isRunning) return
    const { phase, textIndex } = bootStateRef.current
    if (phase >= BOOT_PHASES.length) {
      addBootLog(">> SYSTEM REBOOT REQUIRED <<")
      await wait(2000)
      if (!bootStateRef.current.isRunning) return
      bootStateRef.current.phase = 0
      bootStateRef.current.textIndex = 0
      bootStateRef.current.logs = []
      updateProgress(0)
      setBootLogs([])
      runBootSequence()
      return
    }
    const currentPhaseData = BOOT_PHASES[phase]
    const step = currentPhaseData.steps[textIndex]
    await wait(step.delay || 500)
    if (!bootStateRef.current.isRunning) return
    let displayLine = step.text
    let currentP = bootStateRef.current.progress
    let add = step.progressAdd || 2
    let nextP = Math.min(currentP + add, 99) 
    if (step.suffix) { displayLine += step.suffix } else { displayLine += ` ... ${Math.floor(nextP)}%` }
    addBootLog(displayLine)
    updateProgress(nextP)
    const nextTextIndex = textIndex + 1
    if (nextTextIndex >= currentPhaseData.steps.length) { bootStateRef.current.phase = phase + 1; bootStateRef.current.textIndex = 0 } else { bootStateRef.current.textIndex = nextTextIndex }
    runBootSequence()
  }
  const startBootLoop = () => {
    bootStateRef.current.isRunning = false
    clearTimeout(bootStateRef.current.timer) 
    bootStateRef.current = { isRunning: true, phase: 0, textIndex: 0, logs: [], progress: 0, timer: null }
    setBootLogs([])
    updateProgress(0)
    runBootSequence()
  }
  const handleTransitionOpToMain = async () => {
      bootStateRef.current.isRunning = false
      setVisualMode('transition')
      await wait(500)
      const transitionSteps = [
          { text: ">> INTERRUPT: SWITCHING TO MAIN SCENE", wait: 600, prog: 20 },
          { text: "AUTHENTICATING USER [ADMIN]...", wait: 800, prog: 40 },
          { text: "ACCESS GRANTED. WELCOME BACK.", wait: 600, prog: 45 },
          { text: "INIT: GRAPHICAL_SHELL_V2", wait: 1200, prog: 70 },
          { text: "LOADING WIDGETS: GAME, CHAT, STATUS", wait: 1000, prog: 85 },
          { text: "APPLYING DESKTOP THEME...", wait: 800, prog: 92 },
          { text: "SYSTEM READY. LAUNCHING...", wait: 500, prog: 100 }
      ]
      for (const step of transitionSteps) {
          addBootLog(step.text)
          if (step.prog) updateProgress(step.prog)
          await wait(step.wait)
      }
      setVisualMode('main')
  }
  const wait = (ms) => new Promise(resolve => { bootStateRef.current.timer = setTimeout(resolve, ms) })

  useEffect(() => {
    if (visualMode === 'op') {
        setGameActive(false)
        startBootLoop()
    } else if (visualMode === 'transition') {
        setGameActive(false)
    } else if (visualMode === 'main') {
        bootStateRef.current.isRunning = false
        clearTimeout(bootStateRef.current.timer)
        const timer = setTimeout(() => { setGameActive(true) }, 1500)
        return () => clearTimeout(timer)
    } else {
        setGameActive(false)
        bootStateRef.current.isRunning = false
        clearTimeout(bootStateRef.current.timer)
    }
  }, [visualMode])

  useEffect(() => {
    if (commentBottomRef.current) commentBottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const animate = () => {
      const { messages, speed, interval } = infoConfig
      const validMessages = messages.filter(m => m.enabled)
      if (validMessages.length === 0) {
        scrollItemsRef.current.forEach(item => item.element.remove())
        scrollItemsRef.current = []
        reqRef.current = requestAnimationFrame(animate)
        return
      }
      const itemsToRemove = []
      scrollItemsRef.current.forEach((item, index) => {
        item.x -= speed
        item.element.style.transform = `translateX(${item.x}px)`
        if (item.x + item.width < -100) itemsToRemove.push(index)
      })
      for (let i = itemsToRemove.length - 1; i >= 0; i--) {
        const idx = itemsToRemove[i]
        scrollItemsRef.current[idx].element.remove()
        scrollItemsRef.current.splice(idx, 1)
      }
      let shouldAdd = false
      const containerWidth = infoW
      if (scrollItemsRef.current.length === 0) {
        shouldAdd = true
      } else {
        const lastItem = scrollItemsRef.current[scrollItemsRef.current.length - 1]
        const lastItemTail = lastItem.x + lastItem.width
        const gap = containerWidth * interval
        if (lastItemTail < (containerWidth - gap)) shouldAdd = true
      }
      if (shouldAdd) {
        if (nextMsgIndexRef.current >= validMessages.length) nextMsgIndexRef.current = 0
        const msgData = validMessages[nextMsgIndexRef.current]
        const el = document.createElement('div')
        el.textContent = msgData.text
        el.style.position = 'absolute'
        el.style.whiteSpace = 'nowrap'
        el.style.color = 'var(--col-pink)'
        el.style.fontWeight = 'bold'
        el.style.fontSize = '38px'
        el.style.textShadow = '0 2px 4px rgba(0,0,0,0.8)'
        el.style.top = '50%'
        el.style.transform = `translate(${containerWidth}px, -50%)`
        el.style.marginTop = '-25px' 
        container.appendChild(el)
        const width = el.getBoundingClientRect().width
        scrollItemsRef.current.push({ id: msgData.id + '-' + Date.now(), x: containerWidth, width: width, element: el })
        nextMsgIndexRef.current++
      }
      reqRef.current = requestAnimationFrame(animate)
    }
    reqRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(reqRef.current)
  }, [infoConfig, infoW])

  return (
    <div className={`obs-container`}>
      
      {/* Background Layers */}
      <div className="bg-mask-container">
        <div className="bg-part top" style={{ top: 0, left: 0, width: '100%', height: y }} />
        <div className="bg-part bottom" style={{ top: y + height, left: 0, width: '100%', height: FULL_HEIGHT - (y + height) }} />
        <div className="bg-part left" style={{ top: y, left: 0, width: x, height: height }} />
        <div className="bg-part right" style={{ top: y, left: x + width, width: FULL_WIDTH - (x + width), height: height }} />
        {!gameActive && <div className="bg-part center" style={{ top: y, left: x, width: width, height: height, zIndex: 1 }} />}
      </div>

      <div className={`full-cover-bg ${visualMode !== 'main' ? 'visible' : ''}`} />

      {/* --- MAIN SCENE --- */}
      <div className={`scene-content main-scene ${visualMode === 'main' ? 'active' : ''}`}>
        
        {/* Game Capture Window */}
        <div className="tech-window game-window" style={{ left: x, top: y, width, height }}>
          <div className="window-header">
            <div className="window-title">🔵 GAME_CAPTURE.exe</div>
            <div className="window-controls"><span/><span/><span/></div>
          </div>
          <div className={`window-body game-window-body ${gameActive ? 'transparent-body' : ''}`}>
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
                const nameStyle = { fontWeight: 'bold', color: c.isMember ? '#2ba640' : '#eee', textShadow: '0 1px 1px rgba(0,0,0,0.5)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
                return (
                  <li key={i} className={`comment-row ${isSC ? 'superchat' : ''}`} style={{ borderLeft: isSC ? 'none' : `3px solid ${c.color}`, ...bgStyle }}>
                    {isSC && (
                      <div className="sc-header-row">
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
                        {c.authorBadges && c.authorBadges.map((b, k) => ( b.url ? <img key={k} src={b.url} alt={b.label} className="badge-icon" title={b.label} referrerPolicy="no-referrer" /> : null ))}
                      </div>
                    )}
                    <div className="comment-content">
                      {c.supersticker && c.supersticker.sticker.url ? ( <img src={c.supersticker.sticker.url} alt="sticker" className="sticker-img" referrerPolicy="no-referrer" /> ) : ( <span className="comment-text"> {c.messageParts ? c.messageParts.map((part, idx) => ( part.url ? <img key={idx} src={part.url} alt="" className="emoji" referrerPolicy="no-referrer" /> : <span key={idx}>{part.text}</span> )) : c.text} </span> )}
                    </div>
                  </li>
                )
              })}
              <div ref={commentBottomRef} />
            </ul>
          </div>
        </div>

        {/* Info Window */}
        <div className="tech-window info-window" style={{ left: infoX, top: infoY, width: infoW, height: infoH }}>
          <div className="window-header">
            <div className="window-title">🟣 SYSTEM_STATUS</div>
            <div className="window-controls"><span/><span/><span/></div>
          </div>
          <div className="window-body" style={{ position: 'relative', overflow: 'hidden' }} ref={scrollContainerRef}></div>
        </div>
        
        {/* ★修正: Canvas専用のクリッピングコンテナを画面全体に被せる
             このコンテナは1920x1080固定で、overflow: hiddenを持つ。
             これにより、内部のCanvasがどれだけ大きくても画面外にはみ出すことがなくなる。 */}
        <div 
            className="canvas-clipper-container"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '1920px',
                height: '1080px',
                overflow: 'hidden', // ★ここが重要: 画面外を切り取る
                pointerEvents: 'none',
                zIndex: 5
            }}
        >
            {/* アニメーション用のラッパー（アバターの位置に配置） */}
            <div
                className="visualizer-wrapper"
                style={{
                    position: 'absolute',
                    left: avatarX,
                    top: avatarY,
                    width: avatarW,
                    height: avatarH,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0, 
                    transform: 'scale(0.9)',
                    animation: visualMode === 'main' ? 'slideUpFade 0.6s ease-out 1.2s forwards' : 'none'
                }}
            >
                {/* Canvas本体（300x300） */}
                <canvas ref={audioCanvasRef} className="voice-canvas" style={{ display: 'block' }} />
            </div>
        </div>

        {/* Original Avatar Area */}
        <div className="avatar-area" style={{ left: avatarX, top: avatarY, width: avatarW, height: avatarH }}>
          <div className="avatar-placeholder">
            <div 
                className="avatar-circle"
                style={avatarUrl ? { backgroundImage: `url('${avatarUrl}')` } : {}}
            ></div>
          </div>
        </div>

        {/* Win Zone */}
        <div className="target-zone-container" style={{ position: 'absolute', bottom: '0px', left: infoX, width: infoW, display: 'flex', justifyContent: 'center' }}>
          <div className="target-zone">WIN ZONE</div>
        </div>
      </div>

      {/* --- OP SCENE --- */}
      <div className={`scene-content op-scene ${(visualMode === 'op' || visualMode === 'transition') ? 'active' : ''}`}>
        <div className="boot-screen">
          <div className="boot-log">
            {bootLogs.map((log, i) => ( <div key={i} className="log-line">{log}</div> ))}
            <div className="log-line"><span className="blink-cursor">_</span></div>
          </div>
          <div className="boot-progress">
             <div className="boot-bar" style={{ width: `${bootProgress}%`, transition: 'none' }}></div>
             <div className="boot-text">{visualMode === 'transition' ? 'STARTING' : 'BOOTING'} ... {Math.floor(bootProgress)}%</div>
          </div>
        </div>
      </div>

      {/* --- ED SCENE --- */}
      <div className={`scene-content ed-scene ${visualMode === 'ed' ? 'active' : ''}`}>
        <div className="pop-box"><h1>SEE YOU!</h1><p>Thanks for watching</p></div>
      </div>

      {/* Lucky Overlay */}
      {visualMode === 'main' && gameActive && luckyData && (
        <div className="lucky-overlay" style={{ left: infoX, width: infoW, bottom: 0 }}>
          <div className="lucky-box">
            <h1 className="lucky-title">✨ JACKPOT!! ✨</h1>
            <div className="lucky-comment">
              <div style={{ fontSize: '20px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: luckyData.color }}>
                {luckyData.authorIcon && <img src={luckyData.authorIcon} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '10px', border: `2px solid ${luckyData.color}` }} referrerPolicy="no-referrer" />}
                <span style={{ fontWeight: 'bold', textShadow: '0 0 2px black' }}>Winner: {luckyData.authorName}</span>
              </div>
              <div className="lucky-message-text">
                {luckyData.messageParts ? luckyData.messageParts.map((part, index) => ( part.url ? <img key={index} src={part.url} alt="" className="lucky-emoji" referrerPolicy="no-referrer" /> : <span key={index}>{part.text}</span> )) : luckyData.text}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Physics Layer */}
      {visualMode === 'main' && gameActive && (
        <div className="physics-layer">
          <EffectCanvas viewMode="obs" />
        </div>
      )}

      <style>{`
        body, html, #root {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: transparent;
        }

        :root { --col-bg: #1e1e2e; --col-win-bg: #282a36; --col-border: #44475a; --col-cyan: #8be9fd; --col-pink: #ff79c6; --col-yellow: #f1fa8c; --col-purple: #bd93f9; --col-text: #f8f8f2; }
        
        .obs-container { 
            position: absolute; 
            top: 0; 
            left: 0;
            width: 1920px; 
            height: 1080px; 
            overflow: hidden; 
            font-family: 'Consolas', monospace; 
            color: var(--col-text);
        }

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
        
        .game-window-body { background-color: #000; transition: background-color 0.5s ease; }
        .game-window-body.transparent-body { background-color: transparent !important; } 
        .rec-indicator { position: absolute; top: 10px; right: 10px; color: #ff5555; font-weight: bold; animation: blink 1s infinite; text-shadow: 0 0 5px red; }
        @keyframes blink { 50% { opacity: 0; } }

        .main-scene .tech-window, .main-scene .avatar-area, .main-scene .target-zone-container { opacity: 0; transform: scale(0.9); }
        /* Wrapper animation sync */
        .main-scene .visualizer-wrapper { opacity: 0; transform: scale(0.9); }

        .main-scene.active .game-window { animation: windowPopUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s forwards; }
        .main-scene.active .comment-window { animation: windowPopUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.6s forwards; }
        .main-scene.active .info-window { animation: windowPopUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.9s forwards; }
        .main-scene.active .avatar-area { animation: slideUpFade 0.6s ease-out 1.2s forwards; transform: translateY(50px); }
        .main-scene.active .target-zone-container { animation: fadeIn 0.5s ease 1.5s forwards; }

        @keyframes windowPopUp { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUpFade { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .avatar-area { position: absolute; display: flex; align-items: center; justify-content: center; }
        .avatar-circle { width: 150px; height: 150px; background: #44475a; border: 4px solid var(--col-text); border-radius: 50%; background-size: cover; z-index: 10; position: relative; }
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
        .author-icon { width: 20px; height: 20px; border-radius: 50%; margin-right: 6px; object-fit: cover; }
        .badge-icon { width: 16px; height: 16px; margin-left: 4px; object-fit: contain; }
        .comment-author { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .comment-content { padding-left: 26px; }
        .comment-row.superchat .comment-content { padding-left: 10px; }
        .emoji { height: 1.4em; vertical-align: middle; margin: 0 2px; }
        .sticker-img { max-width: 80px; max-height: 80px; display: block; margin: 5px 0; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }

        .pop-box { background: white; color: black; padding: 40px 80px; border: 4px solid black; box-shadow: 15px 15px 0 var(--col-purple); text-align: center; transform: rotate(-2deg); }
        .pop-box h1 { font-size: 60px; margin: 0; color: var(--col-pink); -webkit-text-stroke: 2px black; }

        .boot-screen { width: 100%; height: 100%; background: #000; color: #ccc; font-family: 'Courier New', monospace; padding: 60px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; z-index: 50; }
        .boot-log { flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; }
        .log-line { margin-bottom: 5px; font-size: 24px; text-shadow: 0 0 5px #333; white-space: pre-wrap; word-break: break-all; }
        .blink-cursor { animation: blink 0.8s infinite; color: var(--col-pink); font-weight: bold; }
        .boot-progress { margin-top: 40px; }
        .boot-bar { width: 0%; height: 20px; background: var(--col-purple); box-shadow: 0 0 10px var(--col-purple); }
        .boot-text { margin-top: 10px; font-size: 20px; color: var(--col-cyan); text-align: right; }

        .lucky-overlay { position: absolute; display: flex; justify-content: center; align-items: flex-end; z-index: 200; pointer-events: none; }
        .lucky-box { background: rgba(0, 0, 0, 0.9); border: 4px solid var(--col-yellow); padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 0 50px var(--col-yellow); animation: jumpOut 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; transform-origin: center bottom; }
        @keyframes jumpOut { 0% { opacity: 0; transform: translateY(50px) scale(0.5); } 50% { opacity: 1; transform: translateY(-180px) scale(1.1); } 100% { opacity: 1; transform: translateY(-150px) scale(1); } }
        .lucky-title { font-size: 60px; margin: 0; color: var(--col-yellow); text-shadow: 0 0 10px orange; animation: pulse 0.5s infinite; }
        .lucky-comment { margin-top: 20px; }
        .lucky-message-text { font-size: 32px; font-weight: 800; color: white; line-height: 1.4; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }
        .lucky-emoji { height: 1.2em; vertical-align: middle; margin: 0 4px; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  )
}

export default OBS_View