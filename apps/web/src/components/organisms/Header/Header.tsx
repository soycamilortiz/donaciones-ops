import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/atoms/Avatar';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { SearchBar } from '@/components/molecules/SearchBar';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { HeaderProps } from './Header.types';

export function Header({ className, sticky = false, ...props }: HeaderProps): ReactElement {
  return (
    <header
      className={cn(
        'flex h-16 items-center gap-4 border-b border-border bg-background px-4',
        sticky && 'sticky top-0 z-40',
        className,
      )}
      {...props}
    >
      <Link to={ROUTES.home} className="flex items-center gap-2 font-semibold">
        <Icon name="heart" className="text-primary" />
        <span>{APP_NAME}</span>
      </Link>
      <div className="hidden flex-1 md:block">
        <SearchBar className="max-w-md" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Icon name="bell" />
        </Button>
        <Avatar alt="User account" fallback="U" size="sm" />
      </div>
    </header>
  );
}

Header.displayName = 'Header';
