import type * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
    'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-semibold w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:size-3',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-ink text-paper',
                neutral: 'border-transparent bg-neutral text-muted',
                c0: 'border-transparent bg-c0 text-c0i',
                c1: 'border-transparent bg-c1 text-c1i',
                c2: 'border-transparent bg-c2 text-c2i',
                c3: 'border-transparent bg-c3 text-c3i',
                c4: 'border-transparent bg-c4 text-c4i',
                c5: 'border-transparent bg-c5 text-c5i',
                outline: 'border-rule text-ink',
            },
        },
        defaultVariants: { variant: 'default' },
    }
);

function Badge({
    className,
    variant,
    asChild = false,
    ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : 'span';
    return (
        <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };