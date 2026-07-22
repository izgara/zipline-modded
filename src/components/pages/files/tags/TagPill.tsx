import { Pill, PillProps, isLightColor } from '@mantine/core';

export default function TagPill({
  tag,
  ...other
}: Omit<PillProps, 'children' | 'bg' | 'c' | 'title'> & {
  tag: { color: string; name: string } | null;
  withRemoveButton?: boolean;
  onRemove?: () => void;
}) {
  if (!tag) return null;

  return (
    <Pill
      bg={tag.color || undefined}
      c={isLightColor(tag.color) ? 'black' : 'white'}
      title={tag.name}
      {...other}
    >
      {tag.name.length <= 24 ? tag.name : tag.name.slice(0, 21) + '...'}
    </Pill>
  );
}
