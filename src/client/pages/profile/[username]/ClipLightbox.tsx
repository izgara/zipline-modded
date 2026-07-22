import DashboardFileType from '@/components/file/DashboardFileType';
import RelativeDate from '@/components/RelativeDate';
import TagPill from '@/components/pages/files/tags/TagPill';
import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import type { FileComment } from '@/server/routes/api/files/[id]/comments';
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconHeart,
  IconHeartFilled,
  IconShare,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { buildClipShareUrl, ProfileFile } from './ProfileClipCard';
import { useFileLike } from './useFileLike';

function CommentsPanel({ file, isOwner }: { file: ProfileFile; isOwner: boolean }) {
  const { data: comments, mutate } = useSWR<Extract<Response['/api/files/[id]/comments'], FileComment[]>>(
    `/api/files/${file.id}/comments`,
  );

  const [displayName, setDisplayName] = useState('');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const submit = async () => {
    if (!displayName.trim() || !content.trim()) return;

    setPosting(true);
    const { error } = await fetchApi<Response['/api/files/[id]/comments']>(
      `/api/files/${file.id}/comments`,
      'POST',
      { displayName: displayName.trim(), content: content.trim() },
    );
    setPosting(false);

    if (error) {
      notifications.show({ title: 'Failed to post comment', message: error.error, color: 'red' });
      return;
    }

    setContent('');
    mutate();
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await fetchApi(`/api/user/files/${file.id}/comments/${commentId}`, 'DELETE');
    if (error) {
      notifications.show({ title: 'Failed to delete comment', message: error.error, color: 'red' });
      return;
    }
    mutate();
  };

  return (
    <Stack h='100%' gap='sm' p='md'>
      <Text fw={600}>Comments</Text>

      <ScrollArea style={{ flex: 1 }}>
        <Stack gap='sm'>
          {!comments?.length && (
            <Text size='sm' c='dimmed'>
              No comments yet — be the first!
            </Text>
          )}
          {comments?.map((comment) => (
            <Paper key={comment.id} withBorder p='xs' radius='sm'>
              <Group justify='space-between' align='flex-start' wrap='nowrap'>
                <Box>
                  <Group gap={6}>
                    <Text size='sm' fw={600}>
                      {comment.displayName}
                    </Text>
                    <Text size='xs' c='dimmed'>
                      <RelativeDate date={comment.createdAt} />
                    </Text>
                  </Group>
                  <Text size='sm' style={{ overflowWrap: 'anywhere' }}>
                    {comment.content}
                  </Text>
                </Box>
                {isOwner && (
                  <ActionIcon
                    size='sm'
                    variant='subtle'
                    color='red'
                    onClick={() => deleteComment(comment.id)}
                    aria-label='Delete comment'
                  >
                    <IconTrash size='0.9rem' />
                  </ActionIcon>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      </ScrollArea>

      <Divider />

      <Stack gap='xs'>
        <TextInput
          placeholder='Your name'
          maxLength={32}
          value={displayName}
          onChange={(event) => setDisplayName(event.currentTarget.value)}
        />
        <Textarea
          placeholder='Add a comment...'
          maxLength={500}
          autosize
          minRows={2}
          maxRows={4}
          value={content}
          onChange={(event) => setContent(event.currentTarget.value)}
        />
        <Button
          onClick={submit}
          loading={posting}
          disabled={!displayName.trim() || !content.trim()}
          size='sm'
        >
          Post
        </Button>
      </Stack>
    </Stack>
  );
}

export default function ClipLightbox({
  file,
  files,
  username,
  isOwner,
  onClose,
  onNavigate,
}: {
  file: ProfileFile;
  files: ProfileFile[];
  username: string;
  isOwner: boolean;
  onClose: () => void;
  onNavigate: (file: ProfileFile) => void;
}) {
  const { liked, likeCount, toggleLike } = useFileLike(file.id, file.likedByMe, file.likeCount);
  const clipboard = useClipboard();
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    setAspectRatio(null);
  }, [file.id]);

  const index = files.findIndex((f) => f.id === file.id);
  const prev = index > 0 ? files[index - 1] : null;
  const next = index >= 0 && index < files.length - 1 ? files[index + 1] : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && prev) onNavigate(prev);
      if (event.key === 'ArrowRight' && next) onNavigate(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prev, next, onClose, onNavigate]);

  const shareClip = () => {
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
    <Box
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(calc(0.375rem * var(--mantine-scale)))',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <ActionIcon
        variant='filled'
        color='dark'
        size='lg'
        style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}
        onClick={onClose}
        aria-label='Close'
      >
        <IconX size='1.2rem' />
      </ActionIcon>

      {prev && (
        <ActionIcon
          variant='filled'
          color='dark'
          size='xl'
          style={{ position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)', zIndex: 2 }}
          onClick={(event) => {
            event.stopPropagation();
            onNavigate(prev);
          }}
          aria-label='Previous clip'
        >
          <IconChevronLeft size='1.5rem' />
        </ActionIcon>
      )}

      {next && (
        <ActionIcon
          variant='filled'
          color='dark'
          size='xl'
          style={{ position: 'absolute', top: '50%', right: 16, transform: 'translateY(-50%)', zIndex: 2 }}
          onClick={(event) => {
            event.stopPropagation();
            onNavigate(next);
          }}
          aria-label='Next clip'
        >
          <IconChevronRight size='1.5rem' />
        </ActionIcon>
      )}

      <Group
        wrap='nowrap'
        align='stretch'
        gap={0}
        style={{ width: 'min(1400px, 96vw)', maxHeight: '90vh', margin: 'auto' }}
        onClick={(event) => event.stopPropagation()}
      >
        <Box
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--mantine-color-body)',
          }}
        >
          <Box
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: aspectRatio ? `${aspectRatio}` : '16 / 9',
              background: 'black',
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            <DashboardFileType
              key={file.id}
              file={file}
              show
              fullscreen
              muted={false}
              onVideoMetadata={(width, height) => setAspectRatio(width / height)}
            />
          </Box>

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
                    onClick={toggleLike}
                    aria-label={liked ? 'Unlike' : 'Like'}
                  >
                    {liked ? <IconHeartFilled size='0.9rem' /> : <IconHeart size='0.9rem' />}
                  </ActionIcon>
                  <Text size='xs' c='dimmed'>
                    {likeCount}
                  </Text>
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
        </Box>

        <Box
          style={{
            width: 320,
            flexShrink: 0,
            background: 'var(--mantine-color-body)',
            borderLeft: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <CommentsPanel file={file} isOwner={isOwner} />
        </Box>
      </Group>
    </Box>
  );
}
