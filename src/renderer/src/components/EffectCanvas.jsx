import React, { useEffect, useRef } from 'react'
import { transformToUserView, transformToOBSView } from '../constants'

const EffectCanvas = ({ viewMode }) => {
  const canvasRef = useRef(null)
  const bodiesRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)
    handleResize()

    let animationFrameId
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      bodiesRef.current.forEach(body => {
        // ★修正: 'lucky-sensor' は描画しない（React側で綺麗なデザインを表示しているため）
        if (body.label !== 'comment' && body.label !== 'peg') return

        let drawX, drawY, drawScale

        if (viewMode === 'user') {
          const t = transformToUserView(body.x, body.y)
          drawX = t.x
          drawY = t.y
          drawScale = t.scale
        } else {
          const t = transformToOBSView(body.x, body.y)
          drawX = t.x
          drawY = t.y
          drawScale = t.scale
        }

        ctx.save()
        ctx.translate(drawX, drawY)
        ctx.rotate(body.angle)

        if (body.label === 'comment') {
          // ★ Orb (Comment)
          const r = body.radius * drawScale
          
          // 光彩効果
          ctx.shadowColor = body.color
          ctx.shadowBlur = 15 * drawScale
          
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, Math.PI * 2)
          ctx.fillStyle = body.color
          ctx.fill()
          
          // ハイライト
          ctx.beginPath()
          ctx.arc(-r*0.3, -r*0.3, r*0.2, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
          ctx.fill()

        } else if (body.label === 'peg') {
          // ★ Peg (釘)
          const r = body.radius * drawScale
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, Math.PI * 2)
          ctx.fillStyle = '#8be9fd'
          ctx.shadowColor = '#8be9fd'
          ctx.shadowBlur = 5 * drawScale
          ctx.fill()

        } else if (body.label === 'lucky-sensor') {
          // ★ Sensor
          const w = body.width * drawScale
          const h = body.height * drawScale
          ctx.strokeStyle = '#ff79c6'
          ctx.lineWidth = 2 * drawScale
          ctx.strokeRect(-w / 2, -h / 2, w, h)
        }

        ctx.restore()
      })

      animationFrameId = requestAnimationFrame(render)
    }
    render()

    const removeListener = window.api.onPhysicsUpdate((data) => {
      bodiesRef.current = data
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [viewMode])

  return (
    <canvas
      ref={canvasRef}
      className="transparent ignore-mouse"
      style={{ display: 'block' }}
    />
  )
}

export default EffectCanvas