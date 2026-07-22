import DashboardFileType from '@/components/file/DashboardFileType';
import { useSsrData } from '@/components/ZiplineSSRProvider';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { File } from '@/lib/db/models/file';
import { LimitedUser } from '@/lib/db/models/user';
import { Avatar, Center, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconMovie } from '@tabler/icons-react';
import { useState } from 'react';

type SsrData = {
  user: LimitedUser;
  files: File[];
  username: string;
  host: string;
};

function ProfileClip({ file }: { file: File }) {
  const [show, setShow] = useState(false);

  return (
    <Paper
      withBorder
      radius='md'
      style={{ overflow: 'hidden', cursor: show ? 'default' : 'pointer' }}
      onClick={() => !show && setShow(true)}
    >
      <DashboardFileType file={file} show={show} />
    </Paper>
  );
}

export default function ProfileUsername() {
  const data = useSsrData<SsrData>();
  if (!data) return null;

  const { user, files } = data;

  useTitle(`${user.username}'s clips`);

  return (
    <Stack p='md' maw={1000} mx='auto'>
      <Group>
        <Avatar src={`/api/users/${user.username}/avatar`} size='xl' radius='xl' />
        <Stack gap={0}>
          <Title order={2}>{user.username}</Title>
          <Text c='dimmed' size='sm'>
            {files.length} clip{files.length === 1 ? '' : 's'} shared
          </Text>
        </Stack>
      </Group>

      {files.length === 0 ? (
        <Paper withBorder p='xl'>
          <Center>
            <Stack align='center'>
              <IconMovie size='3rem' stroke={1.5} />
              <Text c='dimmed'>No clips have been shared yet.</Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {files.map((file) => (
            <ProfileClip key={file.id} file={file} />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
