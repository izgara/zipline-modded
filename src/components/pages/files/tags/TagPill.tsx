import { Avatar, Group, Pill, isLightColor } from '@mantine/core';
import type { CSSProperties, MouseEventHandler } from 'react';

type TagPillProps = {
  tag: { id?: string; color: string; name: string; icon?: string | boolean | null } | null;
  withRemoveButton?: boolean;
  onRemove?: () => void;
  onClick?: MouseEventHandler<HTMLDivElement>;
  style?: CSSProperties;
  className?: string;
};

export default function TagPill({ tag, withRemoveButton, onRemove, ...other }: TagPillProps) {
  if (!tag) return null;

  const label = tag.name.length <= 24 ? tag.name : tag.name.slice(0, 21) + '...';

  if (!tag.icon || !tag.id) {
    return (
      <Pill
        bg={tag.color || undefined}
        c={isLightColor(tag.color) ? 'black' : 'white'}
        title={tag.name}
        withRemoveButton={withRemoveButton}
        onRemove={onRemove}
        {...other}
      >
        {label}
      </Pill>
    );
  }

  return (
    <Group gap={4} wrap='nowrap' display='inline-flex' {...other}>
      <Avatar src={`/api/tags/${tag.id}/icon`} size={16} radius='sm' alt='' />
      <Pill
        bg={tag.color || undefined}
        c={isLightColor(tag.color) ? 'black' : 'white'}
        title={tag.name}
        withRemoveButton={withRemoveButton}
        onRemove={onRemove}
      >
        {label}
      </Pill>
    </Group>
  );
}
