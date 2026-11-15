#!/usr/bin/env bash
# =====================================================================================
# VIDEO (Veo / Sora / Kling…) → KHUNG HÌNH TRONG SUỐT cho 1 động tác.
#   bash tools/video-to-frames.sh <video.mp4> <thư-mục-ra> [fps=30] [cỡ=512] [màu-nền=0x00FF00]
# Ví dụ:
#   bash tools/video-to-frames.sh walk.mp4 raw/mimi/walk 30 512 0x00FF00
# Cần: ffmpeg. (Nền không phải màu trơn → bỏ colorkey, dùng rembg: pip install rembg && rembg p in/ out/)
#
# Mẹo vòng lặp: cắt đúng 1 chu kỳ bước (khung đầu ≈ khung cuối) – xem từng khung rồi xoá phần thừa.
# Muốn 60 / 120 khung/giây từ video 24–30 khung: thêm nội suy
#   INTERP=120 bash tools/video-to-frames.sh walk.mp4 raw/mimi/walk 120
# (minterpolate của ffmpeg; chất lượng cao hơn: RIFE – https://github.com/hzwer/ECCV2022-RIFE)
# =====================================================================================
set -euo pipefail
IN="$1"; OUT="$2"; FPS="${3:-30}"; SIZE="${4:-512}"; KEY="${5:-0x00FF00}"
mkdir -p "$OUT"
PRE=""
if [ -n "${INTERP:-}" ]; then PRE="minterpolate=fps=${INTERP}:mi_mode=mci:mc_mode=aobmc:vsbmc=1,"; fi
ffmpeg -hide_banner -loglevel error -i "$IN" \
  -vf "${PRE}fps=${FPS},colorkey=${KEY}:0.32:0.08,despill=type=green,scale=${SIZE}:${SIZE}:force_original_aspect_ratio=decrease,pad=${SIZE}:${SIZE}:(ow-iw)/2:(oh-ih):color=0x00000000,format=rgba" \
  -c:v libwebp -lossless 0 -quality 82 "$OUT/%04d.webp"
echo "✓ $(ls "$OUT" | wc -l) khung → $OUT"
echo "  Tiếp theo: xem lại, xoá khung thừa cho vòng lặp khép kín, rồi: node tools/pack-frames.mjs $(dirname "$OUT") <id-mèo> \"Tên\""
