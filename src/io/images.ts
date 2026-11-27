// Validación y normalización de imágenes importadas.
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const MAX_BYTES = 15 * 1024 * 1024
const MAX_SIDE = 1600

/** Valida tipo/tamaño, decodifica (descarta archivos que no son imagen real) y reescala a WebP. */
export async function importImage(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error(`Formato no permitido: ${file.type || 'desconocido'}`)
  if (file.size > MAX_BYTES) throw new Error('Imagen demasiado grande (máx. 15 MB)')
  const bmp = await createImageBitmap(file).catch(() => { throw new Error('El archivo no es una imagen válida') })
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * k)
  canvas.height = Math.round(bmp.height * k)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return canvas.toDataURL('image/webp', 0.88)
}

export function pickFiles(accept: string, multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept, multiple })
    input.onchange = () => resolve(Array.from(input.files ?? []))
    input.click()
  })
}
