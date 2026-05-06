'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  variant?: 'default' | 'teal' | 'gold' | 'green' | 'red';
  className?: string;
}

export function StatCard({ title, value, description, icon, trend, variant = 'default', className }: StatCardProps) {
  const gradients = {
    default: 'bg-gradient-to-br from-primary/80 to-primary/60 text-primary-foreground border-0',
    teal: 'bg-gradient-to-br from-[#00A39D] to-[#008580] text-white border-0',
    gold: 'bg-gradient-to-br from-[#F8AD3C] to-[#D4922A] text-white border-0',
    green: 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-0',
    red: 'bg-gradient-to-br from-red-500 to-red-700 text-white border-0',
  };

  return (
    <Card className={cn('shadow-lg', variant !== 'default' ? gradients[variant] : '', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium opacity-90">{title}</CardTitle>
        {icon && <div className="h-4 w-4 opacity-80">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-xl md:text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={cn('text-[10px] flex items-center gap-0.5', trend.isPositive ? 'text-green-200' : 'text-red-200')}>
                <TrendingUp className={cn('h-2.5 w-2.5', !trend.isPositive && 'rotate-180')} />
                {trend.value}%
              </span>
            )}
            {description && <p className="text-[10px] opacity-70">{description}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
