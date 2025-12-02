import OBSWebSocketLib from 'obs-websocket-js'

// ライブラリの読み込み互換性を確保
const OBSWebSocket = OBSWebSocketLib.default || OBSWebSocketLib
const obs = new OBSWebSocket()

let windowsRef = null
let currentConfig = null

// ★追加: 現在の状態を保持する変数
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
  
  try {
    try { await obs.disconnect() } catch (e) { /* ignore */ }

    console.log('🔄 Connecting to OBS...', config.url)
    await obs.connect(config.url, config.password)
    console.log('✅ Connected to OBS')

    // 接続成功を通知＆保存
    updateAndBroadcast({ obsConnected: true })

    await syncStatus()

    obs.removeAllListeners('StreamStateChanged')
    obs.removeAllListeners('InputMuteStateChanged')
    obs.removeAllListeners('ConnectionClosed')

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
    })

  } catch (error) {
    console.error('⚠️ Failed to connect to OBS:', error.message)
    updateAndBroadcast({ obsConnected: false })
  }
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
    // ignore
  }
}

// ★変更: 状態を更新して通知する共通関数
function updateAndBroadcast(newStatus) {
  // キャッシュを更新
  currentStatus = { ...currentStatus, ...newStatus }

  const { winStatus, winAdmin } = windowsRef || {}
  
  if (winStatus && !winStatus.isDestroyed()) {
    winStatus.webContents.send('update-status', newStatus)
  }
  if (winAdmin && !winAdmin.isDestroyed()) {
    winAdmin.webContents.send('update-status', newStatus)
  }
}

// ★追加: 現在の状態を返す関数（初期化用）
export function getObsStatus() {
  return currentStatus
}

// --- 操作用関数 ---

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