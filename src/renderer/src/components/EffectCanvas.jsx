import React, { useEffect, useRef } from 'react'
import { transformToUserView, transformToOBSView } from '../constants'

const EffectCanvas = ({ viewMode }) => {
  const canvasRef = useRef(null)
  // 最新の物理データを保持するRef（再レンダリングを防ぐためStateではなくRefを使用）
  const bodiesRef = useRef([])

  useEffect(() => {
    // 1. Canvasの初期設定
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // ウィンドウサイズに合わせてCanvasサイズを追従させる
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)
    handleResize() // 初回実行

    // 2. 描画ループ (Animation Loop)
    let animationFrameId
    const render = () => {
      // 画面をクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 保持している物理データを描画
      bodiesRef.current.forEach(body => {
        let drawX, drawY, drawScale

        // ★ 視点による座標変換の切り替え ★
        if (viewMode === 'user') {
          // 4Kモニター用に、ゲーム部分だけを切り抜いて拡大
          const t = transformToUserView(body.x, body.y)
          drawX = t.x
          drawY = t.y
          drawScale = t.scale
        } else {
          // OBS用に、仮想ワールド(1920x1080)をそのまま表示
          const t = transformToOBSView(body.x, body.y)
          drawX = t.x
          drawY = t.y
          drawScale = t.scale
        }

        // --- 描画処理 (Canvas API) ---
        ctx.save()
        
        // 1. 位置と回転を適用
        ctx.translate(drawX, drawY)
        ctx.rotate(body.angle)
        
        // 2. 矩形を描画（中心基準）
        // body.width は物理演算上のサイズなので、表示倍率(scale)を掛ける
        const w = body.width * drawScale
        const h = body.height * drawScale
        
        // 色設定（デフォルトは白、文字は黒）
        ctx.fillStyle = body.color || '#FFFFFF'
        
        // 影をつける（視認性向上）
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = 10 * drawScale

        // 四角形描画
        ctx.fillRect(-w / 2, -h / 2, w, h)

        // 3. テキスト描画 (ラベルがあれば)
        if (body.text) {
          ctx.fillStyle = '#000000'
          ctx.font = `bold ${24 * drawScale}px "Segoe UI", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.shadowBlur = 0 // 文字には影なし
          ctx.fillText(body.text, 0, 0)
        }

        ctx.restore()
      })

      animationFrameId = requestAnimationFrame(render)
    }
    
    // ループ開始
    render()

    // 3. IPC通信のリスナー設定
    // メインプロセスから物理データが届いたら、Refを更新するだけ
    const removeListener = window.api.onPhysicsUpdate((data) => {
      bodiesRef.current = data
    })

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      // リスナー解除は preload 側でラップしていない場合は removeAllListeners 等で対応
      // 今回は簡易的に実装
    }
  }, [viewMode])

  // マウスイベントの透過設定（Canvas自体は常に透過、ボタン等は別途配置）
  return (
    <canvas
      ref={canvasRef}
      className="transparent ignore-mouse"
      style={{ display: 'block' }}
    />
  )
}

export default EffectCanvas