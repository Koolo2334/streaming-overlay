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

  resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height }),

  // マウス操作の透過/不透過を切り替える (ボタンの上に来た時など)
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('toggle-click-through', ignore),

  getKeybinds: () => ipcRenderer.invoke('get-keybinds'),
  setKeybind: (action, shortcut) => ipcRenderer.invoke('set-keybind', { action, shortcut }),

  getCommentLifeTime: () => ipcRenderer.invoke('get-comment-life-time'),
  setCommentLifeTime: (ms) => ipcRenderer.invoke('set-comment-life-time', ms),

  // YouTube API
  getYoutubeConfig: () => ipcRenderer.invoke('get-youtube-config'),
  setYoutubeConfig: (config) => ipcRenderer.invoke('set-youtube-config', config),
  
  connectYouTube: (channelId) => ipcRenderer.invoke('connect-youtube', channelId),
  disconnectYouTube: () => ipcRenderer.invoke('disconnect-youtube'),
  
  getYoutubeStatus: () => ipcRenderer.invoke('get-youtube-status'),
  onYoutubeStatusUpdate: (callback) => ipcRenderer.on('update-youtube-status', (event, data) => callback(data)),

  // OBSステータス
  updateStatus: (status) => ipcRenderer.send('update-status', status),
  onStatusUpdate: (callback) => ipcRenderer.on('update-status', (event, data) => callback(data)),

  // ★追加: OBS設定
  getObsConfig: () => ipcRenderer.invoke('get-obs-config'),
  setObsConfig: (config) => ipcRenderer.invoke('set-obs-config', config),
  getObsStatus: () => ipcRenderer.invoke('get-obs-status')
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