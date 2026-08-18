import QRCode from 'qrcode'
import type { ShareCard } from '../api/types'

export interface PosterPalette {
  key: string
  from: string
  to: string
  title: string
  result: string
  muted: string
  orb: string
}

const PALETTES: Record<string, PosterPalette> = {
  luck: { key: 'luck', from: '#7a1b24', to: '#d4a017', title: '#fff4d6', result: '#fff7e6', muted: '#ffe7b3', orb: 'rgba(255,210,90,0.18)' },
  calm: { key: 'calm', from: '#14352d', to: '#4f9d78', title: '#e8fff4', result: '#f3fff8', muted: '#cdeadc', orb: 'rgba(160,230,190,0.16)' },
  spark: { key: 'spark', from: '#9a3412', to: '#f59e0b', title: '#fff7ed', result: '#fffbeb', muted: '#fed7aa', orb: 'rgba(255,200,80,0.2)' },
  harbor: { key: 'harbor', from: '#111827', to: '#3730a3', title: '#e0e7ff', result: '#eef2ff', muted: '#c7d2fe', orb: 'rgba(165,180,252,0.16)' },
  fire: { key: 'fire', from: '#7f1d1d', to: '#ea580c', title: '#fff1e6', result: '#fff7ed', muted: '#fdba74', orb: 'rgba(251,146,60,0.2)' },
  earth: { key: 'earth', from: '#44403c', to: '#b45309', title: '#fef3c7', result: '#fffbeb', muted: '#f5d0a9', orb: 'rgba(217,164,65,0.18)' },
  air: { key: 'air', from: '#0e7490', to: '#7dd3fc', title: '#ecfeff', result: '#ffffff', muted: '#e0f2fe', orb: 'rgba(186,230,253,0.28)' },
  water: { key: 'water', from: '#0f2744', to: '#38bdf8', title: '#e0f2fe', result: '#f0f9ff', muted: '#bae6fd', orb: 'rgba(125,211,252,0.2)' },
  natal: { key: 'natal', from: '#1e1b4b', to: '#5b21b6', title: '#ede9fe', result: '#f5f3ff', muted: '#ddd6fe', orb: 'rgba(196,181,253,0.2)' },
  dusk: { key: 'dusk', from: '#2d1b69', to: '#6c5ce7', title: '#f3efff', result: '#ffffff', muted: '#ddd6ff', orb: 'rgba(255,255,255,0.08)' }
}

/** 按结果文案/标签选海报色，让「今日宜借运」偏金红、「宜养气」偏青绿，而不是统一紫。 */
export function resolvePosterPalette(card: ShareCard): PosterPalette {
  const text = `${card.theme} ${card.result} ${card.summary} ${card.tags.join(' ')}`
  if (/借运|好运|惊喜|赤金|朱红/.test(text)) return PALETTES.luck
  if (/养气|收一收|放慢|米白|浅灰/.test(text)) return PALETTES.calm
  if (/社交小太阳|热闹回血/.test(text)) return PALETTES.spark
  if (/静音|充电桩|独处/.test(text)) return PALETTES.harbor
  if (/火相/.test(text)) return PALETTES.fire
  if (/土相/.test(text)) return PALETTES.earth
  if (/风相/.test(text)) return PALETTES.air
  if (/水相/.test(text)) return PALETTES.water
  if (/星盘|太阳在|日[\u4e00-\u9fff]/.test(text)) return PALETTES.natal
  return PALETTES[card.theme] ?? PALETTES.dusk
}

export function appPublicUrl(): string {
  return `${window.location.origin}/`
}

/** 把分享卡画成海报 PNG。配色跟结果走；右下角二维码打开当前 PWA 地址。 */
export async function renderSharePoster(card: ShareCard): Promise<Blob> {
  const width = 720
  const height = 960
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')

  const palette = resolvePosterPalette(card)
  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, palette.from)
  bg.addColorStop(1, palette.to)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = palette.orb
  ctx.beginPath()
  ctx.arc(560, 120, 180, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = palette.title
  ctx.font = '28px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(card.title, 64, 150)

  ctx.fillStyle = palette.result
  ctx.font = 'bold 52px "PingFang SC","Microsoft YaHei",sans-serif'
  wrapText(ctx, card.result, 64, 250, 590, 64)

  ctx.font = '28px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillStyle = palette.muted
  wrapText(ctx, card.summary, 64, 470, 590, 42)

  let tagX = 64
  ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif'
  for (const tag of card.tags.slice(0, 4)) {
    const label = `#${tag}`
    const w = ctx.measureText(label).width + 28
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    roundRect(ctx, tagX, 680, w, 44, 22)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(label, tagX + 14, 710)
    tagX += w + 12
  }

  const qrSize = 148
  const qrX = width - 64 - qrSize
  const qrY = height - 64 - qrSize
  ctx.fillStyle = '#fff'
  roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 16)
  ctx.fill()
  const qrUrl = appPublicUrl()
  const qrData = await QRCode.toDataURL(qrUrl, {
    margin: 0,
    width: qrSize * 2,
    color: { dark: '#1a1033', light: '#ffffff' }
  })
  const qrImage = await loadImage(qrData)
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize)

  ctx.fillStyle = palette.muted
  ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText('守护星', 64, 820)
  ctx.fillText('扫码打开应用', 64, 856)
  ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  const host = qrUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  ctx.fillText(host, 64, 888)

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('qr image failed'))
    image.src = src
  })
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
  let lines = 0
  for (const ch of text) {
    const next = line + ch
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY)
      line = ch
      cursorY += lineHeight
      lines += 1
      if (lines >= 3) {
        line = ''
        break
      }
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
