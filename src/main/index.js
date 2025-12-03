import { app, BrowserWindow, ipcMain, screen, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initPhysics, spawnPhysicsComment } from './physics'
import { initOBS, toggleStream, toggleMute, reconnectOBS, getObsStatus } from './obs_handler'
import { initYouTube, connectYouTube, disconnectYouTube, getYouTubeStatus } from './youtube_handler'
import Store from 'electron-store'

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('force-device-scale-factor', '1')
app.commandLine.appendSwitch('high-dpi-support', '1')

const store = new Store({
  defaults: {
    keybinds: {
      toggleAdminInput: 'CommandOrControl+Alt+A',
      toggleUserView: 'CommandOrControl+Alt+E',
      toggleKeybindWin: 'CommandOrControl+Shift+Alt+K',
      gatherWindows: 'CommandOrControl+Alt+G'
    },
    windowBounds: {},
    obsConfig: {
      url: 'ws://127.0.0.1:4455',
      password: '',
      micName: 'マイク'
    },
    youtubeConfig: { channelId: '' }
  }
})

let winAdmin = null
let winUser = null
let winOBS = null
let winKeybind = null
let winComment = null
let winStatus = null
let winLucky = null // ★追加
let isAdminInteractive = false

function createWindows() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.bounds

  setupIpcHandlers()

  const commonConfig = {
    icon,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    autoHideMenuBar: true,
    skipTaskbar: true, 
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  }

  // Helper
  const getBounds = (name, defaultBounds) => store.get(`windowBounds.${name}`, defaultBounds)
  const saveBounds = (name, win) => {
    if (win && !win.isDestroyed()) store.set(`windowBounds.${name}`, win.getBounds())
  }

  // --- 1. Admin ---
  const adminBounds = getBounds('admin', { x: 50, y: 50, width: 400, height: 600 })
  winAdmin = new BrowserWindow({ ...commonConfig, ...adminBounds, alwaysOnTop: true, resizable: true })
  winAdmin.on('resized', () => saveBounds('admin', winAdmin))
  winAdmin.on('moved', () => saveBounds('admin', winAdmin))
  winAdmin.on('close', () => saveBounds('admin', winAdmin))
  winAdmin.setIgnoreMouseEvents(true, { forward: false })
  winAdmin.on('ready-to-show', () => {
    winAdmin.show()
    winAdmin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    winAdmin.setAlwaysOnTop(true, 'screen-saver')
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) winAdmin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html#/admin`)
  else winAdmin.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'admin' })

  // --- 2. User ---
  winUser = new BrowserWindow({ ...commonConfig, width, height, x: 0, y: 0, alwaysOnTop: true })
  winUser.setIgnoreMouseEvents(true, { forward: true })
  winUser.on('ready-to-show', () => winUser.showInactive())
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) winUser.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html#/user`)
  else winUser.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'user' })

  // --- 3. OBS ---
  winOBS = new BrowserWindow({ ...commonConfig, width: 1920, height: 1080, useContentSize: true, x: 0, y: 0, resizable: true, alwaysOnTop: false, focusable: false })
  winOBS.on('ready-to-show', () => {
    winOBS.showInactive()
    winOBS.setContentSize(1920, 1080)
    winOBS.setMinimumSize(1920, 1080)
    winOBS.setMaximumSize(1920, 1080)
    winOBS.minimize()
    winOBS.restore()
    winOBS.blur() 
    winOBS.setAlwaysOnTop(false)
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) winOBS.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html#/obs`)
  else winOBS.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'obs' })

  // --- 4. Keybind ---
  winKeybind = new BrowserWindow({ ...commonConfig, width: 500, height: 400, x: 200, y: 200, alwaysOnTop: true })
  winKeybind.setIgnoreMouseEvents(false)
  winKeybind.on('ready-to-show', () => winKeybind.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }))
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) winKeybind.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html#/keybind`)
  else winKeybind.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'keybind' })
  winKeybind.hide()

  // --- 5. Comment ---
  const commentBounds = getBounds('comment', { x: 100, y: 800, width: 300, height: 400 })
  winComment = new BrowserWindow({ ...commonConfig, ...commentBounds, alwaysOnTop: true, resizable: true })
  winComment.on('resized', () => saveBounds('comment', winComment))
  winComment.on('moved', () => saveBounds('comment', winComment))
  winComment.on('close', () => saveBounds('comment', winComment))
  winComment.setIgnoreMouseEvents(true, { forward: false })
  winComment.on('ready-to-show', () => {
    winComment.show()
    winComment.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    winComment.setAlwaysOnTop(true, 'normal')
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) winComment.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html#/comment`)
  else winComment.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'comment' })

  // --- 6. Status ---
  const statusBounds = getBounds('status', { x: width - 300, y: 100, width: 200, height: 100 })
  winStatus = new BrowserWindow({ ...commonConfig, ...statusBounds, alwaysOnTop: true, resizable: true })
  winStatus.on('resized', () => saveBounds('status', winStatus))
  winStatus.on('moved', () => saveBounds('status', winStatus))
  winStatus.on('close', () => saveBounds('status', winStatus))
  winStatus.setIgnoreMouseEvents(true, { forward: false })
  winStatus.on('ready-to-show', () => {
    winStatus.show()
    winStatus.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    winStatus.setAlwaysOnTop(true, 'normal')
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) winStatus.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html#/status`)
  else winStatus.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'status' })

  // --- 7. Lucky Log (New!) ---
  const luckyBounds = getBounds('lucky', { x: 100, y: 100, width: 300, height: 200 })
  winLucky = new BrowserWindow({ ...commonConfig, ...luckyBounds, alwaysOnTop: true, resizable: true })
  winLucky.on('resized', () => saveBounds('lucky', winLucky))
  winLucky.on('moved', () => saveBounds('lucky', winLucky))
  winLucky.on('close', () => saveBounds('lucky', winLucky))
  winLucky.setIgnoreMouseEvents(true, { forward: false })
  winLucky.on('ready-to-show', () => {
    winLucky.show()
    winLucky.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    winLucky.setAlwaysOnTop(true, 'normal')
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) winLucky.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html#/lucky`)
  else winLucky.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'lucky' })


  // --- Start ---
  // ★重要: initPhysics に winLucky を渡す
  initPhysics({ winAdmin, winUser, winOBS, winLucky })
  
  const obsConfig = store.get('obsConfig')
  initOBS({ winAdmin, winStatus }, obsConfig)

  // ★修正: winOBS を追加で渡す
  initYouTube({ winAdmin, winComment, winOBS })
  
  registerShortcuts()
}

function registerShortcuts() {
  globalShortcut.unregisterAll()
  const defaults = {
    toggleAdminInput: 'CommandOrControl+Alt+A',
    toggleUserView: 'CommandOrControl+Alt+E',
    toggleKeybindWin: 'CommandOrControl+Shift+Alt+K',
    gatherWindows: 'CommandOrControl+Alt+G'
  }
  const stored = store.get('keybinds') || {}
  const keybinds = { ...defaults, ...stored }

  if (keybinds.toggleAdminInput) {
    globalShortcut.register(keybinds.toggleAdminInput, () => {
      isAdminInteractive = !isAdminInteractive
      // ★追加: winLucky も操作対象に
      const targetWindows = [winAdmin, winComment, winStatus, winLucky]
      targetWindows.forEach(win => {
        if (win && !win.isDestroyed()) {
          if (isAdminInteractive) win.setIgnoreMouseEvents(false)
          else { win.setIgnoreMouseEvents(true, { forward: false }); win.blur() }
          win.webContents.send('admin-mode-changed', isAdminInteractive)
        }
      })
      if (isAdminInteractive && winAdmin) winAdmin.focus()
    })
  }

  if (keybinds.toggleUserView) {
    globalShortcut.register(keybinds.toggleUserView, () => {
      if (winUser) {
        if (winUser.isVisible()) winUser.hide()
        else winUser.showInactive()
      }
    })
  }

  if (keybinds.toggleKeybindWin) {
    globalShortcut.register(keybinds.toggleKeybindWin, () => {
      if (!winKeybind) return
      if (winKeybind.isVisible()) { winKeybind.hide() } else { winKeybind.show(); winKeybind.focus() }
    })
  }

  if (keybinds.gatherWindows) {
    globalShortcut.register(keybinds.gatherWindows, () => {
      if (!isAdminInteractive) return
      const { x, y } = screen.getCursorScreenPoint()
      // ★追加: winLucky
      const targets = [
        { win: winAdmin, width: 400, height: 600 },
        { win: winComment, width: 300, height: 400 },
        { win: winStatus, width: 200, height: 100 },
        { win: winKeybind, width: 500, height: 400 },
        { win: winLucky, width: 300, height: 200 }
      ]
      targets.forEach(({ win, width, height }) => {
        if (win && !win.isDestroyed() && win.isVisible()) {
          win.setBounds({ x: Math.round(x - width / 2), y: Math.round(y - height / 2), width, height })
          win.moveTop()
        }
      })
    })
  }
}

function setupIpcHandlers() {
  // ... (ここは既存のままでOK) ...
  ipcMain.removeHandler('get-keybinds')
  ipcMain.handle('get-keybinds', () => store.get('keybinds'))
  ipcMain.removeHandler('set-keybind')
  ipcMain.handle('set-keybind', (event, { action, shortcut }) => {
    try {
      const current = store.get('keybinds')
      store.set('keybinds', { ...current, [action]: shortcut })
      registerShortcuts()
      return true
    } catch (e) { console.error(e); return false }
  })
  ipcMain.removeHandler('get-obs-config')
  ipcMain.handle('get-obs-config', () => store.get('obsConfig'))
  ipcMain.removeHandler('set-obs-config')
  ipcMain.handle('set-obs-config', async (event, config) => {
    try {
      store.set('obsConfig', config)
      await reconnectOBS(config)
      return true
    } catch (e) { console.error(e); return false }
  })
  ipcMain.removeHandler('get-obs-status')
  ipcMain.handle('get-obs-status', () => getObsStatus())
  ipcMain.removeHandler('get-youtube-config')
  ipcMain.handle('get-youtube-config', () => store.get('youtubeConfig'))
  ipcMain.removeHandler('set-youtube-config')
  ipcMain.handle('set-youtube-config', (event, config) => {
    try {
      store.set('youtubeConfig', config)
      return true
    } catch (e) { return false }
  })
  ipcMain.removeHandler('connect-youtube')
  ipcMain.handle('connect-youtube', async (event, channelId) => {
    return await connectYouTube(channelId)
  })
  ipcMain.removeHandler('disconnect-youtube')
  ipcMain.handle('disconnect-youtube', () => {
    disconnectYouTube()
    return true
  })
  ipcMain.removeHandler('get-youtube-status')
  ipcMain.handle('get-youtube-status', () => getYouTubeStatus())
  ipcMain.removeHandler('get-comment-life-time')
  ipcMain.handle('get-comment-life-time', () => store.get('commentLifeTime'))
  ipcMain.removeHandler('set-comment-life-time')
  ipcMain.handle('set-comment-life-time', (event, ms) => {
    store.set('commentLifeTime', ms)
    return true
  })

  ipcMain.removeAllListeners('spawn-comment')
  ipcMain.on('spawn-comment', (event, { text, color }) => {
    if (winComment && !winComment.isDestroyed()) {
      winComment.webContents.send('new-comment', { text, color })
    }
    spawnPhysicsComment(text, color)
  })

  ipcMain.removeAllListeners('resize-window')
  ipcMain.on('resize-window', (event, { width, height }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      const [currentW, currentH] = win.getContentSize()
      if (currentW !== width || currentH !== height) {
        win.setContentSize(Math.ceil(width), Math.ceil(height))
      }
    }
  })

  ipcMain.removeAllListeners('toggle-click-through')
  ipcMain.on('toggle-click-through', (event, ignore) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.setIgnoreMouseEvents(ignore, { forward: true })
  })

  ipcMain.removeAllListeners('update-status')
  ipcMain.on('update-status', async (event, status) => {
    if (status.isStreaming !== undefined) await toggleStream(status.isStreaming)
    if (status.micMuted !== undefined) await toggleMute(status.micMuted)
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  createWindows()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindows()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})