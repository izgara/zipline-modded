import { toggleShowOnProfile } from '@/components/file/actions';
import type { File } from '@/lib/db/models/file';
import { ActionIcon, Card, Text, Tooltip } from '@mantine/core';
import { IconUserCircle } from '@tabler/icons-react';
import { useState } from 'react';
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

  const handleView = () => (onOpen ? onOpen(file.id) : setOpen(true));

  return (
    <>
      {!onOpen && <DashboardFileModal open={open} setOpen={setOpen} file={file} reduce={reduce} user={id} />}

      <FileContextMenu file={file} reduce={reduce} user={id} onView={handleView}>
        <Card shadow='md' radius='md' p={0} pos='relative' onClick={handleView} className={styles.file}>
          <DashboardFileType key={file.id} file={file} />

          {file.type?.startsWith('video/') && (
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
          )}

          {file.profileCaption && (
            <Text size='xs' c='dimmed' lineClamp={1} p={6}>
              {file.profileCaption}
            </Text>
          )}
        </Card>
      </FileContextMenu>
    </>
  );
}
