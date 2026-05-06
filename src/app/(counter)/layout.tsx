import { CounterLayout } from '@/components/counter/CounterLayout'

export default function CounterRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <CounterLayout>{children}</CounterLayout>
}
