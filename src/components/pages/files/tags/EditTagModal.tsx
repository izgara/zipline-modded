import { Response } from '@/lib/api/response';
import { readToDataURL } from '@/lib/base64';
import { Tag } from '@/lib/db/models/tag';
import { fetchApi } from '@/lib/fetchApi';
import { colorHash } from '@/lib/theme/color';
import {
  ActionIcon,
  Avatar,
  Button,
  ColorInput,
  FileInput,
  Group,
  Modal,
  Stack,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { IconTag, IconTagOff, IconTextRecognition, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { mutate } from 'swr';

export default function EditTagModal({
  open,
  onClose,
  tag,
}: {
  tag: Tag | null;
  open: boolean;
  onClose: () => void;
}) {
  const [iconState, setIconState] = useState<{
    file: File | null;
    preview: string | null;
    remove: boolean;
  }>({ file: null, preview: null, remove: false });
  const { file: newIcon, preview: newIconPreview, remove: removeIcon } = iconState;

  const form = useForm<{
    name: string;
    color: string;
  }>({
    initialValues: {
      name: tag?.name || '',
      color: tag?.color || '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Name is required' : null),
    },
  });

  const onIconChange = async (file: File | null) => {
    const preview = file ? await readToDataURL(file) : null;
    setIconState({ file, preview, remove: file ? false : removeIcon });
  };

  const iconChanged = !!newIcon || removeIcon;

  const onSubmit = async (values: typeof form.values) => {
    const color = values.color.trim() === '' ? colorHash(values.name) : values.color.trim();

    if (!color.startsWith('#')) {
      form.setFieldError('color', 'Color must start with #');
    }

    const { data, error } = await fetchApi<Extract<Response['/api/user/tags'], Tag>>(
      `/api/user/tags/${tag!.id}`,
      'PATCH',
      {
        ...(values.name !== tag!.name && { name: values.name }),
        ...(color !== tag!.color && { color }),
        ...(newIconPreview && { icon: newIconPreview }),
        ...(removeIcon && !newIconPreview && { icon: null }),
      },
    );

    if (error) {
      showNotification({
        title: 'Failed to edit tag',
        message: error.error,
        color: 'red',
        icon: <IconTagOff size='1rem' />,
      });
    } else {
      showNotification({
        title: 'Edited tag',
        message: `Edited tag ${data!.name}`,
        color: data!.color,
        icon: <IconTag size='1rem' />,
      });

      onClose();
      form.reset();
      mutate('/api/user/tags');
    }
  };

  useEffect(() => {
    if (tag) {
      form.setFieldValue('name', tag.name);
      form.setFieldValue('color', tag.color);
      form.resetDirty();
      setIconState({ file: null, preview: null, remove: false });
    }
  }, [tag]);

  return (
    <Modal opened={open} onClose={onClose} title='Edit tag' zIndex={3000}>
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap='sm'>
          <TextInput label='Name' placeholder='Enter a name...' {...form.getInputProps('name')} />

          <ColorInput
            label='Color'
            rightSection={
              <Tooltip label='Choose a color based on the name' zIndex={3001}>
                <ActionIcon
                  variant='transparent'
                  color='white'
                  onClick={() => form.setFieldValue('color', colorHash(form.values.name))}
                >
                  <IconTextRecognition size='1rem' />
                </ActionIcon>
              </Tooltip>
            }
            popoverProps={{ zIndex: 3001 }}
            {...form.getInputProps('color')}
          />

          <Group align='flex-end'>
            <FileInput
              style={{ flex: 1 }}
              label='Icon'
              description='Optional logo/icon shown next to this tag (e.g. a game logo).'
              placeholder='Upload a new icon...'
              accept='image/*'
              value={newIcon}
              onChange={onIconChange}
              clearable
            />
            {newIconPreview ? (
              <Avatar src={newIconPreview} size='md' radius='sm' />
            ) : (
              tag?.icon &&
              !removeIcon && (
                <>
                  <Avatar src={`/api/tags/${tag.id}/icon`} size='md' radius='sm' />
                  <Tooltip label='Remove icon'>
                    <ActionIcon
                      color='red'
                      variant='light'
                      onClick={() => setIconState((s) => ({ ...s, remove: true }))}
                    >
                      <IconX size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                </>
              )
            )}
          </Group>

          <Button type='submit' variant='outline' disabled={!form.isDirty() && !iconChanged}>
            Edit tag
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
