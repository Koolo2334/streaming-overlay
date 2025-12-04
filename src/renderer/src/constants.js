import React from 'react' // ※元のファイルには無い可能性がありますが、もし必要なら。今回は定数ファイルなので不要。

// --- 仮想ワールドの設定 (配信画面の基準サイズ) ---
export const VIRTUAL_WIDTH = 1920;
export const VIRTUAL_HEIGHT = 1080;

// --- OBSレイアウト設定 ---
export const OBS_GAME_LAYOUT = {
  x: 32,
  y: 64,
  width: 1440,
  height: 810, // ★修正: 枠を含めない中身の高さ (846 - 32 - 4 = 810)
  
  // ★追加: 枠のサイズ情報
  frame: {
    headerHeight: 32,
    borderWidth: 2 // 上下合わせて4pxなので片側2pxと仮定
  }
};

// --- 座標変換関数 ---
export function transformToUserView(x, y, objectWidth) {
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  const scaleX = screenW / OBS_GAME_LAYOUT.width;
  const scaleY = screenH / OBS_GAME_LAYOUT.height;
  
  // アスペクト比維持（小さい方に合わせる）
  const scale = scaleX < scaleY ? scaleX : scaleY;

  // ★追加: センタリング用のオフセット（画面サイズとコンテンツサイズの差分の半分）
  const centerOffsetX = (screenW - OBS_GAME_LAYOUT.width * scale) / 2;
  const centerOffsetY = (screenH - OBS_GAME_LAYOUT.height * scale) / 2;

  // ★修正: ゲーム画面（中身）の左上座標を計算
  // ウィンドウ位置(x) + 左枠線
  const contentStartX = OBS_GAME_LAYOUT.x;
  // ウィンドウ位置(y) + ヘッダー + 上枠線
  const contentStartY = OBS_GAME_LAYOUT.y;

  // 物理座標(x,y) から 中身の左上(contentStart) を引いて、UserView基準にする
  const userX = (x - contentStartX) * scale + centerOffsetX;
  const userY = (y - contentStartY) * scale + centerOffsetY;

  return {
    x: userX,
    y: userY,
    scale: scale
  };
}

export function transformToOBSView(x, y) {
  return { x, y, scale: 1 };
}