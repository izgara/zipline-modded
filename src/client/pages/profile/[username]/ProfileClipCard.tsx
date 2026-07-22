import DashboardFileType from '@/components/file/DashboardFileType';
import RelativeDate from '@/components/RelativeDate';
import TagPill from '@/components/pages/files/tags/TagPill';
import { Response } from '@/lib/api/response';
import { File } from '@/lib/db/models/file';
import { fetchApi } from '@/lib/fetchApi';
import { ActionIcon, Card, Group, Stack, Text } from '@mantine/core';
import { IconEye, IconHeart, IconHeartFilled } from '@tabler/icons-react';
import { useState } from 'react';

export type ProfileFile = File & { likeCount: number; likedByMe: boolean };

export default function ProfileClipCard({ file }: { file: ProfileFile }) {
  const [show, setShow] = useState(false);
  const [liked, setLiked] = useState(file.likedByMe);
  const [likeCount, setLikeCount] = useState(file.likeCount);

  const toggleLike = async (event: React.MouseEvent) => {
    event.stopPropagation();

    const prevLiked = liked;
    const prevCount = likeCount;

    setLiked(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));

    const { data, error } = await fetchApi<Response['/api/files/[id]/like']>(
      `/api/files/${file.id}/like`,
      'POST',
    );

    if (error || !data) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      return;
    }

    setLiked(data.liked);
    setLikeCount(data.likes);
  };

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
          <Group gap='sm'>
            <Group gap={4} c='dimmed'>
              <IconEye size='0.9rem' />
              <Text size='xs'>{file.views}</Text>
            </Group>

            <ActionIcon
              size='sm'
              variant='subtle'
              color={liked ? 'red' : 'gray'}
              onClick={toggleLike}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              {liked ? <IconHeartFilled size='0.9rem' /> : <IconHeart size='0.9rem' />}
            </ActionIcon>
            <Text size='xs' c='dimmed' ml={-6}>
              {likeCount}
            </Text>
          </Group>

          <Text size='xs' c='dimmed'>
            <RelativeDate date={file.createdAt} />
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
