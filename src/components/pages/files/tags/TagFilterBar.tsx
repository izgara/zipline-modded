import { Response } from '@/lib/api/response';
import { Tag } from '@/lib/db/models/tag';
import { Avatar, Badge, Button, Group, isLightColor, UnstyledButton } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

// Fork: a row of the games/tags on the user's own files, most used first. One click
// shows only that tag's files; the open file's arrows then step through just those.
const SHOWN_AT_FIRST = 12;
// Same value the files API takes in place of tag ids.
const UNTAGGED = 'untagged';

function TagButton({
  tag,
  count,
  selected,
  onClick,
}: {
  tag: { id: string; name: string; color: string; icon?: string | boolean | null };
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  const color = tag.color || 'var(--mantine-color-blue-filled)';
  const text = selected && tag.color ? (isLightColor(tag.color) ? 'black' : 'white') : undefined;

  return (
    <UnstyledButton
      onClick={onClick}
      aria-pressed={selected}
      title={tag.name}
      px='sm'
      py={6}
      style={{
        borderRadius: 999,
        border: `1px solid ${color}`,
        background: selected ? color : 'transparent',
        color: text,
        transition: 'background 120ms',
      }}
    >
      <Group gap={6} wrap='nowrap'>
        {tag.icon && <Avatar src={`/api/tags/${tag.id}/icon`} size={18} radius='sm' alt='' />}
        <span style={{ fontSize: 'var(--mantine-font-size-sm)', whiteSpace: 'nowrap' }}>{tag.name}</span>
        <Badge size='sm' variant={selected ? 'white' : 'light'} color='gray' circle={count < 10}>
          {count}
        </Badge>
      </Group>
    </UnstyledButton>
  );
}

export default function TagFilterBar({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (tagId: string | null) => void;
}) {
  const { t } = useTranslation('files');
  const [expanded, setExpanded] = useState(false);
  const { data: tags } = useSWR<Extract<Response['/api/user/tags'], Tag[]>>('/api/user/tags');
  const { data: counts } = useSWR<Record<string, number>>('/api/user/files/tag-counts');

  if (!tags || !counts) return null;

  const used = tags
    .filter((tag) => (counts[tag.id] ?? 0) > 0 || tag.id === value)
    .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.name.localeCompare(b.name));
  const untagged = counts[UNTAGGED] ?? 0;
  if (used.length === 0 && untagged === 0 && value !== UNTAGGED) return null;

  let shown = expanded ? used : used.slice(0, SHOWN_AT_FIRST);
  const selected = used.find((tag) => tag.id === value);
  if (selected && !shown.includes(selected)) shown = [...shown, selected];

  return (
    <Group gap='xs' my='sm' wrap='wrap'>
      <Button
        size='compact-sm'
        radius='xl'
        variant={value ? 'default' : 'filled'}
        onClick={() => onChange(null)}
      >
        {t('views.allTags')}
      </Button>

      {(untagged > 0 || value === UNTAGGED) && (
        <TagButton
          tag={{ id: UNTAGGED, name: t('views.untagged'), color: '#868e96' }}
          count={untagged}
          selected={value === UNTAGGED}
          onClick={() => onChange(value === UNTAGGED ? null : UNTAGGED)}
        />
      )}

      {shown.map((tag) => (
        <TagButton
          key={tag.id}
          tag={tag}
          count={counts[tag.id] ?? 0}
          selected={tag.id === value}
          onClick={() => onChange(tag.id === value ? null : tag.id)}
        />
      ))}

      {used.length > SHOWN_AT_FIRST && (
        <Button size='compact-sm' radius='xl' variant='subtle' onClick={() => setExpanded((open) => !open)}>
          {expanded ? t('views.fewerTags') : t('views.moreTags', { count: used.length - SHOWN_AT_FIRST })}
        </Button>
      )}
    </Group>
  );
}
