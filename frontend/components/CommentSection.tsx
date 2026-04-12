'use client';

import { useState } from 'react';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import type { Comment, CommentNode, Role } from '@/types';

// ================================================================
// 트리 빌드
// ================================================================

function buildTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, children: [] });
  }

  for (const c of comments) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else if (!c.parentId) {
      roots.push(node);
    }
  }

  return roots;
}

// ================================================================
// 개별 댓글 노드
// ================================================================

function CommentItem({
  node,
  depth,
  currentUserId,
  currentRole,
  replyingTo,
  replyContent,
  onReplyStart,
  onReplyCancel,
  onReplyContentChange,
  onReplySubmit,
  onDelete,
  isPending,
}: {
  node: CommentNode;
  depth: number;
  currentUserId: string;
  currentRole: Role;
  replyingTo: string | null;
  replyContent: string;
  onReplyStart: (id: string) => void;
  onReplyCancel: () => void;
  onReplyContentChange: (v: string) => void;
  onReplySubmit: (parentId: string) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const isDeleted = !!node.deletedAt;
  const canDelete = !isDeleted && (node.author.id === currentUserId || currentRole === 'ADMIN');
  const canReply = !isDeleted && depth < 2;

  return (
    <div className={depth > 0 ? 'ml-5 border-l border-gray-100 pl-3' : ''}>
      <div className="py-2">
        {isDeleted ? (
          <p className="text-xs text-gray-300 italic">[삭제된 댓글]</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-700">{node.author.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 rounded px-1">{node.author.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300">
                  {new Date(node.createdAt).toLocaleString('ko-KR', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {canDelete && (
                  <button
                    onClick={() => onDelete(node.id)}
                    className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-800">{node.content}</p>
            {canReply && (
              <button
                onClick={() => onReplyStart(node.id)}
                className="text-xs text-blue-500 mt-1 hover:text-blue-700"
              >
                답글
              </button>
            )}
            {replyingTo === node.id && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => onReplyContentChange(e.target.value)}
                  placeholder="답글 입력"
                  autoFocus
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) onReplySubmit(node.id);
                    if (e.key === 'Escape') onReplyCancel();
                  }}
                />
                <button
                  onClick={() => onReplySubmit(node.id)}
                  disabled={isPending || !replyContent.trim()}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
                >
                  작성
                </button>
                <button
                  onClick={onReplyCancel}
                  className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  취소
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {node.children.map((child) => (
        <CommentItem
          key={child.id}
          node={child}
          depth={depth + 1}
          currentUserId={currentUserId}
          currentRole={currentRole}
          replyingTo={replyingTo}
          replyContent={replyContent}
          onReplyStart={onReplyStart}
          onReplyCancel={onReplyCancel}
          onReplyContentChange={onReplyContentChange}
          onReplySubmit={onReplySubmit}
          onDelete={onDelete}
          isPending={isPending}
        />
      ))}
    </div>
  );
}

// ================================================================
// CommentSection (export)
// ================================================================

export function CommentSection({
  requestId,
  currentUserId,
  currentRole,
}: {
  requestId: string;
  currentUserId: string;
  currentRole: Role;
}) {
  const { data: comments = [] } = useComments(requestId);
  const createMutation = useCreateComment(requestId);
  const deleteMutation = useDeleteComment(requestId);

  const [rootContent, setRootContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const tree = buildTree(comments);
  const activeCount = comments.filter((c) => !c.deletedAt).length;

  async function handleRootSubmit() {
    if (!rootContent.trim()) return;
    try {
      await createMutation.mutateAsync({ content: rootContent.trim() });
      setRootContent('');
    } catch {
      // silent — TanStack Query 에러는 컴포넌트 밖에서 처리하지 않음
    }
  }

  async function handleReplySubmit(parentId: string) {
    if (!replyContent.trim()) return;
    try {
      await createMutation.mutateAsync({ content: replyContent.trim(), parentId });
      setReplyContent('');
      setReplyingTo(null);
    } catch {
      // silent
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        댓글{activeCount > 0 ? ` (${activeCount})` : ''}
      </h4>

      {/* 트리 */}
      {tree.length === 0 ? (
        <p className="text-xs text-gray-300 mb-3 text-center py-2">댓글이 없습니다</p>
      ) : (
        <div className="mb-3 divide-y divide-gray-50">
          {tree.map((node) => (
            <CommentItem
              key={node.id}
              node={node}
              depth={0}
              currentUserId={currentUserId}
              currentRole={currentRole}
              replyingTo={replyingTo}
              replyContent={replyContent}
              onReplyStart={(id) => { setReplyingTo(id); setReplyContent(''); }}
              onReplyCancel={() => setReplyingTo(null)}
              onReplyContentChange={setReplyContent}
              onReplySubmit={handleReplySubmit}
              onDelete={(id) => deleteMutation.mutate(id)}
              isPending={createMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* 루트 댓글 작성 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={rootContent}
          onChange={(e) => setRootContent(e.target.value)}
          placeholder="댓글 작성..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleRootSubmit();
          }}
        />
        <button
          onClick={handleRootSubmit}
          disabled={createMutation.isPending || !rootContent.trim()}
          className="px-3 py-2 text-sm bg-gray-800 text-white rounded disabled:opacity-50 hover:bg-gray-700"
        >
          작성
        </button>
      </div>
    </div>
  );
}
