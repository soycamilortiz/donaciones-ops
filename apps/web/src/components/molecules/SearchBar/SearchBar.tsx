import type { ReactElement } from 'react';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import { cn } from '@/lib/utils';
import type { SearchBarProps } from './SearchBar.types';

export function SearchBar({
  placeholder = 'Search...',
  className,
  ...props
}: SearchBarProps): ReactElement {
  return (
    <form role="search" className={cn('relative w-full', className)} {...props}>
      <div className="relative">
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input name="q" type="search" placeholder={placeholder} className="pl-9" />
      </div>
    </form>
  );
}
