import { bytes } from '@/lib/bytes';
import { Anchor, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconBrandWindows, IconDownload } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

type Build = { file: string; size?: number };
type Latest = { version?: string; setup?: Build; msi?: Build; zip?: Build };

const DOWNLOADS = '/download/';

// The installer is served under a fixed name that each release keeps pointing
// at, so the button works even when the manifest below is missing or malformed.
// Nothing about the primary download depends on parsing anything.
const SETUP = DOWNLOADS + 'MiyavClipManager-Setup.exe';

// Everything the card says beyond that - the version, the size, the alternative
// packages - comes from latest.json sitting next to the files. Shipping a new
// build is then a copy plus a one-line edit on the server, with no rebuild of
// this page and no version number compiled in to go stale.
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

  const alternates: { label: string; file: string; size?: number }[] = [];
  for (const [label, build] of [
    ['MSI', latest?.msi],
    ['ZIP', latest?.zip],
  ] as const) {
    if (build?.file) alternates.push({ label, file: build.file, size: build.size });
  }

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

          {alternates.length > 0 && (
            <Group gap='xs'>
              {alternates.map((alt) => (
                <Anchor key={alt.label} href={DOWNLOADS + alt.file} size='xs' c='dimmed'>
                  {alt.label}
                  {alt.size ? ` (${bytes(alt.size)})` : ''}
                </Anchor>
              ))}
            </Group>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}
