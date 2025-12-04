import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // --- Physics & Window ---
  onPhysicsUpdate: (callback) => ipcRenderer.on('physics-update', (event, data) => callback(data)),
  onLuckyHit: (callback) => ipcRenderer.on('lucky-hit', (event, data) => callback(data)),
  
  spawnComment: (text, color) => ipcRenderer.send('spawn-comment', { text, color }),
  setGravity: (x, y) => ipcRenderer.send('set-gravity', { x, y }),
  clearWorld: () => ipcRenderer.send('clear-world'),
  
  // Window Control
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('toggle-click-through', ignore),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height }),
  
  // Keybinds
  getKeybinds: () => ipcRenderer.invoke('get-keybinds'),
  setKeybind: (action, shortcut) => ipcRenderer.invoke('set-keybind', { action, shortcut }),

  // Scene
  changeScene: (sceneName) => ipcRenderer.send('change-scene', sceneName),
  onSceneChange: (callback) => ipcRenderer.on('change-scene', (event, sceneName) => callback(sceneName)),

  // OBS
  updateStatus: (status) => ipcRenderer.send('update-status', status),
  onStatusUpdate: (callback) => ipcRenderer.on('update-status', (event, data) => callback(data)),
  getObsConfig: () => ipcRenderer.invoke('get-obs-config'),
  setObsConfig: (config) => ipcRenderer.invoke('set-obs-config', config),
  getObsStatus: () => ipcRenderer.invoke('get-obs-status'),
  onMicVolumeUpdate: (callback) => ipcRenderer.on('mic-volume', (event, volume) => callback(volume)),

  // YouTube
  getYoutubeConfig: () => ipcRenderer.invoke('get-youtube-config'),
  setYoutubeConfig: (config) => ipcRenderer.invoke('set-youtube-config', config),
  connectYouTube: (channelId) => ipcRenderer.invoke('connect-youtube', channelId),
  disconnectYouTube: () => ipcRenderer.invoke('disconnect-youtube'),
  getYoutubeStatus: () => ipcRenderer.invoke('get-youtube-status'),
  onYoutubeStatusUpdate: (callback) => ipcRenderer.on('update-youtube-status', (event, data) => callback(data)),

  // Info Panel
  getInfoConfig: () => ipcRenderer.invoke('get-info-config'),
  setInfoConfig: (config) => ipcRenderer.invoke('set-info-config', config),
  onInfoConfigUpdate: (callback) => ipcRenderer.on('update-info-config', (event, data) => callback(data)),
  
  // ★追加: Avatar
  getAvatarImage: () => ipcRenderer.invoke('get-avatar-image'),
  setAvatarImage: (dataUrl) => ipcRenderer.invoke('set-avatar-image', dataUrl),
  onAvatarImageUpdate: (callback) => ipcRenderer.on('update-avatar-image', (event, data) => callback(data)),

  // イベント汎用
  on: (channel, callback) => ipcRenderer.on(channel, (event, data) => callback(data)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
}

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