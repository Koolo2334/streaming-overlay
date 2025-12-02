import { LiveChat } from 'youtube-chat'
// physics.js からコメント生成関数をインポート
import { spawnPhysicsComment } from './physics'
import Store from 'electron-store' 
const store = new Store()

let liveChat = null
let windowsRef = null

// 現在の状態
let currentStatus = {
  youtubeConnected: false
}

export function initYouTube(windows) {
  windowsRef = windows
}

export async function connectYouTube(channelIdOrUrl) {
  // 既存の接続を切断
  if (liveChat) {
    liveChat.stop()
    liveChat = null
  }

  updateAndBroadcast({ youtubeConnected: false })

  try {
    console.log('Connecting to YouTube...', channelIdOrUrl)
    
    // チャンネルIDまたはURLからライブ配信を探して接続
    liveChat = new LiveChat({ channelId: channelIdOrUrl })
    
    // 接続開始
    await liveChat.start()

    if (!liveChat.liveId) {
      console.log('Live stream not found.')
      updateAndBroadcast({ youtubeConnected: false })
      return false
    }

    console.log(`Connected to Live Stream ID: ${liveChat.liveId}`)
    updateAndBroadcast({ youtubeConnected: true })

    // --- イベントリスナー ---
    
    // チャット受信
    liveChat.on('chat', (chatItem) => {
      const message = chatItem.message.map(part => part.text || '').join('')
      const color = `hsl(${Math.random() * 360}, 70%, 60%)`

      // ★追加: ストアから寿命設定を取得
      const lifeTime = store.get('commentLifeTime') || 15000

      // 1. 物理演算コメントとして降らせる (寿命付き)
      spawnPhysicsComment(message, color, lifeTime)

      // 2. コメントウィンドウに表示
      const { winComment } = windowsRef || {}
      if (winComment && !winComment.isDestroyed()) {
        winComment.webContents.send('new-comment', { text: message, color })
      }
    })

    liveChat.on('error', (err) => {
      console.error('YouTube Chat Error:', err)
      updateAndBroadcast({ youtubeConnected: false })
    })

    liveChat.on('end', (reason) => {
      console.log('YouTube Chat Ended:', reason)
      updateAndBroadcast({ youtubeConnected: false })
    })

    return true

  } catch (e) {
    console.error('Failed to connect to YouTube:', e)
    updateAndBroadcast({ youtubeConnected: false })
    return false
  }
}

export function disconnectYouTube() {
  if (liveChat) {
    liveChat.stop()
    liveChat = null
  }
  updateAndBroadcast({ youtubeConnected: false })
}

export function getYouTubeStatus() {
  return currentStatus
}

function updateAndBroadcast(newStatus) {
  currentStatus = { ...currentStatus, ...newStatus }
  const { winAdmin } = windowsRef || {}
  
  if (winAdmin && !winAdmin.isDestroyed()) {
    winAdmin.webContents.send('update-youtube-status', currentStatus)
  }
}