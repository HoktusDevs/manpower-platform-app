import type { ReactNode, ElementType } from 'react';

interface FlexProps {
  readonly children: ReactNode;
  readonly direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  readonly wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  readonly justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  readonly align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
  readonly gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  readonly className?: string;
  readonly as?: ElementType;
}

const FLEX_DIRECTIONS = {
  row: 'flex-row',
  col: 'flex-col',
  'row-reverse': 'flex-row-reverse',
  'col-reverse': 'flex-col-reverse'
} as const;

const FLEX_WRAP = {
  nowrap: 'flex-nowrap',
  wrap: 'flex-wrap',
  'wrap-reverse': 'flex-wrap-reverse'
} as const;

const JUSTIFY_CONTENT = {
  start: 'justify-start',
  end: 'justify-end',
  center: 'justify-center',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
} as const;

const ALIGN_ITEMS = {
  start: 'items-start',
  end: 'items-end',
  center: 'items-center',
  baseline: 'items-baseline',
  stretch: 'items-stretch'
} as const;

const FLEX_GAP = {
  none: 'gap-0',
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8'
} as const;

export function Flex({
  children,
  direction = 'row',
  wrap = 'nowrap',
  justify = 'start',
  align = 'stretch',
  gap = 'none',
  className = '',
  as: Component = 'div'
}: FlexProps): ReactNode {
  const flexClasses = [
    'flex',
    FLEX_DIRECTIONS[direction],
    FLEX_WRAP[wrap],
    JUSTIFY_CONTENT[justify],
    ALIGN_ITEMS[align],
    FLEX_GAP[gap],
    className
  ].filter(Boolean).join(' ');

  return (
    <Component className={flexClasses}>
      {children}
    </Component>
  );
}

export type { FlexProps };