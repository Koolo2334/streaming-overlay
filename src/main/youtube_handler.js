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

// ★修正: 超強力版 URL変換関数
// 空白除去を行い、正規表現を使わずに確実に置換します
const safeUrl = (url) => {
  if (!url || typeof url !== 'string') return ''
  
  // 1. 前後の空白を削除 (これが見えない原因の可能性があります)
  const trimmed = url.trim()

  // 2. プロトコル相対URL (//) の処理
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }
  
  // 3. http:// の処理 (https:// に強制変換)
  if (trimmed.startsWith('http://')) {
    return `https://${trimmed.substring(7)}`
  }
  
  // それ以外 (https:// など)
  return trimmed
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
      // ★ここで強力版 safeUrl を適用
      const authorIcon = safeUrl(chatItem.author.thumbnail?.url)

      // --- メンバー判定ロジック (成功しているので維持) ---
      let isMember = Boolean(chatItem.author.isChatSponsor)

      if (!isMember && chatItem.author.badge) {
        const badges = [].concat(chatItem.author.badge)
        isMember = badges.some(b => {
          if (!b || !b.label) return false
          const label = b.label.toLowerCase()
          if (label.includes('member') || label.includes('メンバー')) return true
          const isMod = label.includes('moderator') || label.includes('モデレーター')
          const isVerified = label.includes('verified') || label.includes('確認済み') || label.includes('authenticated')
          const isOwner = label.includes('owner') || label.includes('オーナー')
          return !isMod && !isVerified && !isOwner
        })
      }
      
      // ログ確認用
      console.log(`[Message] ${authorName} (Member: ${isMember})`)
      // ここで Safe: https://... になっているか確認できます
      console.log(`[Icon URL] Original: ${chatItem.author.thumbnail?.url} -> Safe: ${authorIcon}`)

      const superchat = chatItem.superchat
      const supersticker = chatItem.supersticker

      if (superchat && superchat.color) {
        color = superchat.color
      }

      spawnPhysicsComment(message, color, authorName, authorIcon)

      const { winComment, winOBS } = windowsRef || {}
      
      // バッジURLも変換
      const rawBadges = chatItem.author.badge ? [].concat(chatItem.author.badge) : []
      const authorBadges = rawBadges.map(b => ({
        ...b,
        url: safeUrl(b.url)
      }))

      // ステッカーURLも変換
      if (supersticker && supersticker.sticker) {
        supersticker.sticker.url = safeUrl(supersticker.sticker.url)
      }

      const commentData = { 
        text: message, 
        messageParts: chatItem.message, 
        color,
        authorName,
        authorIcon,
        authorBadges,
        isMember, 
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