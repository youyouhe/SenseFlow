export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Helper function to write string to DataView at offset
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

// Convert AudioBuffer to WAV format ArrayBuffer
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16

  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample

  const samples = buffer.length
  const dataSize = samples * numChannels * bytesPerSample
  const bufferSize = 44 + dataSize

  const arrayBuffer = new ArrayBuffer(bufferSize)
  const view = new DataView(arrayBuffer)

  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Write audio data
  const channels: Float32Array[] = []
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  let offset = 44
  for (let i = 0; i < samples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  return arrayBuffer
}

export async function extractAudioSegment(
  fullAudio: ArrayBuffer,
  startTime: number,
  endTime: number
): Promise<ArrayBuffer> {
  const audioContext = new AudioContext()
  const fullBuffer = await audioContext.decodeAudioData(fullAudio.slice(0))
  const sampleRate = fullBuffer.sampleRate
  const totalSamples = fullBuffer.length

  const startSample = Math.floor(startTime * sampleRate)
  // Use Math.ceil to ensure we include the end boundary
  // Also clamp to totalSamples to avoid exceeding buffer
  const endSample = Math.min(Math.ceil(endTime * sampleRate), totalSamples)
  const length = Math.max(0, endSample - startSample)

  // Safety check: ensure startSample is within bounds
  const safeStartSample = Math.max(0, Math.min(startSample, totalSamples))
  const safeLength = Math.min(length, totalSamples - safeStartSample)

  const segmentBuffer = audioContext.createBuffer(fullBuffer.numberOfChannels, safeLength, sampleRate)

  for (let channel = 0; channel < fullBuffer.numberOfChannels; channel++) {
    const fullData = fullBuffer.getChannelData(channel)
    const segmentData = segmentBuffer.getChannelData(channel)
    for (let i = 0; i < safeLength; i++) {
      segmentData[i] = fullData[safeStartSample + i] || 0
    }
  }

  // Convert to WAV format
  return audioBufferToWav(segmentBuffer)
}

export async function base64ToAudioBuffer(
  base64: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const arrayBuffer = base64ToArrayBuffer(base64)
  return await audioContext.decodeAudioData(arrayBuffer.slice(0))
}
