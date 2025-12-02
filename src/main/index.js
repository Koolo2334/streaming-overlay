import { app, shell, BrowserWindow, ipcMain, screen, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initPhysics } from './physics'

// ウィンドウ参照を保持
let winAdmin = null
let winUser = null
let winOBS = null

function createWindows() {
  // モニター情報の取得（あなたの4Kモニターを取得）
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.bounds // ここで 3840, 2160 が取得されます

  // 共通のウィンドウ設定
  const commonConfig = {
    icon,
    show: false, // 準備ができたら表示
    frame: false, // 枠なし
    transparent: true, // 透明
    hasShadow: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true // セキュリティのためTrue推奨だが、今回は簡略化のためPreload経由
    }
  }

  // --- 1. Admin Window (管理者用: 4K画面の左上などに配置) ---
  winAdmin = new BrowserWindow({
    ...commonConfig,
    width: 400,
    height: 600,
    x: 50,
    y: 50,
    alwaysOnTop: true // 最前面
  })
  // Adminは通常のマウス操作を受け付ける
  winAdmin.on('ready-to-show', () => winAdmin.show())
  
  // ルーティング: AdminPanelを表示
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    winAdmin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html#/admin`)
  } else {
    winAdmin.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'admin' })
  }
  // Adminをさらに強力な最前面（スクリーンセーバー級）にする
  winAdmin.setAlwaysOnTop(true, 'screen-saver')


  // --- 2. User Window (自分用: 4K全画面) ---
  winUser = new BrowserWindow({
    ...commonConfig,
    width: width,   // 3840
    height: height, // 2160
    x: 0,
    y: 0,
    alwaysOnTop: true,
    skipTaskbar: true // タスクバーに出さない
  })
  
  // マウス操作を透過（ゲームに渡す）
  winUser.setIgnoreMouseEvents(true, { forward: true })
  
  winUser.on('ready-to-show', () => winUser.showInactive()) // アクティブにしない

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    winUser.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html#/user`)
  } else {
    winUser.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'user' })
  }


  // --- 3. OBS Window (配信用: 1920x1080 固定) ---
  winOBS = new BrowserWindow({
    ...commonConfig,
    width: 1920,
    height: 1080,
    x: 0,
    y: 0,
    resizable: false, // サイズ固定
    alwaysOnTop: false, // 最背面（ゲームの下に隠す）
    skipTaskbar: true
  })

  // OBS用はロード完了後に「表示するが、最小化して隠す」等のトリックが必要
  // ここでは「表示して最背面に送る」処理を行う
  winOBS.on('ready-to-show', () => {
    winOBS.showInactive()
    winOBS.minimize()
    winOBS.restore()
    winOBS.blur() // フォーカスを外す
    winOBS.setAlwaysOnTop(false)
  })
  
  // ルーティング: OBS用画面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    winOBS.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html#/obs`)
  } else {
    winOBS.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'obs' })
  }

  // --- 物理エンジンの起動 ---
  // 作成したウィンドウを渡して、座標同期を開始
  initPhysics({ winAdmin, winUser, winOBS })
}

// アプリのライフサイクル設定
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  createWindows()

  // ショートカット: Ctrl+Alt+E で自分用エフェクトの表示/非表示トグル（集中モード）
  globalShortcut.register('CommandOrControl+Alt+E', () => {
    if (winUser) {
      if (winUser.isVisible()) winUser.hide()
      else winUser.showInactive()
    }
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindows()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC: ウィンドウ操作系
ipcMain.on('toggle-click-through', (event, ignore) => {
  // 特定のボタンの上に来た時だけマウス操作を有効化するための処理
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.setIgnoreMouseEvents(ignore, { forward: true })
})