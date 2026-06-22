import type { ScpSubmission } from '../types'

const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.82

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Could not read image file.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read image file.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load image.'))
    image.src = src
  })
}

function fitDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }

  const scale = maxDimension / Math.max(width, height)
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

export async function compressDataUrl(dataUrl: string): Promise<string> {
  const image = await loadImage(dataUrl)
  const { width, height } = fitDimensions(image.width, image.height, MAX_DIMENSION)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not compress image.')
  }

  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

export async function compressImageFile(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file)
  return compressDataUrl(dataUrl)
}

export async function preparePictureForStorage(picture: string): Promise<string> {
  const trimmed = picture.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:')) {
    return compressDataUrl(trimmed)
  }
  return trimmed
}

export async function prepareScpSubmission(submission: ScpSubmission): Promise<ScpSubmission> {
  return {
    ...submission,
    picture: await preparePictureForStorage(submission.picture),
  }
}
