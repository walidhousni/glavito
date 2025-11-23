export interface ApiEnvelope<T> {
  success: boolean
  data: T
}

export function ok<T>(data: T): ApiEnvelope<T> {
  return { success: true, data }
}

export function fail<T>(data: T): ApiEnvelope<T> {
  return { success: false, data }
}


