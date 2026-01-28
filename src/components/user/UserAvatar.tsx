import { User } from '@/types';

interface UserAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export function UserAvatar({ user, size = 'md' }: UserAvatarProps) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center font-medium text-white`}
      style={{ backgroundColor: user.color }}
      title={user.name}
    >
      {initials}
    </div>
  );
}
