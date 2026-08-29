import { useRef, type ReactNode } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { cn } from '@/lib/utils';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade-in-up' | 'fade-in' | 'slide-in-right' | 'slide-in-left' | 'zoom-in';
  delay?: number; // ms
  duration?: number; // ms
}

export function AnimatedSection({
  children,
  className,
  animation = 'fade-in-up',
  delay = 0,
  duration = 700,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(ref, { threshold: 0.1, freezeOnceVisible: true });

  const getAnimationClass = () => {
    switch (animation) {
      case 'fade-in-up':
        return 'translate-y-8 opacity-0';
      case 'slide-in-right':
        return 'translate-x-8 opacity-0';
      case 'slide-in-left':
        return '-translate-x-8 opacity-0';
      case 'zoom-in':
        return 'scale-95 opacity-0';
      case 'fade-in':
      default:
        return 'opacity-0';
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all will-change-transform',
        !isVisible && getAnimationClass(),
        isVisible && 'translate-y-0 translate-x-0 scale-100 opacity-100',
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {children}
    </div>
  );
}
