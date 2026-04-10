import { ImageResponse } from 'next/og'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default async function Icon() {
  const imagePath = path.join(process.cwd(), 'public', 'logo.png')
  const base64Str = await fs.readFile(imagePath, { encoding: 'base64' })
  const src = `data:image/png;base64,${base64Str}`

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={src}
          style={{ width: '80%', height: '80%', objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size }
  )
}
