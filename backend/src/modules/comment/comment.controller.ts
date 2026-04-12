import { Request, Response, NextFunction } from 'express';
import { getComments, createComment, deleteComment } from './comment.service';

// GET /facility-requests/:id/comments
export async function getCommentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const comments = await getComments(req.params.id);
    res.json({ success: true, data: comments });
  } catch (err) {
    next(err);
  }
}

// POST /facility-requests/:id/comments
export async function createCommentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const comment = await createComment(req.params.id, user.id, {
      content: req.body.content,
      parentId: req.body.parentId,
    });
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
}

// DELETE /facility-requests/:id/comments/:commentId
export async function deleteCommentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const result = await deleteComment(
      req.params.commentId,
      req.params.id,
      user.id,
      user.role,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
