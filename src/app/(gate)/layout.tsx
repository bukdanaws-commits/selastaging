import { GateLayout } from '@/components/gate/GateLayout'

export default function GateRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <GateLayout>{children}</GateLayout>
}
