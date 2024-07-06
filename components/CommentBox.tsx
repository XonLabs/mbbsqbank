import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '~/core/ui/Avatar';
import { Button } from '~/core/ui/ShadCNButton';
import Textarea from '~/core/ui/Textarea';
import useUserId from '~/core/hooks/use-user-id';
import useCsrfToken from '~/core/hooks/use-csrf-token';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/core/ui/card';
import { Skeleton } from '~/core/ui/skeleton';

interface Comment {
  id: string;
  student_id: string;
  comment_text: string;
  created_at: string;
}

export default function Component({ questionID }: { questionID: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userId = useUserId();
  const csrfToken = useCsrfToken();

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({
            questionID,
          }),
        });
        if (!response.ok) throw new Error('Failed to fetch comments');
        const data = await response.json();
        setComments(data);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [csrfToken, questionID]);

  if (isLoading) {
    return <Skeleton className="w-full h-10" />;
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/commentsAdd', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionID,
          studentID: userId,
          commentText: newComment.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to submit comment');
      const addedComment = await response.json();
      setComments((prevComments) => [addedComment, ...prevComments]);
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle the change in instructions
  const handleCommentTextAreaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setNewComment(event.target.value);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base font-bold">Suggestions</CardTitle>
        <CardDescription className="text-xs">
          (All comments are anonymized. Please suggest edits if you spot any
          mistakes. 🙏)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mx-auto space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-4">
                  <Avatar className="h-10 w-10 shrink-0 border">
                    {/* <AvatarImage src="/placeholder-user.jpg" /> */}
                    <AvatarFallback>
                      {comment.student_id.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">
                        Anonymous {comment.student_id.slice(0, 2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap">
                      {comment.comment_text}
                    </div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="text-center text-sm text-muted-foreground">
                  No suggestions yet. Be the first to suggest an edit!
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-4">
            <h2 className="font-bold">Add a suggestion</h2>
            <form className="grid gap-4" onSubmit={handleSubmitComment}>
              <Textarea
                placeholder="Write your suggestion here..."
                className="min-h-[100px]"
                value={newComment}
                onChange={handleCommentTextAreaChange}
                disabled={isSubmitting}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
