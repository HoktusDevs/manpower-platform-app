import type { ReactNode, ElementType } from 'react';

interface GridProps {
  readonly children: ReactNode;
  readonly cols?: '1' | '2' | '3' | '4' | '5' | '6' | 'auto';
  readonly colsSm?: '1' | '2' | '3' | '4' | '5' | '6' | 'auto';
  readonly colsMd?: '1' | '2' | '3' | '4' | '5' | '6' | 'auto';
  readonly colsLg?: '1' | '2' | '3' | '4' | '5' | '6' | 'auto';
  readonly colsXl?: '1' | '2' | '3' | '4' | '5' | '6' | 'auto';
  readonly gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  readonly gapX?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  readonly gapY?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  readonly className?: string;
  readonly as?: ElementType;
}

const GRID_COLS = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-2',
  '3': 'grid-cols-3',
  '4': 'grid-cols-4',
  '5': 'grid-cols-5',
  '6': 'grid-cols-6',
  'auto': 'grid-cols-auto'
} as const;

const GRID_COLS_SM = {
  '1': 'sm:grid-cols-1',
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-3',
  '4': 'sm:grid-cols-4',
  '5': 'sm:grid-cols-5',
  '6': 'sm:grid-cols-6',
  'auto': 'sm:grid-cols-auto'
} as const;

const GRID_COLS_MD = {
  '1': 'md:grid-cols-1',
  '2': 'md:grid-cols-2',
  '3': 'md:grid-cols-3',
  '4': 'md:grid-cols-4',
  '5': 'md:grid-cols-5',
  '6': 'md:grid-cols-6',
  'auto': 'md:grid-cols-auto'
} as const;

const GRID_COLS_LG = {
  '1': 'lg:grid-cols-1',
  '2': 'lg:grid-cols-2',
  '3': 'lg:grid-cols-3',
  '4': 'lg:grid-cols-4',
  '5': 'lg:grid-cols-5',
  '6': 'lg:grid-cols-6',
  'auto': 'lg:grid-cols-auto'
} as const;

const GRID_COLS_XL = {
  '1': 'xl:grid-cols-1',
  '2': 'xl:grid-cols-2',
  '3': 'xl:grid-cols-3',
  '4': 'xl:grid-cols-4',
  '5': 'xl:grid-cols-5',
  '6': 'xl:grid-cols-6',
  'auto': 'xl:grid-cols-auto'
} as const;

const GAP_SIZES = {
  none: 'gap-0',
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8'
} as const;

const GAP_X_SIZES = {
  none: 'gap-x-0',
  xs: 'gap-x-2',
  sm: 'gap-x-3',
  md: 'gap-x-4',
  lg: 'gap-x-6',
  xl: 'gap-x-8'
} as const;

const GAP_Y_SIZES = {
  none: 'gap-y-0',
  xs: 'gap-y-2',
  sm: 'gap-y-3',
  md: 'gap-y-4',
  lg: 'gap-y-6',
  xl: 'gap-y-8'
} as const;

export function Grid({
  children,
  cols = '1',
  colsSm,
  colsMd,
  colsLg,
  colsXl,
  gap = 'md',
  gapX,
  gapY,
  className = '',
  as: Component = 'div'
}: GridProps): ReactNode {
  const gridClasses = [
    'grid',
    GRID_COLS[cols],
    colsSm && GRID_COLS_SM[colsSm],
    colsMd && GRID_COLS_MD[colsMd],
    colsLg && GRID_COLS_LG[colsLg],
    colsXl && GRID_COLS_XL[colsXl],
    gapX ? GAP_X_SIZES[gapX] : gapY ? '' : GAP_SIZES[gap],
    gapY && GAP_Y_SIZES[gapY],
    className
  ].filter(Boolean).join(' ');

  return (
    <Component className={gridClasses}>
      {children}
    </Component>
  );
}

export type { GridProps };