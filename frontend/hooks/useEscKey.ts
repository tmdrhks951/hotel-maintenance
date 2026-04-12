import { useEffect } from 'react';

/**
 * ESC 키를 누르면 onClose를 호출하는 훅.
 * 드로어/모달 컴포넌트 최상단에서 사용.
 */
export function useEscKey(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}
