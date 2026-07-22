import TagPill from '@/components/pages/files/tags/TagPill';
import { useSsrData } from '@/components/ZiplineSSRProvider';
import { Response } from '@/lib/api/response';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { File } from '@/lib/db/models/file';
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
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { IconChartBar, IconEye, IconHome2, IconMovie, IconPencil, IconTags } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import ProfileClipCard from './ProfileClipCard';

type SsrData = {
  user: LimitedUser;
  files: File[];
  username: string;
  host: string;
};

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

function ClipGrid({ files, emptyText }: { files: File[]; emptyText: string }) {
  if (files.length === 0) return <EmptyState text={emptyText} />;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
      {files.map((file) => (
        <ProfileClipCard key={file.id} file={file} />
      ))}
    </SimpleGrid>
  );
}

export default function ProfileUsername() {
  const data = useSsrData<SsrData>();
  const theme = useMantineTheme() as unknown as ZiplineTheme;
  const { data: self } = useSWR<Response['/api/user']>('/api/user');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const files = data?.files ?? [];

  const tags = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
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

  const recentFiles = files.slice(0, 8);
  const taggedFiles = selectedTag ? files.filter((f) => f.tags?.some((t) => t.name === selectedTag)) : files;
  const totalViews = files.reduce((sum, f) => sum + f.views, 0);

  return (
    <Box style={{ backgroundColor: theme.mainBackgroundColor, minHeight: '100vh' }}>
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
            <Tabs.Tab value='clips' leftSection={<IconMovie size='1rem' />}>
              Clips
            </Tabs.Tab>
            <Tabs.Tab value='tagged' leftSection={<IconTags size='1rem' />}>
              Tagged
            </Tabs.Tab>
            <Tabs.Tab value='stats' leftSection={<IconChartBar size='1rem' />}>
              Stats
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='home'>
            <ClipGrid files={recentFiles} emptyText='No clips have been shared yet.' />
          </Tabs.Panel>

          <Tabs.Panel value='clips'>
            <ClipGrid files={files} emptyText='No clips have been shared yet.' />
          </Tabs.Panel>

          <Tabs.Panel value='tagged'>
            <Stack>
              {tags.length === 0 ? (
                <Text c='dimmed'>No tagged clips yet.</Text>
              ) : (
                <Group>
                  {tags.map((tag) => (
                    <TagPill
                      key={tag.name}
                      tag={tag}
                      onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                      style={{
                        cursor: 'pointer',
                        outline:
                          selectedTag === tag.name ? '2px solid var(--mantine-color-blue-5)' : undefined,
                      }}
                    />
                  ))}
                </Group>
              )}
              <ClipGrid
                files={taggedFiles}
                emptyText={selectedTag ? `No clips tagged "${selectedTag}".` : 'Pick a tag above to browse.'}
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value='stats'>
            <SimpleGrid cols={{ base: 1, sm: 2 }} mt='sm'>
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
    </Box>
  );
}
