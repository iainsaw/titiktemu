import { useEffect, useState, useRef } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  formattingFn?: (val: number) => string;
}

export function AnimatedNumber({
  value,
  duration = 2000,
  className = '',
  prefix = '',
  suffix = '',
  formattingFn,
}: AnimatedNumberProps) {
  const [currentValue, setCurrentValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isVisible = useIntersectionObserver(ref, { threshold: 0.1, freezeOnceVisible: true });

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      
      // Easing function (easeOutExpo)
      const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
      
      const percentage = Math.min(progress / duration, 1);
      const easedProgress = easeOutExpo(percentage);
      
      setCurrentValue(Math.floor(easedProgress * value));

      if (progress < duration) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCurrentValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration, isVisible]);

  const displayValue = formattingFn ? formattingFn(currentValue) : currentValue.toLocaleString('id-ID');

  return (
    <span ref={ref} className={className}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}
