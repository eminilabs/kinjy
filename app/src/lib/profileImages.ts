/**
 * Avatar and cover uploads.
 *
 * Three steps, run by `uploadProfileImage`:
 *   1. presign  — declare purpose, type and size; refused before anything is sent
 *   2. PUT      — the bytes go to media-service, which checks them and stores
 *                 them (on UploadCenter, or locally without a key). The browser
 *                 never talks to UploadCenter: its storage refuses CORS.
 *   3. complete — polled until the stored file is ready (UploadCenter scans
 *                 it for viruses first, which takes a couple of seconds)
 *
 * The result is an asset id to send as `avatar_asset_id` / `cover_asset_id` in
 * `kaluta.account.updateProfile`. The server never accepts an image URL.
 */
import { API_BASE, ApiError, api, refreshAccessToken, tokens } from './api'

export type ProfileImagePurpose = 'avatar' | 'cover'
export type UploadStage = 'uploading' | 'processing'

export interface ProfileImage {
  asset_id: string
  purpose: ProfileImagePurpose
  status: 'pending' | 'processing' | 'ready' | 'failed'
  url: string | null
  storage: 'local' | 'uploadcenter'
  retry_after_seconds?: number
}

interface ProfileImageGrant {
  asset_id: string
  storage: 'local' | 'uploadcenter'
  upload: { path: string }
}

export interface UploadOptions {
  /** Share of the bytes sent, 0 to 1. */
  onProgress?: (fraction: number) => void
  onStage?: (stage: UploadStage) => void
  signal?: AbortSignal
}

const MB = 1024 * 1024

/** Mirrors media-service's rules so the member hears "no" before waiting. */
export const PROFILE_IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']
export const PROFILE_IMAGE_LIMITS: Record<ProfileImagePurpose, number> = { avatar: 5 * MB, cover: 10 * MB }

const MAX_COMPLETE_ATTEMPTS = 30
const DEFAULT_RETRY_SECONDS = 2

/** Why this file would be refused, in the member's terms, or null. */
export function profileImageProblem(file: File, purpose: ProfileImagePurpose): string | null {
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) return 'Choose a JPEG, PNG or WebP image.'
  if (file.size === 0) return 'This file is empty.'
  const limit = PROFILE_IMAGE_LIMITS[purpose]
  if (file.size > limit) return `An image for your ${purpose} must be at most ${limit / MB} MB.`
  return null
}

export async function uploadProfileImage(
  file: File,
  purpose: ProfileImagePurpose,
  options: UploadOptions = {},
): Promise<ProfileImage> {
  const problem = profileImageProblem(file, purpose)
  if (problem) throw new ApiError(422, problem)

  const grant = await api.post<ProfileImageGrant>(
    '/media/profile-images/presign',
    { purpose, filename: file.name || purpose, mime_type: file.type, size_bytes: file.size },
    { signal: options.signal },
  )

  options.onStage?.('uploading')
  await putWithProgress(grant.upload.path, file, options)

  options.onStage?.('processing')
  return waitUntilReady(grant.asset_id, options.signal)
}

interface PutResult {
  status: number
  payload: unknown
}

/**
 * XHR rather than fetch: fetch cannot report how much of a request body has
 * been sent, and a 10 MB cover on a slow connection is exactly where a real
 * progress bar matters.
 */
function putOnce(path: string, file: File, options: UploadOptions): Promise<PutResult> {
  return new Promise<PutResult>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new ApiError(0, 'Upload cancelled'))
      return
    }
    const request = new XMLHttpRequest()
    request.open('PUT', `${API_BASE}${path}`)
    request.setRequestHeader('Content-Type', file.type)
    const token = tokens.access
    if (token) request.setRequestHeader('Authorization', `Bearer ${token}`)

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(event.loaded / event.total)
    }
    request.onload = () => resolve({ status: request.status, payload: parseJson(request.responseText) })
    request.onerror = () => reject(new ApiError(0, 'The upload could not reach the server'))
    request.onabort = () => reject(new ApiError(0, 'Upload cancelled'))
    options.signal?.addEventListener('abort', () => request.abort(), { once: true })
    request.send(file)
  })
}

async function putWithProgress(path: string, file: File, options: UploadOptions): Promise<void> {
  let result = await putOnce(path, file, options)
  // Same rule as every other request: one retry after refreshing an expired token.
  if (result.status === 401 && tokens.refresh && (await refreshAccessToken())) {
    result = await putOnce(path, file, options)
  }
  if (result.status < 200 || result.status >= 300) {
    throw new ApiError(result.status, detailOf(result.payload) ?? `Upload failed (${result.status})`, result.payload)
  }
  options.onProgress?.(1)
}

/** 200 = ready; 202 = still being scanned, ask again after `retry_after_seconds`. */
async function waitUntilReady(assetId: string, signal?: AbortSignal): Promise<ProfileImage> {
  for (let attempt = 0; attempt < MAX_COMPLETE_ATTEMPTS; attempt += 1) {
    const image = await api.post<ProfileImage>(`/media/profile-images/${assetId}/complete`, undefined, { signal })
    if (image.status === 'ready') return image
    await wait((image.retry_after_seconds ?? DEFAULT_RETRY_SECONDS) * 1000, signal)
  }
  throw new ApiError(504, 'This image is taking too long to process. Please try again in a moment.')
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new ApiError(0, 'Upload cancelled'))
      },
      { once: true },
    )
  })
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

function detailOf(payload: unknown): string | null {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
  }
  return null
}
