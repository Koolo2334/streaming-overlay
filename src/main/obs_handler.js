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
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  try {
    obs.removeAllListeners('StreamStateChanged')
    obs.removeAllListeners('InputMuteStateChanged')
    obs.removeAllListeners('ConnectionClosed')
    obs.removeAllListeners('InputVolumeMeters') // ★追加: 音量イベントのリスナー削除

    try { await obs.disconnect() } catch (e) { /* ignore */ }

    console.log('🔄 Connecting to OBS...', config.url)
    
    // ★修正: 音量メーターイベント(InputVolumeMeters)を受信するために eventSubscriptions を指定
    // Bitmask: General(1) | InputVolumeMeters(65536) = 65537
    // これを指定しないと、帯域節約のためOBS側から音量が送られてきません。
    await obs.connect(config.url, config.password, {
      eventSubscriptions: 65537 
    })
    
    console.log('✅ Connected to OBS')

    updateAndBroadcast({ obsConnected: true })
    await syncStatus()

    // --- イベントリスナー設定 ---

    obs.on('StreamStateChanged', (data) => {
      updateAndBroadcast({ isStreaming: data.outputActive, obsConnected: true })
    })

    obs.on('InputMuteStateChanged', (data) => {
      if (data.inputName === currentConfig.micName) {
        updateAndBroadcast({ micMuted: data.inputMuted, obsConnected: true })
      }
    })

    // ★追加: 音量イベントのハンドリング
    obs.on('InputVolumeMeters', (data) => {
      // 設定されたマイク名と一致する入力を探す
      const input = data.inputs.find(d => d.inputName === currentConfig.micName)
      if (input) {
        // inputLevelsMul は [ [LeftMul, LeftPeak, LeftHold], [Right...] ] のような配列
        // 基本的にチャンネル1の現在の振幅(0.0〜1.0)を使用
        // ※データ構造はOBSのバージョンによりますが、v5では inputLevelsMul[0][0] が一般的
        let volume = 0
        if (input.inputLevelsMul && input.inputLevelsMul.length > 0) {
           // チャンネルごとの最大値を取るなど調整可能。ここではチャンネル1の入力レベルを使用
           volume = input.inputLevelsMul[0][0] 
        }
        
        // レンダラーへ送信 (負荷軽減のため、本来はthrottleした方が良いが今回は直接送信)
        const { winOBS } = windowsRef || {}
        if (winOBS && !winOBS.isDestroyed()) {
          winOBS.webContents.send('mic-volume', volume)
        }
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

function updateAndBroadcast(newStatus) {
  currentStatus = { ...currentStatus, ...newStatus }
  const payload = { ...currentStatus, ...newStatus }

  const { winStatus, winAdmin, winOBS } = windowsRef || {}
  
  if (winStatus && !winStatus.isDestroyed()) {
    winStatus.webContents.send('update-status', payload)
  }
  if (winAdmin && !winAdmin.isDestroyed()) {
    winAdmin.webContents.send('update-status', payload)
  }
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