import { LiveChat } from 'youtube-chat'
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
      const message = chatItem.message.map(part => part.text || '').join('')
      let color = `hsl(${Math.random() * 360}, 70%, 60%)` 
      
      const authorName = chatItem.author.name
      const authorIcon = chatItem.author.thumbnail?.url || ''

      // --- ★メンバー判定ロジック (ここを修正) ---
      // 1. isChatSponsor (メンバー) フラグを直接チェック
      let isMember = Boolean(chatItem.author.isChatSponsor)

      // 2. フラグがない場合、バッジ情報から推測 (バックアップ)
      if (!isMember && Array.isArray(chatItem.author.badge)) {
        isMember = chatItem.author.badge.some(b => {
          const label = (b.label || '').toLowerCase()
          // "Member"や"メンバー"を含むかチェック
          return label.includes('member') || label.includes('メンバー')
        })
      }
      
      // デバッグログ
      if (isMember) {
        console.log(`[Member Detected] ${authorName}`)
      }

      const superchat = chatItem.superchat
      const supersticker = chatItem.supersticker

      if (superchat && superchat.color) {
        color = superchat.color
      }

      spawnPhysicsComment(message, color, authorName, authorIcon)

      const { winComment, winOBS, winLucky } = windowsRef || {}
      
      const commentData = { 
        text: message, 
        messageParts: chatItem.message, 
        color,
        authorName,
        authorIcon,
        isMember, // これがtrueになれば緑色になります
        superchat,
        supersticker
      }

      if (winComment && !winComment.isDestroyed()) {
        winComment.webContents.send('new-comment', commentData)
      }
      if (winOBS && !winOBS.isDestroyed()) {
        winOBS.webContents.send('new-comment', commentData)
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