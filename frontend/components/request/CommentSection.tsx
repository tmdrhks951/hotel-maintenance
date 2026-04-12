'use client';

import { useState, useMemo } from 'react';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import { useAuthStore } from '@/stores/authStore';
import type { Comment, CommentNode, Role } from '@/types';
import { ROLE_LABEL } from '@/types';

// ================================================================
// 역할 색상
// ================================================================

const ROLE_COLOR: Record<Role, string> = {
  ADMIN: 'text-red-600',
  OPERATIONS: 'text-blue-600',
  QC: 'text-purple-600',
  VENDOR: 'text-green-600',
};

// ================================================================
// 상대 시간 포맷
// ================================================================

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ================================================================
// Flat -> Tree
// ================================================================

function buildTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  // Initialize all nodes
  for (const c of comments) {
    map.set(c.id, { ...c, children: [] });
  }

  // Build tree
  for (const c of comments) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort roots by createdAt descending (newest first)
  roots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  // Sort children by createdAt ascending
  for (const node of map.values()) {
    node.children.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  return roots;
}

// ================================================================
// Single Comment Item
// ================================================================

function CommentItem({
  comment,
  depth,
  currentUserId,
  requestId,
  onReplyOpen,
  replyingTo,
}: {
  comment: CommentNode;
  depth: number;
  currentUserId: string | undefined;
  requestId: string;
  onReplyOpen: (id: string | null) => void;
  replyingTo: string | null;
}) {
  const deleteComment = useDeleteComment(requestId);
  const createComment = useCreateComment(requestId);
  const [replyText, setReplyText] = useState('');
  const isDeleted = !!comment.deletedAt;
  const isAuthor = currentUserId === comment.author.id;
  const isReplying = replyingTo === comment.id;

  function handleReplySubmit() {
    if (!replyText.trim()) return;
    createComment.mutate(
      { content: replyText.trim(), parentId: comment.id },
      {
        onSuccess: () => {
          setReplyText('');
          onReplyOpen(null);
        },
      },
    );
  }

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''}>
      <div className="py-3">
        {isDeleted ? (
          <p className="text-sm text-gray-400 italic">삭제된 댓글입니다</p>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                {comment.author.name}
              </span>
              <span className={`text-[10px] font-semibold ${ROLE_COLOR[comment.author.role]}`}>
                {ROLE_LABEL[comment.author.role]}
              </span>
              <span className="text-xs text-gray-400">
                {relativeTime(comment.createdAt)}
              </span>
            </div>

            {/* Content */}
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {comment.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-1.5">
              {depth < 1 && (
                <button
                  type="button"
                  onClick={() => onReplyOpen(isReplying ? null : comment.id)}
                  className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                >
                  답글
                </button>
              )}
              {isAuthor && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('댓글을 삭제하시겠습니까?')) {
                      deleteComment.mutate(comment.id);
                    }
                  }}
                  disabled={deleteComment.isPending}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  삭제
                </button>
              )}
            </div>

            {/* Reply input */}
            {isReplying && (
              <div className="mt-2 flex gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="답글을 입력하세요..."
                  rows={2}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none"
                />
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={handleReplySubmit}
                    disabled={!replyText.trim() || createComment.isPending}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {createComment.isPending ? '...' : '등록'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onReplyOpen(null)}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Children */}
      {comment.children.map((child) => (
        <CommentItem
          key={child.id}
          comment={child}
          depth={depth + 1}
          currentUserId={currentUserId}
          requestId={requestId}
          onReplyOpen={onReplyOpen}
          replyingTo={replyingTo}
        />
      ))}
    </div>
  );
}

// ================================================================
// CommentSection
// ================================================================

interface Props {
  requestId: string;
}

export default function CommentSection({ requestId }: Props) {
  const user = useAuthStore((s) => s.user);
  const { data: comments, isLoading } = useComments(requestId);
  const createComment = useCreateComment(requestId);
  const [newText, setNewText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(comments ?? []), [comments]);

  function handleSubmit() {
    if (!newText.trim()) return;
    createComment.mutate(
      { content: newText.trim() },
      { onSuccess: () => setNewText('') },
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-900 mb-3">
        댓글 {comments?.length ? `(${comments.length})` : ''}
      </h3>

      {/* New comment */}
      <div className="mb-4">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="댓글을 입력하세요..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none"
        />
        <div className="flex justify-end mt-1.5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!newText.trim() || createComment.isPending}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createComment.isPending ? '등록 중...' : '댓글 등록'}
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : tree.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          아직 댓글이 없습니다.
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {tree.map((node) => (
            <CommentItem
              key={node.id}
              comment={node}
              depth={0}
              currentUserId={user?.id}
              requestId={requestId}
              onReplyOpen={setReplyingTo}
              replyingTo={replyingTo}
            />
          ))}
        </div>
      )}
    </div>
  );
}
