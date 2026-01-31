import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '관리자 | 이화피아노의봄',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
