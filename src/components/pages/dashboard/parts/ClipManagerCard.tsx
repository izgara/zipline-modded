import { bytes } from '@/lib/bytes';
import { Anchor, Button, Divider, Group, List, Paper, Stack, Text, Title } from '@mantine/core';
import { IconBrandWindows, IconDownload } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

type Build = { file: string; size?: number };
type Release = { version?: string; setup?: Build; msi?: Build; zip?: Build; notes?: string[] };
// `older` lists earlier versions still offered next to the current one - say,
// one that records games without hooking them - each with its own notes.
type Latest = Release & { older?: Release[] };

const DOWNLOADS = '/download/';

// The installer is served under a fixed name that each release keeps pointing
// at, so the button works even when the manifest below is missing or malformed.
// Nothing about the primary download depends on parsing anything.
const SETUP = DOWNLOADS + 'MiyavClipManager-Setup.exe';

function packages(release: Release | null | undefined, withSetup: boolean) {
  const list: { label: string; file: string; size?: number }[] = [];
  for (const [label, build] of [
    ['Installer', withSetup ? release?.setup : undefined],
    ['MSI', release?.msi],
    ['ZIP', release?.zip],
  ] as const) {
    if (build?.file) list.push({ label, file: build.file, size: build.size });
  }
  return list;
}

function Packages({ release, withSetup }: { release: Release | null; withSetup: boolean }) {
  const list = packages(release, withSetup);
  if (list.length === 0) return null;

  return (
    <Group gap='xs'>
      {list.map((pkg) => (
        <Anchor key={pkg.label} href={DOWNLOADS + pkg.file} size='xs' c='dimmed'>
          {pkg.label}
          {pkg.size ? ` (${bytes(pkg.size)})` : ''}
        </Anchor>
      ))}
    </Group>
  );
}

function Notes({ notes }: { notes?: string[] }) {
  if (!notes?.length) return null;

  return (
    <List size='sm' spacing={2} c='dimmed'>
      {notes.map((note, i) => (
        <List.Item key={i}>{note}</List.Item>
      ))}
    </List>
  );
}

// Everything the card says beyond that - the version, the size, the alternative
// packages, what changed, older versions - comes from latest.json sitting next
// to the files. Shipping a new build is then a copy plus an edit on the server,
// with no rebuild of this page and no version number compiled in to go stale.
export default function ClipManagerCard() {
  const [latest, setLatest] = useState<Latest | null>(null);

  useEffect(() => {
    let live = true;

    fetch(DOWNLOADS + 'latest.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (live) setLatest(data);
      })
      .catch(() => {});

    return () => {
      live = false;
    };
  }, []);

  const older = (latest?.older ?? []).filter((release) => release.version);

  return (
    <Paper radius='md' withBorder p='md' mt='lg'>
      <Group justify='space-between' align='flex-start' wrap='wrap' gap='md'>
        <Stack gap={4} style={{ flex: '1 1 260px' }}>
          <Group gap='xs'>
            <IconBrandWindows size='1.2rem' />
            <Title order={2}>Miyav Clip Manager</Title>
            {latest?.version && (
              <Text size='sm' c='dimmed'>
                v{latest.version}
              </Text>
            )}
          </Group>

          <Text size='sm' c='dimmed'>
            Trim your OBS and Shadowplay recordings on your own PC and upload the clip straight here.
          </Text>
        </Stack>

        <Stack gap={4} align='flex-end'>
          <Button component='a' href={SETUP} leftSection={<IconDownload size='1rem' />}>
            Download for Windows
          </Button>

          <Text size='xs' c='dimmed'>
            Installer{latest?.setup?.size ? ` · ${bytes(latest.setup.size)}` : ''}
          </Text>

          <Packages release={latest} withSetup={false} />
        </Stack>
      </Group>

      {latest?.notes?.length ? (
        <Stack gap={4} mt='sm'>
          <Text size='sm' fw={600}>
            What&apos;s new in v{latest.version}
          </Text>
          <Notes notes={latest.notes} />
        </Stack>
      ) : null}

      {older.map((release) => (
        <Stack key={release.version} gap={4}>
          <Divider my='sm' />
          <Group justify='space-between' align='center' wrap='wrap' gap='xs'>
            <Text size='sm' fw={600}>
              v{release.version}
            </Text>
            <Packages release={release} withSetup />
          </Group>
          <Notes notes={release.notes} />
        </Stack>
      ))}
    </Paper>
  );
}
