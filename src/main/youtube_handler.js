import { LiveChat } from 'youtube-chat'
// 物理演算の関数をインポート
import { spawnPhysicsComment } from './physics'

let liveChat = null
let windowsRef = null

let currentStatus = {
  youtubeConnected: false
}

export function initYouTube(windows) {
  windowsRef = windows
}

export async function connectYouTube(channelIdOrUrl) {
  if (liveChat) {
    liveChat.stop()
    liveChat = null
  }

  updateAndBroadcast({ youtubeConnected: false })

  try {
    console.log('Connecting to YouTube...', channelIdOrUrl)
    liveChat = new LiveChat({ channelId: channelIdOrUrl })
    await liveChat.start()

    if (!liveChat.liveId) {
      console.log('Live stream not found.')
      updateAndBroadcast({ youtubeConnected: false })
      return false
    }

    console.log(`Connected to Live Stream ID: ${liveChat.liveId}`)
    updateAndBroadcast({ youtubeConnected: true })

    liveChat.on('chat', (chatItem) => {
      // 物理演算用には、これまで通りテキスト化して渡す（絵文字は :smile: などの文字になる）
      const messageText = chatItem.message.map(part => part.text || '').join('')
      const color = `hsl(${Math.random() * 360}, 70%, 60%)`

      spawnPhysicsComment(messageText, color)

      // コメントウィンドウ用には、詳細データを含めて送る
      const { winComment } = windowsRef || {}
      if (winComment && !winComment.isDestroyed()) {
        winComment.webContents.send('new-comment', { 
          text: messageText, 
          messageParts: chatItem.message, // ★追加: 絵文字情報を含む配列
          color 
        })
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