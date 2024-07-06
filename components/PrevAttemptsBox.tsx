'use client';

import { format } from 'date-fns';
import { JSX, SVGProps, useEffect, useState } from 'react';
import useCsrfToken from '~/core/hooks/use-csrf-token';
import useUserId from '~/core/hooks/use-user-id';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '~/core/ui/card';
import { ScrollArea } from '~/core/ui/scroll-area';
import { Skeleton } from '~/core/ui/skeleton';

interface Attempt {
  id: string;
  selected_option: string;
  is_correct: boolean;
  marks_scored: number;
  created_at: string;
}

export default function PrevAttemptsBox({
  questionID,
}: {
  questionID: string;
}) {
  const userId = useUserId();
  const csrfToken = useCsrfToken();
  const [isLoading, setIsLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const response = await fetch('/api/pastAttemptsFetch', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({
            questionID,
            studentID: userId,
          }),
        });
        if (!response.ok) throw new Error('Failed to fetch comments');
        const data = await response.json();
        console.log('attempts data', data);
        setAttempts(data);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempts();
  }, [csrfToken, questionID, userId]);

  const calculateAveragePercentage = (attempts: Attempt[]): number => {
    if (attempts.length === 0) return 0;
    const correctAttempts = attempts.filter(
      (attempt) => attempt.is_correct,
    ).length;
    return (correctAttempts / attempts.length) * 100;
  };

  const averagePercentage = calculateAveragePercentage(attempts);

  if (isLoading) {
    return <Skeleton className="w-full h-10" />;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base font-bold">
          Previous MCQ Attempts
        </CardTitle>
        <CardDescription className="text-xs">
          Review your past performance on this MCQ.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {attempts.length > 0 ? (
          <>
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="font-medium text-sm">
                Average Correct Percentage:
              </div>
              <div className="text-2xl font-bold">
                {averagePercentage.toFixed(1)}%
              </div>
            </div>

            <ScrollArea className="h-[200px]">
              <div className="grid gap-4">
                {attempts.map((attempt, index) => (
                  <div
                    key={attempt.id}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg bg-muted p-4"
                  >
                    <div className="font-medium">
                      Attempt {attempts.length - index}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full ${
                            attempt.is_correct ? 'bg-green-500' : 'bg-red-500'
                          } text-white`}
                        >
                          {attempt.is_correct ? (
                            <CheckIcon className="h-3 w-3" />
                          ) : (
                            <XIcon className="h-3 w-3" />
                          )}
                        </div>
                        <span>Selected: {attempt.selected_option}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(
                          new Date(attempt.created_at),
                          'MMM d, yyyy HH:mm',
                        )}
                      </div>
                    </div>
                    <div
                      className={`font-medium ${
                        attempt.is_correct ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {attempt.marks_scored}/1
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="text-center text-gray-500">
            No previous attempts - this is your first attempt!
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CheckIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
