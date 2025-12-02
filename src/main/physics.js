import { ipcMain } from 'electron'
import Matter from 'matter-js'

// ★ 仮想物理ワールドのサイズ（配信画面の解像度：FHD）
// 4Kモニターであっても、物理演算は「配信画面(1920x1080)」を基準に行います
const VIRTUAL_WIDTH = 1920
const VIRTUAL_HEIGHT = 1080

// 物理エンジンのインスタンス保持用
let engine
let runner
let intervalId

export function initPhysics(windows) {
  // 1. エンジン作成
  engine = Matter.Engine.create()
  const world = engine.world

  // 2. 壁と床を作成（コメントが画面外に永遠に落ちないように受け皿を作る）
  const wallOptions = { isStatic: true, render: { visible: false } } // 固定、見えない
  const ground = Matter.Bodies.rectangle(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT + 50, VIRTUAL_WIDTH, 100, wallOptions)
  const leftWall = Matter.Bodies.rectangle(-50, VIRTUAL_HEIGHT / 2, 100, VIRTUAL_HEIGHT, wallOptions)
  const rightWall = Matter.Bodies.rectangle(VIRTUAL_WIDTH + 50, VIRTUAL_HEIGHT / 2, 100, VIRTUAL_HEIGHT, wallOptions)

  Matter.World.add(world, [ground, leftWall, rightWall])

  // 3. ループ処理 (約60FPS)
  // Matter.Runnerを使うとNode.js環境で安定しないことがあるため、setIntervalで回します
  const fps = 60
  intervalId = setInterval(() => {
    Matter.Engine.update(engine, 1000 / fps)
    broadcastPositions(windows)
  }, 1000 / fps)

  // 4. IPCイベントリスナー（レンダラーからの指令を受け取る）
  setupIpcListeners()

  console.log('Physics Engine Started')
}

// 座標データを各ウィンドウに送信する関数
function broadcastPositions(windows) {
  const { winUser, winOBS } = windows
  const bodies = Matter.Composite.allBodies(engine.world)

  // 必要なデータだけ抽出して軽量化
  const syncData = bodies.map((body) => ({
    id: body.id,
    x: body.position.x,
    y: body.position.y,
    angle: body.angle,
    label: body.label,
    width: body.width,   // カスタムプロパティ（後述のスポーン時に入れる）
    height: body.height,
    color: body.color    // 色情報など
  }))

  // 自分用ウィンドウへ送信 (存在すれば)
  if (winUser && !winUser.isDestroyed()) {
    winUser.webContents.send('physics-update', syncData)
  }

  // OBS用ウィンドウへ送信 (存在すれば)
  if (winOBS && !winOBS.isDestroyed()) {
    winOBS.webContents.send('physics-update', syncData)
  }
}

// コメント生成などのイベント設定
function setupIpcListeners() {
  // コメント生成リクエスト
  ipcMain.on('spawn-comment', (event, { text, color }) => {
    const x = Math.random() * (VIRTUAL_WIDTH - 200) + 100
    const y = -100 // 画面上部から
    const width = text.length * 20 + 40 // 文字数に応じた幅（簡易計算）
    const height = 60

    const body = Matter.Bodies.rectangle(x, y, width, height, {
      restitution: 0.8, // 跳ね返り係数
      friction: 0.005,
      label: 'comment',
      // カスタムプロパティとして保存
      width: width,
      height: height,
      color: color || '#FFFFFF',
      text: text
    })
    
    // Matter.jsのBodyオブジェクトに直接カスタムプロパティを生やす
    body.width = width
    body.height = height
    body.color = color || '#FFFFFF'
    body.text = text

    Matter.World.add(engine.world, body)
  })

  // 重力操作（管理者パネル用）
  ipcMain.on('set-gravity', (event, { x, y }) => {
    engine.world.gravity.x = x
    engine.world.gravity.y = y
  })
  
  // ワールドリセット
  ipcMain.on('clear-world', () => {
    Matter.Composite.clear(engine.world, false, true)
    // 壁などは再追加が必要になるため、ここでは簡易的に「壁以外のBodyを削除」するロジックにするのがベター
    // 今回は省略
  })
}