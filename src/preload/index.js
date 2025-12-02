import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// React側で window.api としてアクセスできる関数を定義
const api = {
  // --- 受信系 (Server -> Client) ---
  
  // 物理演算の更新データを受け取る
  onPhysicsUpdate: (callback) => ipcRenderer.on('physics-update', (event, data) => callback(data)),
  
  // その他のイベント（デバッグ用など）
  on: (channel, callback) => ipcRenderer.on(channel, (event, data) => callback(data)),
  
  // リスナー解除（メモリリーク防止）
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // --- 送信系 (Client -> Server) ---

  // コメント生成リクエスト
  spawnComment: (text, color) => ipcRenderer.send('spawn-comment', { text, color }),

  // 重力操作（管理者用）
  setGravity: (x, y) => ipcRenderer.send('set-gravity', { x, y }),
  
  // ワールドリセット
  clearWorld: () => ipcRenderer.send('clear-world'),

  // --- ウィンドウ操作系 ---

  // マウス操作の透過/不透過を切り替える (ボタンの上に来た時など)
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('toggle-click-through', ignore)
}

// メインワールド（React）に公開
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}