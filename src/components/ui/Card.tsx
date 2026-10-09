import * as React from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// 使用 any 类型引用规避 strict 类型下 HTMLDivElement 向下转换 motion 的冲突
const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <motion.div
            ref={ref as any}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={cn("rounded-xl border bg-card text-card-foreground shadow glass transition-shadow hover:shadow-xl", className)}
            {...(props as any)}
        />
    )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("flex flex-col space-y-1.5 p-6", className)}
            {...props}
        />
    )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn("font-semibold leading-none tracking-tight", className)}
            {...props}
        />
    )
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p
            ref={ref}
            className={cn("text-sm text-muted-foreground", className)}
            {...props}
        />
    )
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
    )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("flex items-center p-6 pt-0", className)}
            {...props}
        />
    )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
