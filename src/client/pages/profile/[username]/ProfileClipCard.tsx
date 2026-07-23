import DashboardFileType from '@/components/file/DashboardFileType';
import RelativeDate from '@/components/RelativeDate';
import TagPill from '@/components/pages/files/tags/TagPill';
import { Response } from '@/lib/api/response';
import { getDomain } from '@/lib/client/webDomain';
import { File } from '@/lib/db/models/file';
import { Tag } from '@/lib/db/models/tag';
import { fetchApi } from '@/lib/fetchApi';
import {
  ActionIcon,
  Card,
  Checkbox,
  Group,
  Popover,
  ScrollArea,
  Stack,
  TagsInput,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconEye,
  IconHeart,
  IconHeartFilled,
  IconMessageCircle,
  IconPencil,
  IconShare,
  IconTags,
  IconUserCircle,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useFileLike } from './useFileLike';

export type ProfileFile = File & { likeCount: number; likedByMe: boolean; commentCount: number };

export function buildClipShareUrl(file: ProfileFile) {
  return file.url ? getDomain(file.url) : getDomain(`/view/${file.name}`);
}

export default function ProfileClipCard({
  file,
  onOpen,
  isOwner,
  onUpdate,
}: {
  file: ProfileFile;
  onOpen: () => void;
  isOwner?: boolean;
  onUpdate?: (fileId: string, patch: Partial<ProfileFile> & { showOnProfile?: boolean }) => void;
}) {
  const { liked, likeCount, toggleLike } = useFileLike(file.id, file.likedByMe, file.likeCount);
  const clipboard = useClipboard();

  const { data: allTags } = useSWR<Extract<Response['/api/user/tags'], Tag[]>>(
    isOwner ? '/api/user/tags' : null,
  );
  const { data: knownMentions } = useSWR<Response['/api/user/mentions']>(
    isOwner ? '/api/user/mentions' : null,
  );

  const [tagsOpen, setTagsOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(() => file.tags?.map((t) => t.id) ?? []);
  useEffect(() => {
    setSelectedTags(file.tags?.map((t) => t.id) ?? []);
  }, [file.tags]);

  const toggleTag = async (tagId: string) => {
    const next = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(next);

    const { data, error } = await fetchApi<Response['/api/user/files/[id]']>(
      `/api/user/files/${file.id}`,
      'PATCH',
      { tags: next },
    );

    if (error) {
      notifications.show({ title: 'Error updating tags', message: error.error, color: 'red' });
    } else if (data) {
      onUpdate?.(file.id, { tags: data.tags });
    }
  };

  const [showOnProfile, setShowOnProfile] = useState(file.showOnProfile);

  const toggleProfileVisibility = async () => {
    const next = !showOnProfile;
    setShowOnProfile(next);

    const { error } = await fetchApi<Response['/api/user/files/[id]']>(
      `/api/user/files/${file.id}`,
      'PATCH',
      {
        showOnProfile: next,
      },
    );

    if (error) {
      setShowOnProfile(!next);
      notifications.show({ title: 'Error updating visibility', message: error.error, color: 'red' });
    } else {
      onUpdate?.(file.id, { showOnProfile: next });
    }
  };

  const [mentionsOpen, setMentionsOpen] = useState(false);
  const [mentionsDraft, setMentionsDraft] = useState<string[]>(() => file.mentions ?? []);
  useEffect(() => {
    setMentionsDraft(file.mentions ?? []);
  }, [file.mentions]);

  const saveMentions = async (value: string[]) => {
    setMentionsDraft(value);

    const { error } = await fetchApi<Response['/api/user/files/[id]']>(
      `/api/user/files/${file.id}`,
      'PATCH',
      {
        mentions: value,
      },
    );

    if (error) {
      notifications.show({ title: 'Error updating mentions', message: error.error, color: 'red' });
    } else {
      onUpdate?.(file.id, { mentions: value });
    }
  };

  const [captionOpen, setCaptionOpen] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(file.profileCaption ?? '');
  useEffect(() => {
    setCaptionDraft(file.profileCaption ?? '');
  }, [file.profileCaption]);

  const cancelCaption = () => {
    setCaptionDraft(file.profileCaption ?? '');
    setCaptionOpen(false);
  };

  const saveCaption = async () => {
    setCaptionOpen(false);
    const trimmed = captionDraft.trim();
    if (trimmed === (file.profileCaption ?? '').trim()) return;

    const { error } = await fetchApi<Response['/api/user/files/[id]']>(
      `/api/user/files/${file.id}`,
      'PATCH',
      {
        profileCaption: trimmed === '' ? null : trimmed,
      },
    );

    if (error) {
      notifications.show({ title: 'Error updating caption', message: error.error, color: 'red' });
    } else {
      onUpdate?.(file.id, { profileCaption: trimmed === '' ? null : trimmed });
    }
  };

  const shareClip = (event: React.MouseEvent) => {
    event.stopPropagation();
    const url = buildClipShareUrl(file);
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
      <Card.Section style={{ overflow: 'hidden', cursor: 'pointer', position: 'relative' }} onClick={onOpen}>
        <DashboardFileType file={file} show={false} />

        {isOwner && (
          <>
            <Popover
              opened={tagsOpen}
              onChange={setTagsOpen}
              position='bottom-start'
              withinPortal
              zIndex={250}
            >
              <Popover.Target>
                <Tooltip label='Select game/tags'>
                  <ActionIcon
                    size='sm'
                    variant='filled'
                    color={selectedTags.length ? 'blue' : 'dark'}
                    style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setTagsOpen((v) => !v);
                    }}
                    aria-label='Select tags'
                  >
                    <IconTags size='0.9rem' />
                  </ActionIcon>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown onClick={(event) => event.stopPropagation()} p='xs'>
                <ScrollArea.Autosize mah={220} w={200}>
                  <Stack gap={4}>
                    {allTags?.length ? (
                      allTags.map((tag) => (
                        <Group
                          key={tag.id}
                          gap='xs'
                          wrap='nowrap'
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleTag(tag.id)}
                        >
                          <Checkbox
                            checked={selectedTags.includes(tag.id)}
                            onChange={() => toggleTag(tag.id)}
                            size='xs'
                          />
                          <TagPill tag={tag} />
                        </Group>
                      ))
                    ) : (
                      <Text size='xs' c='dimmed'>
                        No tags yet. Create one from the dashboard.
                      </Text>
                    )}
                  </Stack>
                </ScrollArea.Autosize>
              </Popover.Dropdown>
            </Popover>

            <Tooltip label='Remove from profile'>
              <ActionIcon
                size='sm'
                variant='filled'
                color='blue'
                style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleProfileVisibility();
                }}
                aria-label='Remove from profile'
              >
                <IconUserCircle size='0.9rem' />
              </ActionIcon>
            </Tooltip>

            <Popover
              opened={mentionsOpen}
              onChange={setMentionsOpen}
              position='top-end'
              withinPortal
              zIndex={250}
            >
              <Popover.Target>
                <Tooltip label='Mentions'>
                  <ActionIcon
                    size='sm'
                    variant='filled'
                    color={mentionsDraft.length ? 'blue' : 'dark'}
                    style={{ position: 'absolute', bottom: 6, right: 6, zIndex: 2 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMentionsOpen((v) => !v);
                    }}
                    aria-label='Edit mentions'
                  >
                    <IconUsersGroup size='0.9rem' />
                  </ActionIcon>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown onClick={(event) => event.stopPropagation()} p='xs' w={220}>
                <TagsInput
                  size='xs'
                  placeholder='Search or type a name...'
                  maxTags={10}
                  data={knownMentions ?? []}
                  value={mentionsDraft}
                  onChange={saveMentions}
                />
              </Popover.Dropdown>
            </Popover>
          </>
        )}
      </Card.Section>

      <Stack gap={4} p='sm'>
        {isOwner && captionOpen ? (
          <Group gap={4} wrap='nowrap'>
            <Textarea
              autoFocus
              size='xs'
              style={{ flex: 1 }}
              autosize
              minRows={1}
              maxRows={3}
              maxLength={280}
              value={captionDraft}
              onChange={(event) => setCaptionDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  saveCaption();
                } else if (event.key === 'Escape') {
                  cancelCaption();
                }
              }}
            />
            <ActionIcon
              size='xs'
              variant='subtle'
              color='green'
              onClick={saveCaption}
              aria-label='Save caption'
            >
              <IconCheck size='0.8rem' />
            </ActionIcon>
            <ActionIcon size='xs' variant='subtle' color='red' onClick={cancelCaption} aria-label='Cancel'>
              <IconX size='0.8rem' />
            </ActionIcon>
          </Group>
        ) : (
          <Group gap={4} wrap='nowrap'>
            <Text fw={600} lineClamp={1} style={{ flex: 1 }}>
              {file.profileCaption || file.originalName || file.name}
            </Text>
            {isOwner && (
              <ActionIcon
                size='xs'
                variant='subtle'
                color='gray'
                onClick={() => setCaptionOpen(true)}
                aria-label='Edit caption'
              >
                <IconPencil size='0.7rem' />
              </ActionIcon>
            )}
          </Group>
        )}

        {!!file.tags?.length && (
          <Group gap={4}>
            {file.tags.map((tag) => (
              <TagPill key={tag.id} tag={tag} />
            ))}
          </Group>
        )}

        {!!file.mentions?.length && (
          <Text size='xs' c='dimmed' lineClamp={1}>
            with {file.mentions.join(', ')}
          </Text>
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
