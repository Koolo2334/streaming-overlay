import React, { useState } from 'react'

const AdminPanel = () => {
  // UIの状態管理
  const [gravity, setGravity] = useState({ x: 0, y: 1 }) // デフォルト重力 Y=1
  const [clickThrough, setClickThrough] = useState(true)

  // --- 操作ハンドラ ---

  // 1. テストコメントを降らせる
  const handleSpawnTest = () => {
    const testComments = ['草', 'www', 'ナイス！', '初見です', '888888']
    const text = testComments[Math.floor(Math.random() * testComments.length)]
    
    // ランダムな色を生成
    const color = `hsl(${Math.random() * 360}, 70%, 60%)`
    
    window.api.spawnComment(text, color)
  }

  // 2. 重力操作
  const handleGravityChange = (axis, value) => {
    const newVal = parseFloat(value)
    const newGravity = { ...gravity, [axis]: newVal }
    setGravity(newGravity)
    window.api.setGravity(newGravity.x, newGravity.y)
  }

  // 3. ワールドリセット（緊急停止）
  const handleClear = () => {
    window.api.clearWorld()
  }

  // 4. マウス操作透過の切り替え (自分用ウィンドウの操作用)
  // 注: これはAdminウィンドウ自体の操作ではなく、Userウィンドウの制御用として実装する場合
  // 今回は簡易的に「Adminパネル自体の透過」ではなく、IPC経由でUserウィンドウを制御するボタンとします
  const toggleUserOverlayInput = () => {
    // 実際の実装では、Mainプロセス経由でUserウィンドウのIgnoreMouseEventsを切り替える処理が必要
    // ここではプレースホルダーとしてログ出力のみ
    console.log('Toggle User Overlay Input (Not implemented in this demo)')
  }

  return (
    <div className="admin-container enable-mouse">
      <h2>Admin Control</h2>
      
      <div className="section">
        <h3>🧪 Debug / Test</h3>
        <button onClick={handleSpawnTest} className="btn primary">
          Spawn Random Comment
        </button>
        <button onClick={handleClear} className="btn danger">
          CLEAR WORLD (緊急停止)
        </button>
      </div>

      <div className="section">
        <h3>🌍 Physics (Gravity)</h3>
        <div className="control-group">
          <label>X: {gravity.x}</label>
          <input
            type="range"
            min="-2"
            max="2"
            step="0.1"
            value={gravity.x}
            onChange={(e) => handleGravityChange('x', e.target.value)}
          />
        </div>
        <div className="control-group">
          <label>Y: {gravity.y}</label>
          <input
            type="range"
            min="-2"
            max="2"
            step="0.1"
            value={gravity.y}
            onChange={(e) => handleGravityChange('y', e.target.value)}
          />
        </div>
        <button onClick={() => handleGravityChange('y', -1)} className="btn">
          Reverse Gravity (重力反転)
        </button>
        <button onClick={() => {
            handleGravityChange('x', 0)
            handleGravityChange('y', 1)
        }} className="btn">
          Reset Gravity
        </button>
      </div>

      <div className="status-bar">
        Status: 🟢 System Ready
      </div>
    </div>
  )
}

export default AdminPanel