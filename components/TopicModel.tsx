/**
 * v0 by Vercel.
 * @see https://v0.dev/t/GncKIDlNhoO
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
'use client';

import { useRouter } from 'next/navigation';
import { JSX, SVGProps, useState } from 'react';
import { Checkbox } from '~/core/ui/Checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/core/ui/Dialog';
import { Button } from '~/core/ui/ShadCNButton';
import { Label } from '~/core/ui/ShadCNLabel';

import { fetchQuestions } from '~/app/(app)/qbank/actions';
import useUserId from '~/core/hooks/use-user-id';
import { toast } from 'sonner';
import { ScrollArea } from '~/core/ui/scroll-area';

export default function TopicModel({
  selectedTopics,
  onStartExercise,
}: {
  selectedTopics: string[];
  onStartExercise: (
    selectedTopics: string[],
    core: boolean,
    medium: boolean,
    hard: boolean,
    notAnswered: boolean,
    incorrectlyAnswered: boolean,
    correctlyAnswered: boolean,
    questions: any[],
  ) => void;
}) {
  const [notAnswered, setNotAnswered] = useState(true);
  const [incorrectlyAnswered, setIncorrectlyAnswered] = useState(false);
  const [correctlyAnswered, setCorrectlyAnswered] = useState(false);
  // QUESTION TYPE
  const [core, setCore] = useState(false);
  const [medium, setMedium] = useState(false);
  const [hard, setHard] = useState(false);
  // QUESTION MODE
  const [mcq, setMcq] = useState(false);
  const [emq, setEmq] = useState(false);
  const [saq, setSaq] = useState(false);
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [shuffle, setShuffle] = useState(false);

  const userId = useUserId();

  const handleStartExercise = async () => {
    if (selectedTopics.length === 0) {
      toast.error(
        'Please select at least one topic before starting the exercise.',
      );
      return;
    }

    if (numberOfQuestions < 1 || numberOfQuestions > 20) {
      toast.error('Number of questions must be between 1 and 20.');
      return;
    }

    if (!core && !medium && !hard) {
      toast.error('Please select at least one difficulty level.');
      return;
    }

    if (!mcq && !emq && !saq) {
      toast.error('Please select at least one question mode.');
      return;
    }

    if (userId) {
      const result = await fetchQuestions({
        selectedTopics,
        core,
        medium,
        hard,
        notAnswered,
        incorrectlyAnswered,
        correctlyAnswered,
        numberOfQuestions,
        userId,
        mcq,
        emq,
        saq,
        shuffle,
      });

      if (result.message) {
        toast.error(result.message);
        return;
      }

      if (result.questions.length === 0) {
        toast.error(
          'No questions found matching the selected criteria. Please try adjusting your filters.',
        );
        return;
      }

      console.log('questions111', result.questions);

      onStartExercise(
        selectedTopics,
        core,
        medium,
        hard,
        notAnswered,
        incorrectlyAnswered,
        correctlyAnswered,
        result.questions,
      );
    } else {
      toast.error(
        'You do not have a userID - please make sure you are logged in.',
      );
    }
  };

  const toggleAllOptions = () => {
    setNotAnswered(true);
    setIncorrectlyAnswered(true);
    setCorrectlyAnswered(true);
    setCore(true);
    setMedium(true);
    setHard(true);
    setMcq(true);
    setEmq(true);
    setSaq(true);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">Start Practice</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-lg ">
        <ScrollArea className="h-[500px] sm:h-[600px]">
          <DialogHeader>
            <DialogTitle>Set up the exercise</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <ScrollArea className="h-[100px]">
                <h3 className="text-lg font-medium">Selected Topics</h3>
                <ul>
                  {selectedTopics.map((topic, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {topic}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Number of Questions</h3>
              <p className="text-sm text-muted-foreground">
                Total number of questions to be included in the exercise.
                Maximum is 20.
              </p>
              <input
                type="number"
                id="number-of-questions"
                name="number-of-questions"
                min="1"
                max="20"
                value={numberOfQuestions}
                onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                className="border rounded p-1"
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Question Type</h3>
              <p className="text-sm text-muted-foreground">
                You can choose more than one option. For correct and incorrect
                questions, we look at the latest attempt.
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="not-answered"
                  checked={notAnswered}
                  onCheckedChange={(checked) =>
                    setNotAnswered(checked === true)
                  }
                />
                <Label htmlFor="not-answered">Not answered questions</Label>
                {/* <span className="ml-auto text-sm text-muted-foreground">
                5 out of 5
              </span> */}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="incorrectly-answered"
                  checked={incorrectlyAnswered}
                  onCheckedChange={(checked) =>
                    setIncorrectlyAnswered(checked === true)
                  }
                />
                <Label htmlFor="incorrectly-answered">
                  Previously incorrectly answered
                </Label>
                {/* <span className="ml-auto text-sm text-muted-foreground">
                1 out of 1
              </span> */}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="correctly-answered"
                  checked={correctlyAnswered}
                  onCheckedChange={(checked) =>
                    setCorrectlyAnswered(checked === true)
                  }
                />
                <Label htmlFor="correctly-answered">
                  Previously correctly answered
                </Label>
                {/* <span className="ml-auto text-sm text-muted-foreground">
                0 out of 0
              </span> */}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Question Mode</h3>
              <p className="text-sm text-muted-foreground">
                You can choose more than one option.
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mcq"
                  checked={mcq}
                  onCheckedChange={(checked) => setMcq(checked === true)}
                />
                <Label htmlFor="mcq">MCQ</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emq"
                  checked={emq}
                  onCheckedChange={(checked) => setEmq(checked === true)}
                />
                <Label htmlFor="emq">EMQ</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="saq"
                  checked={saq}
                  onCheckedChange={(checked) => setSaq(checked === true)}
                />
                <Label htmlFor="saq">
                  SAQ{`  `}
                  <span className="text-xs text-muted-foreground">
                    (No SAQ questions for now - still working on it!)
                  </span>
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Shuffle Questions</h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="shuffle"
                  checked={shuffle}
                  onCheckedChange={(checked) => setShuffle(checked === true)}
                />
                <Label htmlFor="shuffle">Randomize question order</Label>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Difficulty level</h3>
              <p className="text-sm text-muted-foreground">
                You can choose more than one option.
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="core"
                  checked={core}
                  onCheckedChange={(checked) => setCore(checked === true)}
                />
                <Label htmlFor="core">Core</Label>
                <InfoIcon className="ml-1 h-4 w-4" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="medium"
                  checked={medium}
                  onCheckedChange={(checked) => setMedium(checked === true)}
                />
                <Label htmlFor="medium">
                  Medium
                  <span className="text-xs text-muted-foreground">
                    (No Medium questions for now - still working on it!)
                  </span>
                </Label>
                <InfoIcon className="ml-1 h-4 w-4" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hard"
                  checked={hard}
                  onCheckedChange={(checked) => setHard(checked === true)}
                />
                <Label htmlFor="hard">
                  Hard
                  <span className="text-xs text-muted-foreground">
                    (No Hard questions for now - still working on it!)
                  </span>
                </Label>
                <InfoIcon className="ml-1 h-4 w-4" />
              </div>
            </div>
            {/* select quiz or test mode maybe in the future update */}
            {/* <div className="space-y-2">
            <h3 className="text-lg font-medium">Mode type</h3>
            <p className="text-sm text-muted-foreground">
              Test mode starts a timer and shows your answers at the end.
            </p>
            <Select>
              <SelectTrigger id="mode" aria-label="Mode">
                <SelectValue placeholder="Quiz Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quiz">Quiz Mode</SelectItem>
                <SelectItem value="test">Test Mode</SelectItem>
              </SelectContent>
            </Select>
          </div> */}
          </div>
          <DialogFooter>
            <Button
              onClick={toggleAllOptions}
              variant="outline"
              className="w-full"
            >
              Select All Options
            </Button>
            <Button
              variant="default"
              className="ml-auto"
              onClick={handleStartExercise}
            >
              Start Exercise
            </Button>
          </DialogFooter>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function InfoIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
