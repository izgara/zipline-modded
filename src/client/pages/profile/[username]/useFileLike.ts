import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useState } from 'react';

export function useFileLike(fileId: string, initialLiked: boolean, initialCount: number) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);

  const toggleLike = async () => {
    const prevLiked = liked;
    const prevCount = likeCount;

    setLiked(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));

    const { data, error } = await fetchApi<Response['/api/files/[id]/like']>(
      `/api/files/${fileId}/like`,
      'POST',
    );

    if (error || !data) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      return;
    }

    setLiked(data.liked);
    setLikeCount(data.likes);
  };

  return { liked, likeCount, toggleLike };
}
