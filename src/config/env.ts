function required(key: string): string {
  const value = import.meta.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value as string
}

export const env = {
  FIREBASE_API_KEY: required('VITE_FIREBASE_API_KEY'),
  FIREBASE_AUTH_DOMAIN: required('VITE_FIREBASE_AUTH_DOMAIN'),
  FIREBASE_PROJECT_ID: required('VITE_FIREBASE_PROJECT_ID'),
  FIREBASE_STORAGE_BUCKET: required('VITE_FIREBASE_STORAGE_BUCKET'),
  FIREBASE_MESSAGING_SENDER_ID: required('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  FIREBASE_APP_ID: required('VITE_FIREBASE_APP_ID'),
  APP_ENV: (import.meta.env.VITE_APP_ENV ?? 'development') as string,
}
