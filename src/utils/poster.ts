import type { ShareCard } from '../api/types'

/** 把分享卡画成海报 PNG，供保存后发朋友圈。不引入额外依赖。 */
export async function renderSharePoster(card: ShareCard): Promise<Blob> {
  const width = 720
  const height = 960
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')

  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, '#2d1b69')
  bg.addColorStop(1, '#6c5ce7')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.beginPath()
  ctx.arc(560, 120, 180, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#f3efff'
  ctx.font = '28px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(card.title, 64, 160)

  ctx.font = 'bold 52px "PingFang SC","Microsoft YaHei",sans-serif'
  wrapText(ctx, card.result, 64, 280, 590, 64)

  ctx.font = '28px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillStyle = '#ddd6ff'
  wrapText(ctx, card.summary, 64, 520, 590, 42)

  let tagX = 64
  ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif'
  for (const tag of card.tags.slice(0, 4)) {
    const label = `#${tag}`
    const w = ctx.measureText(label).width + 28
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    roundRect(ctx, tagX, 720, w, 44, 22)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(label, tagX + 14, 750)
    tagX += w + 12
  }

  ctx.fillStyle = '#cfc6ff'
  ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(card.footer, 64, 860)
  ctx.fillText(card.save_hint, 64, 900)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('poster render failed')
  return blob
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  let line = ''
  let cursorY = y
  for (const ch of text) {
    const next = line + ch
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY)
      line = ch
      cursorY += lineHeight
    } else {
      line = next
    }
  }
  if (line) ctx.fillText(line, x, cursorY)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
