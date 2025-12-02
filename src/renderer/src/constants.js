// --- 仮想ワールドの設定 (配信画面の基準サイズ) ---
export const VIRTUAL_WIDTH = 1920;
export const VIRTUAL_HEIGHT = 1080;

// --- OBSレイアウト設定 ---
// 「OBSの配信画面の中で、ゲーム画面がどこにあるか」を定義します。
// ここを変えれば、配信レイアウトの変更に対応できます。
export const OBS_GAME_LAYOUT = {
  // 例: 画面中央に 1280x720 のゲーム画面を配置する場合
  // x: (1920 - 1280) / 2 = 320
  // y: (1080 - 720) / 2 = 180
  x: 320,
  y: 180,
  width: 1280,
  height: 720
};

// --- 座標変換関数 ---

/**
 * 仮想ワールド座標 (OBS基準) を、ユーザー画面座標 (4Kフルスクリーン) に変換する
 * @param {number} x - オブジェクトのX座標 (Virtual)
 * @param {number} y - オブジェクトのY座標 (Virtual)
 * @param {number} objectWidth - オブジェクトの幅 (拡大率計算用)
 * @returns {object} { x, y, scale } - 変換後の座標と拡大率
 */
export function transformToUserView(x, y, objectWidth) {
  // 1. 自分のモニターサイズを取得 (3840x2160)
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  // 2. 拡大率を計算
  // 配信画面上の「1280pxのゲーム」を、自分のモニターの「3840px」に引き伸ばす倍率
  // scale = 3840 / 1280 = 3.0倍
  const scaleX = screenW / OBS_GAME_LAYOUT.width;
  const scaleY = screenH / OBS_GAME_LAYOUT.height;
  
  // 基本的にアスペクト比は維持したいので、小さい方を採用（または固定）
  // 今回は全画面フィットさせるのでX基準
  const scale = scaleX;

  // 3. 座標変換
  // (現在の座標 - ゲーム画面の開始位置) * 拡大率
  const userX = (x - OBS_GAME_LAYOUT.x) * scale;
  const userY = (y - OBS_GAME_LAYOUT.y) * scale;

  return {
    x: userX,
    y: userY,
    scale: scale
  };
}

/**
 * 仮想ワールド座標をそのまま返す (OBS用)
 */
export function transformToOBSView(x, y) {
  return { x, y, scale: 1 };
}