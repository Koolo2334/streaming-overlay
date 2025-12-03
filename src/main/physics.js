import { ipcMain } from 'electron'
import Matter from 'matter-js'

const VIRTUAL_WIDTH = 1920
const VIRTUAL_HEIGHT = 1080

// レイアウト定数 (constants.js と合わせる)
const LAYOUT = {
  gameX: 30,
  gameY: 30,
  gameW: 1440,
  gameH: 846,
  gap: 30
}

// 情報ウィンドウのエリア定義
const INFO_AREA = {
  x: LAYOUT.gameX,
  y: LAYOUT.gameY + LAYOUT.gameH + LAYOUT.gap,
  w: LAYOUT.gameW,
  h: VIRTUAL_HEIGHT - (LAYOUT.gameY + LAYOUT.gameH + LAYOUT.gap) - 30
}

let engine
let intervalId
let windowsRef = null
let isPhysicsActive = true

// シーン変更時に呼び出す関数
export function updatePhysicsState(sceneName) {
  isPhysicsActive = (sceneName === 'main')
  // ここでのデータ送信は broadcastPositions に任せるため削除
}

export function initPhysics(windows) {
  windowsRef = windows
  engine = Matter.Engine.create()
  const world = engine.world

  const wallOptions = { isStatic: true, render: { visible: false } }
  
  const leftWall = Matter.Bodies.rectangle(INFO_AREA.x - 20, VIRTUAL_HEIGHT / 2, 40, VIRTUAL_HEIGHT * 2, wallOptions)
  const rightWall = Matter.Bodies.rectangle(INFO_AREA.x + INFO_AREA.w + 20, VIRTUAL_HEIGHT / 2, 40, VIRTUAL_HEIGHT * 2, wallOptions)

  Matter.World.add(world, [leftWall, rightWall])

  setupPinballGimmicks(world)

  Matter.Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs
    pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair
      const sensor = bodyA.label === 'lucky-sensor' ? bodyA : bodyB.label === 'lucky-sensor' ? bodyB : null
      const comment = bodyA.label === 'comment' ? bodyA : bodyB.label === 'comment' ? bodyB : null

      if (sensor && comment) {
        // 当たりデータを送信
        const hitData = { 
          text: comment.text, 
          color: comment.color,
          authorName: comment.authorName,
          authorIcon: comment.authorIcon,
          messageParts: comment.messageParts,
          isMember: comment.isMember,
          authorBadges: comment.authorBadges
        }

        if (windows.winOBS && !windows.winOBS.isDestroyed()) {
          windows.winOBS.webContents.send('lucky-hit', hitData)
        }
        if (windows.winLucky && !windows.winLucky.isDestroyed()) {
          windows.winLucky.webContents.send('lucky-hit', hitData)
        }
      }
    })
  })

  const fps = 60
  intervalId = setInterval(() => {
    // ★修正: ループ停止条件を削除し、常に演算を行う
    Matter.Engine.update(engine, 1000 / fps)
    removeOutOfBoundsBodies()
    broadcastPositions(windows)
  }, 1000 / fps)

  setupIpcListeners()
  console.log('Physics Engine Started')
}

function setupPinballGimmicks(world) {
  const obstacles = []
  
  const pegRadius = 5
  const pegOptions = { isStatic: true, label: 'peg', restitution: 1.4 }
  
  const startX = INFO_AREA.x + 60
  const endX = INFO_AREA.x + INFO_AREA.w - 40
  const spacing = 60 

  // 1. 上段の杭
  const topY = INFO_AREA.y + 30
  for (let x = startX; x <= endX; x += spacing) {
    const peg = Matter.Bodies.circle(x, topY, pegRadius, pegOptions)
    peg.color = '#8be9fd'
    peg.radius = pegRadius
    peg.renderType = 'peg'
    obstacles.push(peg)
  }

  // 2. 下段の杭
  const bottomY = INFO_AREA.y + INFO_AREA.h - 20
  for (let x = startX + (spacing/2); x <= endX - (spacing/2); x += spacing) {
    const centerX = INFO_AREA.x + (INFO_AREA.w / 2)
    if (Math.abs(x - centerX) < 100) continue; 

    const peg = Matter.Bodies.circle(x, bottomY, pegRadius, pegOptions)
    peg.color = '#8be9fd'
    peg.radius = pegRadius
    peg.renderType = 'peg'
    obstacles.push(peg)
  }

  // 3. ラッキーセンサー
  const sensorWidth = 200
  const sensorHeight = 20
  const sensorX = INFO_AREA.x + (INFO_AREA.w / 2)
  const sensorY = VIRTUAL_HEIGHT - 10 

  const sensor = Matter.Bodies.rectangle(sensorX, sensorY, sensorWidth, sensorHeight, {
    isStatic: true,
    isSensor: true,
    label: 'lucky-sensor'
  })
  sensor.width = sensorWidth
  sensor.height = sensorHeight
  sensor.color = '#ff79c6'
  sensor.renderType = 'sensor'
  obstacles.push(sensor)

  Matter.World.add(world, obstacles)
}

function removeOutOfBoundsBodies() {
  const bodies = Matter.Composite.allBodies(engine.world)
  const bodiesToRemove = bodies.filter(body => {
    if (body.isStatic) return false
    if (body.position.y > VIRTUAL_HEIGHT + 200) return true
    return false
  })
  if (bodiesToRemove.length > 0) {
    Matter.World.remove(engine.world, bodiesToRemove)
  }
}

function broadcastPositions(windows) {
  const { winUser, winOBS } = windows

  // ★修正: Mainシーン以外の場合は空データを送信して非表示にする
  if (!isPhysicsActive) {
    if (winUser && !winUser.isDestroyed()) winUser.webContents.send('physics-update', [])
    if (winOBS && !winOBS.isDestroyed()) winOBS.webContents.send('physics-update', [])
    return
  }

  const bodies = Matter.Composite.allBodies(engine.world)

  const syncData = bodies.map((body) => ({
    id: body.id,
    x: body.position.x,
    y: body.position.y,
    angle: body.angle,
    label: body.label,
    width: body.width || 0,
    height: body.height || 0,
    radius: body.circleRadius || body.radius || 0,
    color: body.color,
    text: body.text,
    renderType: body.renderType
  }))

  if (winUser && !winUser.isDestroyed()) winUser.webContents.send('physics-update', syncData)
  if (winOBS && !winOBS.isDestroyed()) winOBS.webContents.send('physics-update', syncData)
}

export function spawnPhysicsComment(text, color, authorName = 'Anonymous', authorIcon = '', extraData = {}) {
  // ★修正: 物理演算停止条件を削除 (非表示中でも生成は許可)
  if (!engine) return 

  const minX = INFO_AREA.x + 50
  const maxX = INFO_AREA.x + INFO_AREA.w - 50
  
  const x = Math.random() * (maxX - minX) + minX
  const y = -100
  const radius = 20
  
  const body = Matter.Bodies.circle(x, y, radius, {
    restitution: 0.8,
    friction: 0.001,
    density: 0.04,
    label: 'comment',
    renderType: 'orb',
    color: color || '#FFFFFF',
    text: text,
    authorName: authorName,
    authorIcon: authorIcon,
    messageParts: extraData.messageParts || [],
    isMember: extraData.isMember || false,
    authorBadges: extraData.authorBadges || []
  })
  
  body.circleRadius = radius
  body.color = color || '#FFFFFF'
  body.text = text
  body.authorName = authorName
  body.authorIcon = authorIcon
  body.messageParts = extraData.messageParts || []
  body.isMember = extraData.isMember || false
  body.authorBadges = extraData.authorBadges || []

  Matter.World.add(engine.world, body)
}

function setupIpcListeners() {
  ipcMain.on('set-gravity', (event, { x, y }) => {
    if (engine) engine.world.gravity.x = x; engine.world.gravity.y = y;
  })
  ipcMain.on('clear-world', () => {
    if (engine) {
      const bodies = Matter.Composite.allBodies(engine.world)
      const nonStaticBodies = bodies.filter(b => !b.isStatic)
      Matter.Composite.remove(engine.world, nonStaticBodies)
    }
  })
}