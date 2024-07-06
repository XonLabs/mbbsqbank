'use client';

import {
  BarChartIcon,
  ChevronDown,
  ChevronRight,
  GraduationCapIcon,
  TableIcon,
} from 'lucide-react';
import { Button } from '~/core/ui/ShadCNButton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/core/ui/Table';
import TopicModel from './TopicModel';
import { Checkbox } from '~/core/ui/Checkbox';
import { useEffect, useState } from 'react';
import ReviewScreen from './ReviewScreen';
import useUserId from '~/core/hooks/use-user-id';
import Alert from '~/core/ui/Alert';

type TopicTableProps = {
  topic_list: TopicList[];
  topic_stats: any;
  topic_counts: TopicTotalCounts;
};

type LeafTopicStats = {
  correctAnswers: number;
  incorrectAnswers: number;
};

type FolderTopicStats = {
  correct: number;
  incorrect: number;
  total: number;
};

// Define a type for the statistics
type TopicStatistics = {
  [topicId: string]: { correctAnswers: number; incorrectAnswers: number };
};

type TopicTotalCounts = {
  [topicId: string]: number;
};

interface TopicList {
  id: string | null;
  name: string | null;
  description: string | null;
}

// interface TopicUserStatistic {
//   topic_id: string | null;
//   topic_name: string | null;
//   correct_answers: number | null;
//   wrong_answers: number | null;
//   not_answered: number | null;
//   total_questions: number | null;
//   percentage_score: number | null;
// }

interface NestedTopic {
  [key: string]: NestedTopic | TopicList;
}

const parseTopics = (topics: TopicList[]): NestedTopic => {
  const root: NestedTopic = {};

  topics.forEach((topic) => {
    const parts = topic.name?.split('/') || [];
    let current: NestedTopic = root;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 ? topic : {};
      }
      current = current[part] as NestedTopic;
    });
  });

  return root;
};

function TopicTable({
  topic_list,
  topic_stats,
  topic_counts,
}: TopicTableProps) {
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [exerciseSettings, setExerciseSettings] = useState({
    core: true,
    medium: true,
    hard: true,
    notAnswered: true,
    incorrectlyAnswered: false,
    correctlyAnswered: false,
  });
  const [questions, setQuestions] = useState<any[]>([]);
  const userId = useUserId();

  console.log('stats', topic_stats);
  console.log('counts', topic_counts);

  const handleTopicSelection = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((t) => t !== topicId)
        : [...prev, topicId],
    );
  };

  const handleStartExercise = (
    topics: string[],
    core: boolean,
    medium: boolean,
    hard: boolean,
    notAnswered: boolean,
    incorrectlyAnswered: boolean,
    correctlyAnswered: boolean,
    questions: any[],
  ) => {
    setSelectedTopics(topics);
    setExerciseSettings({
      core,
      medium,
      hard,
      notAnswered,
      incorrectlyAnswered,
      correctlyAnswered,
    });
    setQuestions(questions);
    setShowReviewScreen(true);
  };

  const nestedTopics = parseTopics(topic_list);

  console.log('nestedTopics', nestedTopics);

  // useEffect(() => {
  //   async function loadTopicStats() {
  //     if (userId) {
  //       const stats = await fetchTopicStatistics(userId);
  //       setTopicStats(stats);
  //     }
  //   }
  //   loadTopicStats();
  //   console.log('topicStats', topicStats);
  // }, [topicStats, userId]);

  return (
    <>
      {showReviewScreen ? (
        <ReviewScreen
          selectedTopics={selectedTopics}
          settings={exerciseSettings}
          questions={questions}
          onReviewCompleted={() => setShowReviewScreen(false)}
        />
      ) : (
        <div className="p-6">
          <header className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center space-x-2">
              <GraduationCapIcon className="h-6 w-6" />
              <h1 className="text-xl font-bold">MBBS II Question Bank</h1>
            </div>
            <TopicModel
              selectedTopics={selectedTopics}
              onStartExercise={handleStartExercise}
            />
            {/* <nav className="flex space-x-4">
              <Button variant="ghost">PRE-CLINICAL</Button>
              <Button variant="ghost">INTRO TO CLINICAL</Button>
            </nav> */}
          </header>
          <section className="my-6">
            <div className="flex items-center justify-between">
              <Alert type={'info'} className="w-full">
                <Alert.Heading>
                  Welcome to HKUMed Question Bank (QBank)!
                </Alert.Heading>
                <p className="mb-3">
                  This is an unofficial platform that is completely free and
                  open source. The goal is to enhance our exam preparation by
                  stream-lining the exam grinding process. The mission is to:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                  <li>
                    Comprehensive digitalization of all old spec + new spec
                    questions in one unified platform
                  </li>
                  <li>
                    Customizable sorting options not possible on paper: Practice
                    by topic, by year, by question type, by previously correct
                    or incorrect answers
                  </li>
                  <li>
                    Automatic grading for MCQ + SAQ questions based on
                    peer-reviewed and faculty official mark schemes with tracked
                    correct/incorrect answers and past performance to help
                    identify weaknesses
                  </li>
                  <li>
                    Question-specific discussion threads to facilitate peer
                    review of mark scheme validity
                  </li>
                  <li>
                    Dedicated admin panel for student-driven updates, ensuring
                    the platform stays current and relevant
                  </li>
                </ul>
                <p className="text-sm italic">
                  Note: This platform is for HKU medical students only. Please
                  use responsibly and ethically for personal study.{' '}
                  <a
                    href="/disclaimer"
                    className="text-blue-600 hover:underline"
                  >
                    Learn more about the disclaimer and platform here
                  </a>
                  .
                </p>
              </Alert>
              <div className="flex space-x-2">
                {/* <Button variant="outline">
                  <BarChartIcon className="mr-2 h-4 w-4" />
                  OVERVIEW
                </Button>
                <Button variant="outline">
                  <TableIcon className="mr-2 h-4 w-4" />
                  DETAILS VIEW
                </Button> */}
              </div>
            </div>
          </section>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Select</TableHead>
                <TableHead className="text-green-500">Correct</TableHead>
                <TableHead className="text-red-500">Incorrect</TableHead>
                <TableHead className="text-gray-500">Not answered</TableHead>
                <TableHead className="text-gray-500">Total questions</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(nestedTopics).map(([topicName, topic], index) => (
                <NestedTopicRow
                  key={index}
                  topic={topic}
                  name={topicName}
                  onSelect={handleTopicSelection}
                  selectedTopics={selectedTopics}
                  topic_stats={topic_stats}
                  topic_counts={topic_counts}
                />
              ))}
            </TableBody>
          </Table>
          {/* <TopicModel
            selectedTopics={selectedTopics}
            onStartExercise={handleStartExercise}
          /> */}
        </div>
      )}
    </>
  );
}

export default TopicTable;

const NestedTopicRow = ({
  topic,
  name,
  level = 0,
  onSelect,
  selectedTopics,
  topic_stats,
  topic_counts,
}: {
  topic: any;
  name: string;
  level?: number;
  onSelect: (topicId: string) => void;
  selectedTopics: string[];
  topic_stats: TopicStatistics;
  topic_counts: TopicTotalCounts;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isFolder = !('id' in topic);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSelect = () => {
    if (isFolder) {
      // Select all nested topics
      const selectNestedTopics = (nestedTopic: any) => {
        if ('id' in nestedTopic) {
          onSelect(nestedTopic.id!);
        } else {
          Object.values(nestedTopic).forEach(selectNestedTopics);
        }
      };
      selectNestedTopics(topic);
    } else {
      onSelect(topic.id!);
    }
  };

  const isChecked = isFolder
    ? Object.values(topic).every((subTopic: any) =>
        'id' in subTopic
          ? selectedTopics.includes(subTopic.id!)
          : Object.values(subTopic).every(
              (nestedSubTopic: any) =>
                'id' in nestedSubTopic &&
                selectedTopics.includes(nestedSubTopic.id!),
            ),
      )
    : selectedTopics.includes(topic.id!);

  const calculateFolderStats = (folderTopic: any): FolderTopicStats => {
    let correct = 0;
    let incorrect = 0;
    let total = 0;

    Object.values(folderTopic).forEach((subTopic: any) => {
      if ('id' in subTopic) {
        const stats = topic_stats[subTopic.id];
        const count = topic_counts[subTopic.id] || 0;
        if (stats) {
          correct += stats.correctAnswers;
          incorrect += stats.incorrectAnswers;
        }
        total += count;
      } else {
        const subStats = calculateFolderStats(subTopic);
        correct += subStats.correct;
        incorrect += subStats.incorrect;
        total += subStats.total;
      }
    });

    return { correct, incorrect, total };
  };

  const topicStats: LeafTopicStats | FolderTopicStats = isFolder
    ? calculateFolderStats(topic)
    : topic_stats[topic.id] || { correctAnswers: 0, incorrectAnswers: 0 };

  const totalCount = isFolder
    ? (topicStats as FolderTopicStats).total
    : topic_counts[topic.id] || 0;

  const correctAnswers = isFolder
    ? (topicStats as FolderTopicStats).correct
    : (topicStats as LeafTopicStats).correctAnswers;

  const incorrectAnswers = isFolder
    ? (topicStats as FolderTopicStats).incorrect
    : (topicStats as LeafTopicStats).incorrectAnswers;

  return (
    <>
      <TableRow>
        <TableCell>
          <div
            style={{ paddingLeft: `${level * 20}px` }}
            className="flex items-center"
          >
            {isFolder && (
              <Button variant="ghost" size="sm" onClick={handleToggle}>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            <Checkbox checked={isChecked} onCheckedChange={handleSelect} />
            <span className="ml-2">{name}</span>
          </div>
        </TableCell>
        {topicStats ? (
          <>
            <TableCell className="text-green-500">{correctAnswers}</TableCell>
            <TableCell className="text-red-500">{incorrectAnswers}</TableCell>
            <TableCell>
              {totalCount - (correctAnswers + incorrectAnswers)}
            </TableCell>
            <TableCell>{totalCount}</TableCell>
            <TableCell>
              {((correctAnswers / totalCount) * 100).toFixed(2)}%
            </TableCell>
          </>
        ) : (
          <TableCell colSpan={5} className="text-center text-gray-400">
            No statistics available
          </TableCell>
        )}
      </TableRow>
      {isFolder &&
        isExpanded &&
        Object.entries(topic).map(([subName, subTopic], index) => (
          <NestedTopicRow
            key={index}
            topic={subTopic}
            name={subName}
            level={level + 1}
            onSelect={onSelect}
            selectedTopics={selectedTopics}
            topic_stats={topic_stats}
            topic_counts={topic_counts}
          />
        ))}
    </>
  );
};
