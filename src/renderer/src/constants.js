// --- 仮想ワールドの設定 (配信画面の基準サイズ) ---
export const VIRTUAL_WIDTH = 1920;
export const VIRTUAL_HEIGHT = 1080;

// --- OBSレイアウト設定 ---
export const OBS_GAME_LAYOUT = {
  x: 30,
  y: 30,
  width: 1440,
  // 中身(810) + ヘッダー(32) + 枠線上下(4) = 846
  height: 846
};

// --- 座標変換関数 ---
export function transformToUserView(x, y, objectWidth) {
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  const scaleX = screenW / OBS_GAME_LAYOUT.width;
  const scaleY = screenH / OBS_GAME_LAYOUT.height;
  
  // アスペクト比維持（小さい方に合わせる）
  const scale = scaleX < scaleY ? scaleX : scaleY;

  const userX = (x - OBS_GAME_LAYOUT.x) * scale;
  const userY = (y - OBS_GAME_LAYOUT.y) * scale;

  return {
    x: userX,
    y: userY,
    scale: scale
  };
}

export function transformToOBSView(x, y) {
  return { x, y, scale: 1 };
}