'use client';

import { Space, Check } from 'lucide-react';
import { JSX, SVGProps, SetStateAction, useState } from 'react';
import Button from '~/core/ui/Button';
import Label from '~/core/ui/Label';
import { RadioGroup, RadioGroupItem } from '~/core/ui/RadioGroup';
import { Badge } from '~/core/ui/ShadCNBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/core/ui/ShadCNTooltip';
import Textarea from '~/core/ui/Textarea';
import { useCompletion } from 'ai/react';

type Question = {
  id: string;
  question_text: string | null;
  max_marks: number | null;
  question_type: string;
  tag: string | null;
  options?: Record<string, string>;
  difficulty: number | null;
  updated_at: string | null;
  correct_answer: string | null;
  explanation: string | null;
  image_url_question: string | null;
  image_url_answer: string | null;
};

import { useEffect } from 'react';
import { appendResponse, updateQuestion } from '../actions';
import useUserId from '~/core/hooks/use-user-id';
import { toast } from 'sonner';
import { parse } from 'best-effort-json-parser';
import { useRouter } from 'next/navigation';
import useCsrfToken from '~/core/hooks/use-csrf-token';
import useUserSession from '~/core/hooks/use-user-session';
import CommentBox from './CommentBox';
import { ScrollArea } from '~/core/ui/scroll-area';
import PrevAttemptsBox from './PrevAttemptsBox';
import Image from 'next/image';

type EditableQuestionFields = {
  question_text: string;
  correct_answer: string;
  explanation: string;
  max_marks: number;
  options?: Record<string, string>;
  image_url_question?: string | null;
};

export default function ReviewScreen({
  selectedTopics,
  settings,
  questions,
  onReviewCompleted,
}: {
  selectedTopics: string[];
  settings: {
    core: boolean;
    medium: boolean;
    hard: boolean;
    notAnswered: boolean;
    incorrectlyAnswered: boolean;
    correctlyAnswered: boolean;
  };
  questions: Question[];
  onReviewCompleted: () => void;
}) {
  const [finishedGenerating, setFinishedGenerating] = useState(false);
  const [generatedFeedback, setGeneratedFeedback] = useState({
    student_mark: 0,
    mark_distribution: '',
    did_well: '',
    did_not_well: '',
  });
  const [shouldAppendResponse, setShouldAppendResponse] = useState(false);
  const csrfToken = useCsrfToken();
  const userSession = useUserSession();
  const userEmail = userSession?.auth.user.email;
  const [answeredCorrectly, setAnsweredCorrectly] = useState<Set<string>>(
    new Set(),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<EditableQuestionFields>({
    question_text: '',
    correct_answer: '',
    explanation: '',
    max_marks: 0,
  });

  const userId = useUserId();
  const router = useRouter();

  console.log('questions', questions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<{
    key: string;
    value: string;
  }>({ key: '', value: '' });
  const [saqAnswer, setSaqAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<
    Record<string, string>
  >({});
  const currentQuestion = questions[currentQuestionIndex];
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [isReviewCompleted, setIsReviewCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalPercentage, setFinalPercentage] = useState(0);
  const ADMIN_EMAILS = [
    'admin@pdf2-anki.com',
    'pdf2anki@gmail.com',
    'thetechjason@gmail.com',
    'jason@xon.so',
    'hi@xon.so',
  ];

  useEffect(() => {
    if (currentQuestion?.options) {
      const entries = Object.entries(currentQuestion.options);
      const shuffled = entries.sort(() => Math.random() - 0.5);
      setShuffledOptions(Object.fromEntries(shuffled));
    }
  }, [currentQuestion]);

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowAnswer(false);
    } else {
      setIsReviewCompleted(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowAnswer(false);
    }
  };

  const toggleEditMode = () => {
    if (isEditing) {
      // Save changes
      updateQuestion(currentQuestion.id, editedQuestion)
        .then(() => {
          toast.success('Question updated successfully');
          setIsEditing(false);
        })
        .catch((error) => {
          console.error('Failed to update question:', error);
          toast.error('Failed to update question. Please try again.');
        });
    } else {
      // Enter edit mode and prefill the form
      setEditedQuestion({
        question_text: currentQuestion.question_text || '',
        correct_answer: currentQuestion.correct_answer || '',
        explanation: currentQuestion.explanation || '',
        max_marks: currentQuestion.max_marks || 0,
        options: currentQuestion.options,
        image_url_question: currentQuestion.image_url_question,
      });
      setIsEditing(true);
    }
  };
  // Function to handle the change in instructions
  const handleSAQTextAreaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setSaqAnswer(event.target.value);
  };

  const handleCheckAnswer = async () => {
    setShowAnswer(true);
    console.log('selectedAnswer', selectedAnswer);
    console.log('currentQuestion', currentQuestion);
    let isCorrect = false;

    if (currentQuestion?.question_type === 'mcq') {
      isCorrect = selectedAnswer.value === currentQuestion.correct_answer;
      if (userId) {
        await appendResponse(
          userId,
          currentQuestion.id,
          selectedAnswer.value,
          null,
          isCorrect,
          isCorrect ? 1 : 0,
        );
        setCompletedQuestions((prev) => new Set(prev).add(currentQuestion.id));
        if (isCorrect) {
          setAnsweredCorrectly((prev) => new Set(prev).add(currentQuestion.id));
        }
      } else {
        console.log('userId not found');
        toast.error('Please login to continue');
      }
    } else if (currentQuestion?.question_type === 'saq') {
      setCompletedQuestions((prev) => new Set(prev).add(currentQuestion.id));
      onRunClick();
    }
  };

  // AI MARKING STUFF FOR SAQ

  const { complete, completion, isLoading, stop } = useCompletion({
    api: '/api/saqcheck',
    onResponse: (response) => {
      console.log('response', response);
    },
    onFinish: async () => {
      toast.success('Successfully completed marking.');
      setFinishedGenerating(true);
      console.log('generatedFeedback', generatedFeedback);
      setShouldAppendResponse(true);
    },
    onError: (error) => {
      toast.error('Something went wrong. Please try again.');
    },
  });

  useEffect(() => {
    if (completion.length > 0) {
      setGeneratedFeedback(parse(completion));
    }
  }, [completion]);

  useEffect(() => {
    if (shouldAppendResponse && userId) {
      const isCorrect =
        generatedFeedback.student_mark === currentQuestion.max_marks;
      appendResponse(
        userId,
        currentQuestion.id,
        null,
        saqAnswer,
        isCorrect,
        generatedFeedback.student_mark,
      )
        .then(() => {
          setShouldAppendResponse(false); // Reset to prevent multiple calls
          if (isCorrect) {
            setAnsweredCorrectly((prev) =>
              new Set(prev).add(currentQuestion.id),
            );
          }
        })
        .catch((error) => {
          console.error('Failed to append response:', error);
          toast.error('Failed to save response. Please try again.');
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAppendResponse, generatedFeedback, userId]);

  const onRunClick = () => {
    complete('', {
      headers: {
        'X-CSRF-Token': csrfToken,
      },
      body: {
        userId,
        userEmail,
        currentQuestion,
        saqAnswer,
      },
    });
  };
  useEffect(() => {
    if (isReviewCompleted) {
      const score = answeredCorrectly.size;
      const total = questions.length;
      const percentage = (score / total) * 100;
      setFinalScore(score);
      setFinalPercentage(percentage);
    }
  }, [isReviewCompleted, answeredCorrectly, questions]);

  const getPersonalizedMessage = (percentage: number) => {
    if (percentage >= 90) return 'Outstanding! On the road to ding yau!';
    if (percentage >= 80) return 'Excellent work! We have a Q4 yau here. ';
    if (percentage >= 70) return 'Good job! You are on the right track!';
    if (percentage >= 60)
      return 'Not bad! There is room for improvement, keep practicing!';
    return 'Keep working hard! Review the material and try again!';
  };

  const QuestionImage = ({ imageUrl }: { imageUrl: string | null }) => {
    if (!imageUrl) return null;
    return (
      <div className="mt-4 mb-4">
        <Image
          src={imageUrl}
          width={300}
          height={300}
          alt="Question Image"
          className="max-w-full h-auto rounded-md"
        />
      </div>
    );
  };

  if (isReviewCompleted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <h1 className="text-4xl font-bold mb-4">Congratulations!</h1>
        <p className="text-xl mb-4">You&apos;ve completed the review.</p>
        <div className="text-2xl font-semibold mb-4">
          Final Score: {finalScore} / {questions.length}
        </div>
        <div className="text-3xl font-bold mb-6">
          {finalPercentage.toFixed(1)}%
        </div>
        <p className="text-lg text-center max-w-md mb-8">
          {getPersonalizedMessage(finalPercentage)}
        </p>
        <Button onClick={onReviewCompleted}>Start New Review</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full  p-4 bg-gray-50 pt-12">
      <div className="flex items-center justify-between w-full max-w-4xl p-4 bg-white border rounded-md shadow-sm">
        <button
          className="p-2"
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeftIcon
            className="w-6 h-6"
            color={currentQuestionIndex === 0 ? 'gray' : 'black'}
          />
        </button>
        <div className="flex-1 overflow-x-auto">
          <div className="flex items-center space-x-2 px-2">
            {questions.map((question, index) => (
              <div
                key={index}
                className={`flex-shrink-0 w-6 h-6 rounded-full ${
                  index === currentQuestionIndex
                    ? 'bg-orange-500'
                    : completedQuestions.has(question.id)
                      ? answeredCorrectly.has(question.id)
                        ? 'bg-green-500'
                        : 'bg-red-500'
                      : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
        <button
          className="p-2"
          onClick={handleNextQuestion}
          disabled={currentQuestionIndex === questions.length - 1}
        >
          <ArrowRightIcon
            className="w-6 h-6"
            color={
              currentQuestionIndex === questions.length - 1 ? 'gray' : 'black'
            }
          />
        </button>
      </div>
      <div className="flex flex-col  w-full max-w-4xl p-4 mt-4 bg-white border rounded-md shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between">
          <div className="mb-4 flex flex-row space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="default">qID</Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Question ID (use it to reference this specific question):
                  </p>
                  <p>{currentQuestion?.id}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary">
                    {currentQuestion?.question_type.toUpperCase()}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="w-[200px]">
                  <p>
                    This is for the MCQ paper. It can be sourced from past paper
                    questions, textbooks, moodle, old spec questions or
                    student/teacher made.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline">{currentQuestion?.tag}</Badge>
                </TooltipTrigger>
                <TooltipContent className="w-[200px]">
                  <p>
                    This is a tag for this question that might indicate where it
                    is from.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {currentQuestion?.difficulty === 1 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="bg-green-100 text-green-800 text-xs text-center font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                      Difficulty: Core
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="w-[200px]">
                    <p>
                      This question is a core knowledge question that (should)
                      be mentioned in more than 1 lecture / it might be quite
                      important concept.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {currentQuestion?.difficulty === 2 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">
                      Difficulty: Medium
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="w-[200px]">
                    <p>
                      This question is a medium difficulty question that might
                      require some thinking.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {currentQuestion?.difficulty === 3 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">
                      Difficulty: Hard
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="w-[200px]">
                    <p>
                      This question is a hard difficulty question that might be
                      challenging or nitpicked like from a corner of slide.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="">
            <p className="text-xs text-gray-500">
              Last updated:{' '}
              {currentQuestion?.updated_at
                ? new Date(currentQuestion?.updated_at).toLocaleDateString()
                : ''}
            </p>
          </div>
        </div>
        <div className="">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                className="w-full p-2 border rounded"
                value={editedQuestion.question_text}
                onChange={(e) =>
                  setEditedQuestion({
                    ...editedQuestion,
                    question_text: e.target.value,
                  })
                }
              />
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={editedQuestion.max_marks}
                onChange={(e) =>
                  setEditedQuestion({
                    ...editedQuestion,
                    max_marks: parseInt(e.target.value) || 0,
                  })
                }
              />
              <textarea
                className="w-full p-2 border rounded"
                value={editedQuestion.correct_answer}
                onChange={(e) =>
                  setEditedQuestion({
                    ...editedQuestion,
                    correct_answer: e.target.value,
                  })
                }
                placeholder="Correct Answer"
              />
              <textarea
                className="w-full p-2 border rounded"
                value={editedQuestion.explanation}
                onChange={(e) =>
                  setEditedQuestion({
                    ...editedQuestion,
                    explanation: e.target.value,
                  })
                }
                placeholder="Explanation"
              />

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    uploadImage(
                      e.target.files[0],
                      currentQuestion.id,
                      'question',
                      csrfToken,
                    )
                      .then((url) => {
                        toast.success('Image uploaded successfully');
                        setEditedQuestion({
                          ...editedQuestion,
                          image_url_question: url,
                        });
                      })
                      .catch((error) => {
                        console.error('Failed to upload image:', error);
                        toast.error(
                          'Failed to upload image. Please try again.',
                        );
                      });
                  }
                }}
              />
            </div>
          ) : (
            <>
              <h2 className="my-2 text-lg font-semibold">
                {currentQuestion?.question_text}
              </h2>
              <QuestionImage imageUrl={currentQuestion?.image_url_question} />
              <p className="text-sm text-gray-500 mb-8">
                {currentQuestion?.max_marks} mark(s)
              </p>
            </>
          )}

          {userEmail && ADMIN_EMAILS.includes(userEmail) && (
            <Button onClick={toggleEditMode}>
              {isEditing ? 'Save Changes' : 'Edit Question'}
            </Button>
          )}

          {/* MCQ OPTION BOX FOR MCQ ONLY */}
          {currentQuestion?.question_type === 'mcq' && (
            <RadioGroup
              value={selectedAnswer.key}
              onValueChange={(key) =>
                setSelectedAnswer({ key, value: shuffledOptions[key] })
              }
            >
              {Object.entries(shuffledOptions).map(([key, value]) => {
                const correctAnswer = value === currentQuestion.correct_answer;
                // const isSelected = selectedAnswer === value;
                const bgColor =
                  showAnswer || completedQuestions.has(currentQuestion.id)
                    ? correctAnswer
                      ? 'bg-green-100'
                      : 'bg-red-100'
                    : 'bg-white';

                return (
                  <div
                    key={key}
                    className={`flex items-center p-4 mb-2 border rounded-md ${bgColor}`}
                  >
                    <RadioGroupItem
                      value={key}
                      id={key}
                      disabled={
                        showAnswer || completedQuestions.has(currentQuestion.id)
                      }
                    />
                    <Label htmlFor={key} className="ml-2">
                      {value as React.ReactNode}
                    </Label>
                    {/* <Badge className="ml-auto">{key}</Badge> */}
                  </div>
                );
              })}
            </RadioGroup>
          )}

          {/* MCQ OPTION BOX FOR EMQ ONLY */}
          {currentQuestion?.question_type === 'emq' && (
            <RadioGroup
              value={selectedAnswer.key}
              onValueChange={(key) =>
                setSelectedAnswer({ key, value: shuffledOptions[key] })
              }
            >
              {Object.entries(shuffledOptions).map(([key, value]) => {
                const correctAnswer = value === currentQuestion.correct_answer;
                // const isSelected = selectedAnswer === value;
                const bgColor =
                  showAnswer || completedQuestions.has(currentQuestion.id)
                    ? correctAnswer
                      ? 'bg-green-100'
                      : 'bg-red-100'
                    : 'bg-white';

                return (
                  <div
                    key={key}
                    className={`flex items-center p-4 mb-2 border rounded-md ${bgColor}`}
                  >
                    <RadioGroupItem
                      value={key}
                      id={key}
                      disabled={
                        showAnswer || completedQuestions.has(currentQuestion.id)
                      }
                    />
                    <Label htmlFor={key} className="ml-2">
                      {value as React.ReactNode}
                    </Label>
                    {/* <Badge className="ml-auto">{key}</Badge> */}
                  </div>
                );
              })}
            </RadioGroup>
          )}

          {/* SAQ TEXT AREA BOX FOR SAQ ONLY */}
          {currentQuestion?.question_type === 'saq' && (
            <Textarea
              value={saqAnswer}
              onChange={handleSAQTextAreaChange}
              disabled={
                showAnswer || completedQuestions.has(currentQuestion.id)
              }
            />
          )}

          {/* MARKS REWARDS AND STREAMING RESPONSE FROM GPT */}

          {currentQuestion?.question_type === 'saq' &&
            (showAnswer || completedQuestions.has(currentQuestion.id)) && (
              <div className="mt-4 mb-16 p-4 rounded-md flex flex-col space-y-2  bg-gray-100">
                {/* <div>Completion: {completion}</div> */}
                <div
                  className={`p-2 rounded-md ${
                    currentQuestion.max_marks &&
                    generatedFeedback.student_mark /
                      currentQuestion.max_marks >=
                      1
                      ? 'bg-green-100'
                      : currentQuestion.max_marks &&
                          generatedFeedback.student_mark /
                            currentQuestion.max_marks >=
                            0.5
                        ? 'bg-yellow-100'
                        : 'bg-red-100'
                  }`}
                >
                  <span className="font-semibold text-lg">
                    Your Mark: {generatedFeedback.student_mark}/
                    {currentQuestion.max_marks}
                  </span>
                </div>
                <div className="p-2">
                  <Badge variant="outline">Mark Distribution:</Badge>
                  <p className="mt-2 text-sm text-gray-500 p-1">
                    {generatedFeedback.mark_distribution}
                  </p>
                </div>
                <div>
                  <div className="p-2">
                    <Badge className="bg-green-500">
                      <Check className="w-4 h-4 mr-2" />
                      What you did well
                    </Badge>

                    <p className="text-sm text-gray-500 mt-2 p-1">
                      {generatedFeedback.did_well}
                    </p>
                  </div>
                </div>

                <div className="p-2">
                  <Badge className="bg-red-500">
                    <Check className="w-4 h-4 mr-2" />
                    What you did not well
                  </Badge>

                  <p className="text-sm text-gray-500 mt-2 p-1">
                    {generatedFeedback.did_not_well}
                  </p>
                </div>
              </div>
            )}

          {/* ANSWERS AND EXPLANATION */}

          {(showAnswer || completedQuestions.has(currentQuestion.id)) && (
            <div className="mt-4 flex flex-col space-y-4 mb-32">
              <div className="p-4 bg-gray-100 rounded-md">
                <p className="font-semibold">
                  Correct Answer: {currentQuestion.correct_answer}
                </p>
                <QuestionImage imageUrl={currentQuestion?.image_url_answer} />
                <p className="mt-2">
                  Explanation:
                  <br />
                  {currentQuestion.explanation}
                </p>
              </div>
              <PrevAttemptsBox questionID={currentQuestion.id} />
              <CommentBox questionID={currentQuestion.id} />
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 right-0 flex items-center space-x-2 p-4 bg-white dark:bg-slate-950 border-t border-zinc-200 z-50 lg:left-[17rem] left-0">
        {showAnswer || completedQuestions.has(currentQuestion.id) ? (
          <Button className="ml-auto mr-2" onClick={handleNextQuestion}>
            {currentQuestionIndex === questions.length - 1 ? (
              <>
                Complete Review <Check className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Next Question <Space className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        ) : (
          <Button className="ml-auto mr-2" onClick={handleCheckAnswer}>
            Check Answer <Space className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ArrowLeftIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
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
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function ArrowRightIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
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
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function CalculatorIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
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
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </svg>
  );
}

function DoorClosedIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
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
      <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
      <path d="M2 20h20" />
      <path d="M14 12v.01" />
    </svg>
  );
}

function FlagIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
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
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  );
}

function StickyNoteIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
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
      <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
      <path d="M15 3v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function WalletCardsIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
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
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" />
      <path d="M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21" />
    </svg>
  );
}

export const uploadImage = async (
  file: File,
  questionId: string,
  type: string,
  csrfToken: string,
) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('questionId', questionId);
  formData.append('type', type);

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  return response.text();
};
