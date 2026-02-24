// Run with: node scripts/generate-icons.mjs
// Requires: npm install -D sharp  (one-time)
// Generates placeholder PWA icons from the SVG source

import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const SIZES = [192, 512]
const OUT_DIR = join(process.cwd(), 'public', 'icons')
mkdirSync(OUT_DIR, { recursive: true })

for (const size of SIZES) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#38bdf8'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()

  // Text
  ctx.fillStyle = 'white'
  ctx.font = `bold ${size * 0.35}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', size / 2, size / 2)

  writeFileSync(join(OUT_DIR, `icon-${size}.png`), canvas.toBuffer('image/png'))
  console.log(`Generated icon-${size}.png`)
}

// Maskable (same but with padding — 10% safe zone on each side)
const mSize = 512
const canvas = createCanvas(mSize, mSize)
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#38bdf8'
ctx.fillRect(0, 0, mSize, mSize)
ctx.fillStyle = 'white'
ctx.font = `bold ${mSize * 0.5}px sans-serif`
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('N', mSize / 2, mSize / 2)
writeFileSync(join(OUT_DIR, 'icon-maskable-512.png'), canvas.toBuffer('image/png'))
console.log('Generated icon-maskable-512.png')
