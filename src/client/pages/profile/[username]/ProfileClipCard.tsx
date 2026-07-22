import DashboardFileType from '@/components/file/DashboardFileType';
import RelativeDate from '@/components/RelativeDate';
import TagPill from '@/components/pages/files/tags/TagPill';
import { File } from '@/lib/db/models/file';
import { Card, Group, Stack, Text } from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { useState } from 'react';

export default function ProfileClipCard({ file }: { file: File }) {
  const [show, setShow] = useState(false);

  return (
    <Card withBorder radius='md' padding={0}>
      <Card.Section
        style={{ overflow: 'hidden', cursor: show ? 'default' : 'pointer' }}
        onClick={() => !show && setShow(true)}
      >
        <DashboardFileType file={file} show={show} />
      </Card.Section>

      <Stack gap={4} p='sm'>
        <Text fw={600} lineClamp={1}>
          {file.profileCaption || file.originalName || file.name}
        </Text>

        {!!file.tags?.length && (
          <Group gap={4}>
            {file.tags.map((tag) => (
              <TagPill key={tag.id} tag={tag} />
            ))}
          </Group>
        )}

        <Group justify='space-between' mt={4}>
          <Group gap={4} c='dimmed'>
            <IconEye size='0.9rem' />
            <Text size='xs'>{file.views}</Text>
          </Group>
          <Text size='xs' c='dimmed'>
            <RelativeDate date={file.createdAt} />
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
