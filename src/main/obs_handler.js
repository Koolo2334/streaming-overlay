import OBSWebSocketLib from 'obs-websocket-js'

// ライブラリの読み込み互換性を確保
const OBSWebSocket = OBSWebSocketLib.default || OBSWebSocketLib
const obs = new OBSWebSocket()

let windowsRef = null
let currentConfig = null
let reconnectTimer = null

// 現在の状態を保持する変数
let currentStatus = {
  obsConnected: false,
  isStreaming: false,
  micMuted: false
}

export async function initOBS(windows, config) {
  windowsRef = windows
  if (config) {
    await reconnectOBS(config)
  }
}

export async function reconnectOBS(config) {
  currentConfig = config
  
  // 再接続タイマーがあればキャンセル
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  try {
    // ★重要: リスナーを全削除して、イベントの重複発火を防ぐ
    obs.removeAllListeners('StreamStateChanged')
    obs.removeAllListeners('InputMuteStateChanged')
    obs.removeAllListeners('ConnectionClosed')

    // 意図的な切断（エラーは無視）
    try { await obs.disconnect() } catch (e) { /* ignore */ }

    console.log('🔄 Connecting to OBS...', config.url)
    await obs.connect(config.url, config.password)
    console.log('✅ Connected to OBS')

    // 接続成功通知
    updateAndBroadcast({ obsConnected: true })

    await syncStatus()

    // --- イベントリスナー設定 ---

    obs.on('StreamStateChanged', (data) => {
      // ストリーム状態が変わった = 接続は生きているので obsConnected: true も送る
      updateAndBroadcast({ isStreaming: data.outputActive, obsConnected: true })
    })

    obs.on('InputMuteStateChanged', (data) => {
      if (data.inputName === currentConfig.micName) {
        // ミュートが変わった = 接続は生きているので obsConnected: true も送る
        updateAndBroadcast({ micMuted: data.inputMuted, obsConnected: true })
      }
    })

    obs.on('ConnectionClosed', () => {
      console.log('❌ OBS Connection Closed')
      updateAndBroadcast({ isStreaming: false, obsConnected: false })
      // 切断されたら自動再接続をスケジュール
      scheduleReconnect()
    })

  } catch (error) {
    console.error('⚠️ Failed to connect to OBS:', error.message)
    updateAndBroadcast({ obsConnected: false })
    // 接続失敗時も再接続をスケジュール
    scheduleReconnect()
  }
}

// ★追加: 自動再接続スケジューラー
function scheduleReconnect() {
  if (reconnectTimer) return
  console.log('⏳ OBS Reconnect scheduled in 5s...')
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    console.log('🔄 Retrying OBS connection...')
    reconnectOBS(currentConfig)
  }, 5000)
}

async function syncStatus() {
  if (!currentConfig) return
  try {
    const [streamStatus, inputMute] = await Promise.all([
      obs.call('GetStreamStatus'),
      obs.call('GetInputMute', { inputName: currentConfig.micName })
    ])

    updateAndBroadcast({
      isStreaming: streamStatus.outputActive,
      micMuted: inputMute.inputMuted,
      obsConnected: true
    })
  } catch (e) {
    console.warn('⚠️ OBS Status Sync failed (minor):', e.message)
  }
}

// ★修正: 常に現在の obsConnected 状態を含めて送信する
function updateAndBroadcast(newStatus) {
  // 状態をマージ
  currentStatus = { ...currentStatus, ...newStatus }

  // AdminPanelが正しく状態を把握できるよう、常に obsConnected を含めたオブジェクトを作る
  // (newStatusに obsConnected が含まれていればそれが優先され、なければ currentStatus のものが使われる)
  const payload = { 
    ...currentStatus, // 全ての現在の状態を含める
    ...newStatus      // 新しい変更で上書き
  }

  const { winStatus, winAdmin, winOBS } = windowsRef || {}
  
  if (winStatus && !winStatus.isDestroyed()) {
    winStatus.webContents.send('update-status', payload)
  }
  if (winAdmin && !winAdmin.isDestroyed()) {
    winAdmin.webContents.send('update-status', payload)
  }
  // winOBSにも送っておく（念のため）
  if (winOBS && !winOBS.isDestroyed()) {
    winOBS.webContents.send('update-status', payload)
  }
}

export function getObsStatus() {
  return currentStatus
}

export async function toggleStream(enable) {
  try {
    if (enable) await obs.call('StartStream')
    else await obs.call('StopStream')
  } catch (e) { console.error(e) }
}

export async function toggleMute(mute) {
  if (!currentConfig) return
  try {
    await obs.call('SetInputMute', { inputName: currentConfig.micName, inputMuted: mute })
  } catch (e) { console.error(e) }
}