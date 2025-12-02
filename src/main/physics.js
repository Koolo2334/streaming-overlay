import { ipcMain } from 'electron'
import Matter from 'matter-js'

const VIRTUAL_WIDTH = 1920
const VIRTUAL_HEIGHT = 1080

let engine
let intervalId

export function initPhysics(windows) {
  engine = Matter.Engine.create()
  const world = engine.world

  const wallOptions = { isStatic: true, render: { visible: false } }
  const ground = Matter.Bodies.rectangle(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT + 50, VIRTUAL_WIDTH, 100, wallOptions)
  const leftWall = Matter.Bodies.rectangle(-50, VIRTUAL_HEIGHT / 2, 100, VIRTUAL_HEIGHT, wallOptions)
  const rightWall = Matter.Bodies.rectangle(VIRTUAL_WIDTH + 50, VIRTUAL_HEIGHT / 2, 100, VIRTUAL_HEIGHT, wallOptions)

  Matter.World.add(world, [ground, leftWall, rightWall])

  const fps = 60
  intervalId = setInterval(() => {
    Matter.Engine.update(engine, 1000 / fps)
    
    // ★追加: 寿命チェック
    removeOldBodies()
    
    broadcastPositions(windows)
  }, 1000 / fps)

  setupIpcListeners()

  console.log('Physics Engine Started')
}

// ★追加: 寿命が切れたボディを削除する関数
function removeOldBodies() {
  const bodies = Matter.Composite.allBodies(engine.world)
  const now = Date.now()

  const bodiesToRemove = bodies.filter(body => {
    // 静的オブジェクト（壁や床）は削除しない
    if (body.isStatic) return false
    
    // 寿命設定があり、かつ生成から時間が経過していたら削除対象
    if (body.lifeTime && body.createdAt) {
      return (now - body.createdAt) > body.lifeTime
    }
    return false
  })

  if (bodiesToRemove.length > 0) {
    Matter.World.remove(engine.world, bodiesToRemove)
  }
}

function broadcastPositions(windows) {
  const { winUser, winOBS } = windows
  const bodies = Matter.Composite.allBodies(engine.world)

  const syncData = bodies.map((body) => ({
    id: body.id,
    x: body.position.x,
    y: body.position.y,
    angle: body.angle,
    label: body.label,
    width: body.width,
    height: body.height,
    color: body.color,
    text: body.text
  }))

  if (winUser && !winUser.isDestroyed()) {
    winUser.webContents.send('physics-update', syncData)
  }
  if (winOBS && !winOBS.isDestroyed()) {
    winOBS.webContents.send('physics-update', syncData)
  }
}

// ★変更: 引数に lifeTime を追加
export function spawnPhysicsComment(text, color, lifeTime = 15000) {
  if (!engine) return

  // --- 幅の計算ロジック修正 ---
  // 文字コードを見て幅を積算する
  let textWidth = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    // 256以上の文字コード（日本語など）は全角扱い、それ以外は半角扱い
    // ※フォントサイズ24px想定で、少し余裕を持たせた数値にする
    if (code > 255) {
      textWidth += 26 // 全角文字の幅
    } else {
      textWidth += 16 // 半角文字の幅
    }
  }
  
  const width = textWidth + 60 // パディング(余白)も少し広げる (+40 -> +60)
  const height = 60
  
  // 出現位置をランダムに（画面幅に収まるように調整）
  const x = Math.random() * (VIRTUAL_WIDTH - width - 100) + (width / 2) + 50
  const y = -100

  const body = Matter.Bodies.rectangle(x, y, width, height, {
    restitution: 0.8,
    friction: 0.005,
    label: 'comment',
    // カスタムプロパティ
    width: width,
    height: height,
    color: color || '#FFFFFF',
    text: text,
    createdAt: Date.now(),
    lifeTime: lifeTime
  })
  
  // Matter.jsのBodyオブジェクトに直接生やす
  body.width = width
  body.height = height
  body.color = color || '#FFFFFF'
  body.text = text
  body.createdAt = Date.now()
  body.lifeTime = lifeTime

  Matter.World.add(engine.world, body)
}

function setupIpcListeners() {
  // IPC経由の場合も、メインプロセス側で寿命設定を渡すため、ここはシンプルな呼び出しのままでOK
  // (index.js側で引数を制御します)
  ipcMain.on('set-gravity', (event, { x, y }) => {
    if (engine) {
      engine.world.gravity.x = x
      engine.world.gravity.y = y
    }
  })
  
  ipcMain.on('clear-world', () => {
    if (engine) {
      const bodies = Matter.Composite.allBodies(engine.world)
      const nonStaticBodies = bodies.filter(b => !b.isStatic)
      Matter.Composite.remove(engine.world, nonStaticBodies)
    }
  })
}