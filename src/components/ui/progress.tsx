import type * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../../lib/utils';

function Progress({
    className,
    value,
    tone = 'default',
    ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
    tone?: 'default' | 'dsa' | 'react' | 'python' | 'ai' | 'design';
}) {
    const tones: Record<string, string> = {
        default: 'bg-focus',
        dsa: 'bg-c1i',
        react: 'bg-c4i',
        python: 'bg-c5i',
        ai: 'bg-c2i',
        design: 'bg-c0i',
    };
    return (
        <ProgressPrimitive.Root
            data-slot="progress"
            className={cn('relative h-2 w-full overflow-hidden rounded-full bg-neutral', className)}
            {...props}
        >
            <ProgressPrimitive.Indicator
                data-slot="progress-indicator"
                className={cn('h-full rounded-full transition-[width] duration-300', tones[tone])}
                style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
            />
        </ProgressPrimitive.Root>
    );
}

export { Progress };