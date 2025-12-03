import OBSWebSocketLib from 'obs-websocket-js'

// ライブラリの読み込み互換性を確保
const OBSWebSocket = OBSWebSocketLib.default || OBSWebSocketLib
const obs = new OBSWebSocket()

let windowsRef = null
let currentConfig = null
let reconnectTimer = null // ★変更: IntervalではなくTimeoutで管理

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
    // リスナーを削除して誤発火を防ぐ
    obs.removeAllListeners('StreamStateChanged')
    obs.removeAllListeners('InputMuteStateChanged')
    obs.removeAllListeners('ConnectionClosed')

    // 意図的な切断
    try { await obs.disconnect() } catch (e) { /* ignore */ }

    console.log('🔄 Connecting to OBS...', config.url)
    await obs.connect(config.url, config.password)
    console.log('✅ Connected to OBS')

    // 接続成功通知
    updateAndBroadcast({ obsConnected: true })

    await syncStatus()

    // イベントリスナー登録
    obs.on('StreamStateChanged', (data) => {
      updateAndBroadcast({ isStreaming: data.outputActive })
    })

    obs.on('InputMuteStateChanged', (data) => {
      if (data.inputName === currentConfig.micName) {
        updateAndBroadcast({ micMuted: data.inputMuted })
      }
    })

    obs.on('ConnectionClosed', () => {
      console.log('❌ OBS Connection Closed')
      updateAndBroadcast({ isStreaming: false, obsConnected: false })
      scheduleReconnect()
    })

  } catch (error) {
    console.error('⚠️ Failed to connect to OBS:', error.message)
    updateAndBroadcast({ obsConnected: false })
    scheduleReconnect()
  }
}

// ★変更: シンプルな再接続スケジューラー
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
    // sync失敗しても接続自体は維持されているのでエラーにはしない
    console.warn('⚠️ OBS Status Sync failed (minor):', e.message)
  }
}

// ★重要修正: 常に接続状態(obsConnected)を含めて送信する
function updateAndBroadcast(newStatus) {
  // キャッシュを更新
  currentStatus = { ...currentStatus, ...newStatus }

  // 部分的な更新(micMuted等)であっても、接続状態が正しければ
  // AdminPanel側が復帰できるように、常に obsConnected を含める
  const payload = { 
    ...newStatus, 
    obsConnected: currentStatus.obsConnected 
  }

  const { winStatus, winAdmin } = windowsRef || {}
  
  if (winStatus && !winStatus.isDestroyed()) {
    winStatus.webContents.send('update-status', payload)
  }
  if (winAdmin && !winAdmin.isDestroyed()) {
    winAdmin.webContents.send('update-status', payload)
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