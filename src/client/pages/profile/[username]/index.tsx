import { useSsrData } from '@/components/ZiplineSSRProvider';
import { Response } from '@/lib/api/response';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { LimitedUser } from '@/lib/db/models/user';
import { ZiplineTheme } from '@/lib/theme';
import { colorHash } from '@/lib/theme/color';
import { PieChart } from '@mantine/charts';
import {
  Avatar,
  Box,
  Button,
  Center,
  Group,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import {
  IconChartBar,
  IconEye,
  IconHeart,
  IconHome2,
  IconMovie,
  IconPencil,
  IconSearch,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import ClipLightbox from './ClipLightbox';
import ProfileClipCard, { ProfileFile } from './ProfileClipCard';

type SsrData = {
  user: LimitedUser;
  files: ProfileFile[];
  username: string;
  host: string;
  openClipId: string | null;
};

// useMantineTheme() requires a MantineProvider ancestor, which only exists on the
// client (the server-side static render of this SSR app deliberately skips Root/
// MantineProvider, see ssr-profile/routes.tsx). Isolating the hook in a component
// that's only ever instantiated client-side keeps the server pass crash-free.
function ThemedBackground({ children }: { children: React.ReactNode }) {
  const theme = useMantineTheme() as unknown as ZiplineTheme;
  return <Box style={{ backgroundColor: theme.mainBackgroundColor, minHeight: '100vh' }}>{children}</Box>;
}

function PageBackground({ children }: { children: React.ReactNode }) {
  if (typeof window === 'undefined') return <Box mih='100vh'>{children}</Box>;
  return <ThemedBackground>{children}</ThemedBackground>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <Paper withBorder p='xl'>
      <Center>
        <Stack align='center'>
          <IconMovie size='3rem' stroke={1.5} />
          <Text c='dimmed'>{text}</Text>
        </Stack>
      </Center>
    </Paper>
  );
}

function ClipGrid({
  files,
  emptyText,
  onOpenClip,
}: {
  files: ProfileFile[];
  emptyText: string;
  onOpenClip: (file: ProfileFile, list: ProfileFile[]) => void;
}) {
  if (files.length === 0) return <EmptyState text={emptyText} />;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
      {files.map((file) => (
        <ProfileClipCard key={file.id} file={file} onOpen={() => onOpenClip(file, files)} />
      ))}
    </SimpleGrid>
  );
}

export default function ProfileUsername() {
  const data = useSsrData<SsrData>();
  const { data: self } = useSWR<Response['/api/user']>('/api/user');
  const [homeTagFilter, setHomeTagFilter] = useState<string | null>(null);
  const [clipsSort, setClipsSort] = useState<'newest' | 'views' | 'likes'>('newest');
  const [lightbox, setLightbox] = useState<{ file: ProfileFile; list: ProfileFile[] } | null>(null);

  const files = data?.files ?? [];

  useEffect(() => {
    if (!data?.openClipId) return;
    const file = files.find((f) => f.id === data.openClipId);
    if (file) setLightbox({ file, list: files });
  }, [data?.openClipId, files]);

  const homeFilteredFiles = homeTagFilter
    ? files.filter((f) => f.tags?.some((t) => t.name === homeTagFilter))
    : files;

  const homeFiles = useMemo(() => {
    if (clipsSort === 'newest') return homeFilteredFiles;

    const sorted = [...homeFilteredFiles];
    if (clipsSort === 'views') sorted.sort((a, b) => b.views - a.views);
    else sorted.sort((a, b) => b.likeCount - a.likeCount);

    return sorted;
  }, [homeFilteredFiles, clipsSort]);

  const tags = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; color: string; icon?: string | boolean | null }
    >();
    for (const file of files) {
      for (const tag of file.tags ?? []) {
        map.set(tag.name, tag);
      }
    }
    return Array.from(map.values());
  }, [files]);

  const viewsByTag = useMemo(() => {
    const totals = new Map<string, number>();
    for (const file of files) {
      const fileTags = file.tags?.length ? file.tags.map((t) => t.name) : ['Untagged'];
      for (const tagName of fileTags) {
        totals.set(tagName, (totals.get(tagName) ?? 0) + file.views);
      }
    }
    return Array.from(totals.entries()).map(([name, value]) => ({
      name,
      value,
      color: colorHash(name),
    }));
  }, [files]);

  useTitle(data ? `${data.user.username}'s clips` : 'Profile');

  if (!data) return null;

  const { user } = data;
  const isOwner = self?.user?.username === user.username;

  const totalViews = files.reduce((sum, f) => sum + f.views, 0);
  const totalLikes = files.reduce((sum, f) => sum + f.likeCount, 0);

  return (
    <PageBackground>
      <Paper withBorder m='md' p='md' radius='md' maw={1100} mx='auto'>
        <Group justify='space-between' align='flex-start' mb='md'>
          <Group>
            <Avatar src={`/api/users/${user.username}/avatar`} size='xl' radius='xl' />
            <Stack gap={0}>
              <Title order={2}>{user.username}</Title>
              <Text c='dimmed' size='sm'>
                {files.length} clip{files.length === 1 ? '' : 's'} shared
              </Text>
            </Stack>
          </Group>

          {isOwner && (
            <Button
              component={Link}
              to='/dashboard/settings'
              reloadDocument
              variant='outline'
              leftSection={<IconPencil size='1rem' />}
            >
              Edit Profile
            </Button>
          )}
        </Group>

        <Tabs defaultValue='home' variant='pills'>
          <Tabs.List my='sm'>
            <Tabs.Tab value='home' leftSection={<IconHome2 size='1rem' />}>
              Home
            </Tabs.Tab>
            <Tabs.Tab value='stats' leftSection={<IconChartBar size='1rem' />}>
              Stats
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='home'>
            <Stack>
              <Group justify='space-between' wrap='wrap'>
                {tags.length > 0 ? (
                  <Select
                    placeholder='Search by game/category...'
                    leftSection={<IconSearch size='1rem' />}
                    searchable
                    clearable
                    value={homeTagFilter}
                    onChange={setHomeTagFilter}
                    data={tags.map((tag) => ({ value: tag.name, label: tag.name }))}
                    renderOption={({ option }) => {
                      const tag = tags.find((t) => t.name === option.value);
                      return (
                        <Group gap='xs' wrap='nowrap'>
                          {tag?.icon && <Avatar src={`/api/tags/${tag.id}/icon`} size={18} radius='sm' />}
                          <Text size='sm'>{option.label}</Text>
                        </Group>
                      );
                    }}
                    maw={320}
                  />
                ) : (
                  <div />
                )}

                {files.length > 0 && (
                  <SegmentedControl
                    size='xs'
                    value={clipsSort}
                    onChange={(value) => setClipsSort(value as typeof clipsSort)}
                    data={[
                      { label: 'Newest', value: 'newest' },
                      { label: 'Most Views', value: 'views' },
                      { label: 'Most Likes', value: 'likes' },
                    ]}
                  />
                )}
              </Group>

              <ClipGrid
                files={homeFiles}
                emptyText={
                  homeTagFilter ? `No clips tagged "${homeTagFilter}".` : 'No clips have been shared yet.'
                }
                onOpenClip={(file, list) => setLightbox({ file, list })}
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value='stats'>
            <SimpleGrid cols={{ base: 1, sm: 3 }} mt='sm'>
              <Paper withBorder p='md' radius='md'>
                <Text c='dimmed' size='sm'>
                  Total clips
                </Text>
                <Text fw={700} size='xl'>
                  {files.length}
                </Text>
              </Paper>
              <Paper withBorder p='md' radius='md'>
                <Group gap={4} c='dimmed'>
                  <IconEye size='0.9rem' />
                  <Text size='sm'>Total views</Text>
                </Group>
                <Text fw={700} size='xl'>
                  {totalViews}
                </Text>
              </Paper>
              <Paper withBorder p='md' radius='md'>
                <Group gap={4} c='dimmed'>
                  <IconHeart size='0.9rem' />
                  <Text size='sm'>Total likes</Text>
                </Group>
                <Text fw={700} size='xl'>
                  {totalLikes}
                </Text>
              </Paper>
            </SimpleGrid>

            {viewsByTag.length > 0 && (
              <Paper withBorder p='md' radius='md' mt='sm'>
                <Text c='dimmed' size='sm' mb='xs'>
                  Views by tag
                </Text>
                <Center>
                  <PieChart
                    data={viewsByTag}
                    withLabels
                    labelsPosition='outside'
                    labelsType='value'
                    withTooltip
                    tooltipDataSource='segment'
                    pieProps={{ label: ({ name }) => name }}
                    w='100%'
                    size={220}
                  />
                </Center>
              </Paper>
            )}
          </Tabs.Panel>
        </Tabs>
      </Paper>

      {lightbox && (
        <ClipLightbox
          file={lightbox.file}
          files={lightbox.list}
          isOwner={isOwner}
          onClose={() => setLightbox(null)}
          onNavigate={(file) => setLightbox({ file, list: lightbox.list })}
        />
      )}
    </PageBackground>
  );
}
