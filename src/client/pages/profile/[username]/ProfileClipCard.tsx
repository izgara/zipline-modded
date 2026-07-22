import DashboardFileType from '@/components/file/DashboardFileType';
import RelativeDate from '@/components/RelativeDate';
import TagPill from '@/components/pages/files/tags/TagPill';
import { getDomain } from '@/lib/client/webDomain';
import { File } from '@/lib/db/models/file';
import { ActionIcon, Card, Group, Stack, Text, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEye, IconHeart, IconHeartFilled, IconMessageCircle, IconShare } from '@tabler/icons-react';
import { useFileLike } from './useFileLike';

export type ProfileFile = File & { likeCount: number; likedByMe: boolean; commentCount: number };

export function buildClipShareUrl(username: string, fileId: string) {
  return getDomain(`/profile/${username}?clip=${encodeURIComponent(fileId)}`);
}

export default function ProfileClipCard({
  file,
  username,
  onOpen,
}: {
  file: ProfileFile;
  username: string;
  onOpen: () => void;
}) {
  const { liked, likeCount, toggleLike } = useFileLike(file.id, file.likedByMe, file.likeCount);
  const clipboard = useClipboard();

  const shareClip = (event: React.MouseEvent) => {
    event.stopPropagation();
    const url = buildClipShareUrl(username, file.id);
    clipboard.copy(url);
    notifications.show({
      title: 'Copied link',
      message: url,
      color: 'green',
      icon: <IconShare size='1rem' />,
    });
  };

  return (
    <Card withBorder radius='md' padding={0}>
      <Card.Section style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={onOpen}>
        <DashboardFileType file={file} show={false} />
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

            <Group gap={2}>
              <ActionIcon
                size='sm'
                variant='subtle'
                color={liked ? 'red' : 'gray'}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleLike();
                }}
                aria-label={liked ? 'Unlike' : 'Like'}
              >
                {liked ? <IconHeartFilled size='0.9rem' /> : <IconHeart size='0.9rem' />}
              </ActionIcon>
              <Text size='xs' c='dimmed'>
                {likeCount}
              </Text>
            </Group>

            <Group gap={2} c='dimmed'>
              <IconMessageCircle size='0.9rem' />
              <Text size='xs'>{file.commentCount}</Text>
            </Group>

            <Tooltip label='Copy share link'>
              <ActionIcon size='sm' variant='subtle' color='gray' onClick={shareClip} aria-label='Share'>
                <IconShare size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Text size='xs' c='dimmed'>
            <RelativeDate date={file.createdAt} />
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
