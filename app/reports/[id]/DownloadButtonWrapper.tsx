'use client'

import dynamic from 'next/dynamic'

export const DownloadButton = dynamic(
  () => import('./DownloadButton').then((mod) => mod.DownloadButton),
  { ssr: false, loading: () => <span className="text-sm text-gray-500">Loading...</span> }
)