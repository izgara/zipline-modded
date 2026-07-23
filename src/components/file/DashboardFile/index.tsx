import {
  toggleShowOnProfile,
  updateFileCaption,
  updateFileMentions,
  updateFileTags,
} from '@/components/file/actions';
import TagPill from '@/components/pages/files/tags/TagPill';
import { Response } from '@/lib/api/response';
import type { File } from '@/lib/db/models/file';
import { Tag } from '@/lib/db/models/tag';
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
import { IconCheck, IconPencil, IconTags, IconUserCircle, IconUsersGroup, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import DashboardFileType from '../DashboardFileType';
import FileContextMenu from '../FileContextMenu';
import DashboardFileModal from './DashboardFileModal';

import styles from './index.module.css';

export default function DashboardFile({
  file,
  reduce,
  id,
  onOpen,
}: {
  file: File;
  reduce?: boolean;
  id?: string;
  onOpen?: (fileId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isVideo = file.type?.startsWith('video/');

  const { data: allTags } = useSWR<Extract<Response['/api/user/tags'], Tag[]>>('/api/user/tags');
  const { data: knownMentions } = useSWR<Response['/api/user/mentions']>('/api/user/mentions');

  const [tagsOpen, setTagsOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(() => file.tags?.map((t) => t.id) ?? []);
  useEffect(() => {
    setSelectedTags(file.tags?.map((t) => t.id) ?? []);
  }, [file.tags]);

  const toggleTag = (tagId: string) => {
    const next = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(next);
    updateFileTags(file, next);
  };

  const [mentionsOpen, setMentionsOpen] = useState(false);
  const [mentionsDraft, setMentionsDraft] = useState<string[]>(() => file.mentions ?? []);
  useEffect(() => {
    setMentionsDraft(file.mentions ?? []);
  }, [file.mentions]);

  const saveMentions = (value: string[]) => {
    setMentionsDraft(value);
    updateFileMentions(file, value);
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

  const saveCaption = () => {
    setCaptionOpen(false);
    if (captionDraft.trim() !== (file.profileCaption ?? '').trim()) {
      updateFileCaption(file, captionDraft);
    }
  };

  const handleView = () => (onOpen ? onOpen(file.id) : setOpen(true));

  return (
    <>
      {!onOpen && <DashboardFileModal open={open} setOpen={setOpen} file={file} reduce={reduce} user={id} />}

      <FileContextMenu file={file} reduce={reduce} user={id} onView={handleView}>
        <Card shadow='md' radius='md' p={0} pos='relative' onClick={handleView} className={styles.file}>
          <DashboardFileType key={file.id} file={file} />

          {isVideo && (
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
                          No tags yet. Create one from the Tags menu.
                        </Text>
                      )}
                    </Stack>
                  </ScrollArea.Autosize>
                </Popover.Dropdown>
              </Popover>

              <Tooltip label={file.showOnProfile ? 'Remove from profile' : 'Show on profile'}>
                <ActionIcon
                  size='sm'
                  variant='filled'
                  color={file.showOnProfile ? 'blue' : 'dark'}
                  style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleShowOnProfile(file);
                  }}
                  aria-label={file.showOnProfile ? 'Remove from profile' : 'Show on profile'}
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

          {isVideo ? (
            captionOpen ? (
              <Group gap={4} wrap='nowrap' p={6} onClick={(event) => event.stopPropagation()}>
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
                <ActionIcon
                  size='xs'
                  variant='subtle'
                  color='red'
                  onClick={cancelCaption}
                  aria-label='Cancel'
                >
                  <IconX size='0.8rem' />
                </ActionIcon>
              </Group>
            ) : (
              <Group gap={4} wrap='nowrap' p={6}>
                <Text
                  size='xs'
                  c='dimmed'
                  fs={file.profileCaption ? undefined : 'italic'}
                  lineClamp={1}
                  style={{ flex: 1 }}
                >
                  {file.profileCaption || 'Add caption…'}
                </Text>
                <ActionIcon
                  size='xs'
                  variant='subtle'
                  color='gray'
                  onClick={(event) => {
                    event.stopPropagation();
                    setCaptionOpen(true);
                  }}
                  aria-label='Edit caption'
                >
                  <IconPencil size='0.7rem' />
                </ActionIcon>
              </Group>
            )
          ) : (
            file.profileCaption && (
              <Text size='xs' c='dimmed' lineClamp={1} p={6}>
                {file.profileCaption}
              </Text>
            )
          )}
        </Card>
      </FileContextMenu>
    </>
  );
}
