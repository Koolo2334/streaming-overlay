import React, { useState, useEffect } from 'react'

const KeybindManager = () => {
  const [keybinds, setKeybinds] = useState({})
  const [editingKey, setEditingKey] = useState(null)

  useEffect(() => {
    // 起動時に現在の設定を取得
    window.api.getKeybinds().then(setKeybinds)
  }, [])

  const handleSetKey = (actionName) => {
    setEditingKey(actionName)
  }

  const handleKeyDown = (e, actionName) => {
    e.preventDefault()
    // 入力されたキーをElectronのショートカット形式に変換 (簡易版)
    let modifiers = []
    if (e.ctrlKey) modifiers.push('Ctrl') // MacならCmd
    if (e.shiftKey) modifiers.push('Shift')
    if (e.altKey) modifiers.push('Alt')
    
    let key = e.key.toUpperCase()
    if (key === 'CONTROL' || key === 'SHIFT' || key === 'ALT') return // 修飾キーのみは無視

    // Electron形式: CommandOrControl+Alt+K
    const shortcut = [...modifiers, key].join('+')
    
    // 保存
    window.api.setKeybind(actionName, shortcut).then((success) => {
      if (success) {
        setKeybinds({ ...keybinds, [actionName]: shortcut })
        setEditingKey(null)
      } else {
        alert('そのキーバインドは登録できませんでした（他と重複など）')
      }
    })
  }

  return (
    <div className="admin-container enable-mouse">
      <div className="drag-handle">
        <span>::: Keybind Manager</span>
      </div>
      <h2>Key Configuration</h2>
      
      <div className="section">
        <p style={{marginBottom: '10px', color: '#ccc'}}>
          クリックして新しいキーを入力してください。<br/>
          (例: Ctrl+Alt+K)
        </p>

        {Object.entries(keybinds).map(([action, shortcut]) => (
          <div key={action} style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '0.9rem', color: '#00d4ff', marginBottom: '5px' }}>
              {action}
            </div>
            <div 
              onClick={() => handleSetKey(action)}
              onKeyDown={(e) => editingKey === action && handleKeyDown(e, action)}
              tabIndex={0}
              style={{
                background: editingKey === action ? '#0056b3' : '#333',
                padding: '10px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: editingKey === action ? '2px solid #fff' : '1px solid #555',
                textAlign: 'center',
                fontWeight: 'bold'
              }}
            >
              {editingKey === action ? 'Press new keys...' : shortcut}
            </div>
          </div>
        ))}
      </div>
      
      <div className="tip">
        ※ 変更は即座に反映されます。
      </div>
    </div>
  )
}

export default KeybindManager