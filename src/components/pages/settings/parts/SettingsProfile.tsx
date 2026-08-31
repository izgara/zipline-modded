import { getDomain } from '@/lib/client/webDomain';
import { useUserStore } from '@/lib/client/store/user';
import { Anchor, Button, Group, Paper, Text, TextInput, Title } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCopy } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export default function SettingsProfile() {
  const user = useUserStore((state) => state.user);
  const clipboard = useClipboard();

  if (!user) return null;

  const profileUrl = getDomain(`/${user.username}`);

  const copyLink = () => {
    clipboard.copy(profileUrl);

    notifications.show({
      title: 'Copied link',
      message: (
        <Anchor component={Link} to={profileUrl}>
          {profileUrl}
        </Anchor>
      ),
      color: 'green',
      icon: <IconCopy size='1rem' />,
    });
  };

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Profile</Title>

      <Text size='sm' c='dimmed' mb='xs'>
        Share this link to show off the videos you&apos;ve marked &quot;Show on profile&quot; in your files.
      </Text>

      <Group align='flex-end'>
        <TextInput readOnly value={profileUrl} style={{ flex: 1 }} />
        <Button leftSection={<IconCopy size='1rem' />} onClick={copyLink}>
          Copy
        </Button>
      </Group>
    </Paper>
  );
}
