import pako from 'pako'
import { StudyMaterial } from '../types'

interface CompressedMaterial {
  version: number
  material: StudyMaterial
}

const COMPRESSION_LEVEL = 6
const VERSION = 1

export class CompressionService {
  private constructor() {}

  private static instance: CompressionService

  static getInstance(): CompressionService {
    if (!CompressionService.instance) {
      CompressionService.instance = new CompressionService()
    }
    return CompressionService.instance
  }

  compress(material: StudyMaterial): {
    data: string
    originalSize: number
    compressedSize: number
  } {
    const compressedObj: CompressedMaterial = {
      version: VERSION,
      material: this.prepareForCompression(material),
    }

    const jsonString = JSON.stringify(compressedObj)
    const originalSize = new TextEncoder().encode(jsonString).length

    const compressed = pako.gzip(jsonString, { level: COMPRESSION_LEVEL })
    const compressedSize = compressed.length

    const base64 = this.arrayBufferToBase64(compressed)

    return {
      data: base64,
      originalSize,
      compressedSize,
    }
  }

  decompress(compressedData: string): StudyMaterial {
    const compressed = this.base64ToArrayBuffer(compressedData)
    const decompressed = pako.ungzip(compressed)

    const jsonString = new TextDecoder().decode(decompressed)
    const compressedObj: CompressedMaterial = JSON.parse(jsonString)

    if (compressedObj.version !== VERSION) {
      console.warn(`Unknown compression version: ${compressedObj.version}`)
    }

    return this.restoreFromCompression(compressedObj.material)
  }

  private prepareForCompression(material: StudyMaterial): StudyMaterial {
    return {
      ...material,
      chunks: material.chunks.map(chunk => ({
        ...chunk,
        words: chunk.words
          ? chunk.words.map(w => ({
              word: w.word,
              start: Number(w.start),
              end: Number(w.end),
            }))
          : undefined,
      })),
    }
  }

  private restoreFromCompression(material: StudyMaterial): StudyMaterial {
    return {
      ...material,
      chunks: material.chunks.map(chunk => ({
        ...chunk,
        words: chunk.words
          ? chunk.words.map(w => ({
              word: w.word,
              start: Number(w.start),
              end: Number(w.end),
            }))
          : undefined,
      })),
    }
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }

  calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) return 0
    return ((originalSize - compressedSize) / originalSize) * 100
  }
}

export const compressionService = CompressionService.getInstance()
