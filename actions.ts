'use server';

import { revalidatePath } from 'next/cache';
import getSupabaseServerActionClient from '~/core/supabase/action-client';

export async function updateQuestion(
  questionId: string,
  updatedData: {
    question_text?: string;
    correct_answer?: string;
    explanation?: string;
    max_marks?: number;
    options?: Record<string, string>;
  },
) {
  const client = getSupabaseServerActionClient();

  console.log('updatedData', updatedData);
  const { data, error } = await client
    .from('questions')
    .update(updatedData)
    .eq('id', questionId);

  if (error) {
    throw error;
  }

  revalidatePath(`/qbank/hkumbbs2`, 'page');

  return data;
}

export async function uploadImage(
  file: File,
  questionId: string,
  imageType: 'question' | 'answer',
) {
  const client = getSupabaseServerActionClient();

  const fileExt = file.name.split('.').pop();
  const fileName = `${questionId}_${imageType}.${fileExt}`;
  const filePath = `question_images/${fileName}`;

  const { data, error } = await client.storage
    .from('images')
    .upload(filePath, file, {
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data: publicUrl } = client.storage
    .from('images')
    .getPublicUrl(filePath);

  // Update the question with the new image URL
  const imageField =
    imageType === 'question' ? 'image_url_question' : 'image_url_answer';
  await updateQuestion(questionId, { [imageField]: publicUrl.publicUrl });

  return publicUrl.publicUrl;
}

export async function fetchTopicsList(userId: string) {
  const client = getSupabaseServerActionClient();

  const { data, error } = await client
    .from('topics')
    .select(
      `
        id,
        name,
        description
        `,
    )
    .order('name');

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchQuestions({
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
}: {
  selectedTopics: string[];
  core: boolean;
  medium: boolean;
  hard: boolean;
  notAnswered: boolean;
  incorrectlyAnswered: boolean;
  correctlyAnswered: boolean;
  numberOfQuestions: number;
  userId: string;
  mcq: boolean;
  emq: boolean;
  saq: boolean;
}) {
  const client = getSupabaseServerActionClient();

  let query = client
    .from('questions')
    .select(
      `
      *,
      student_responses!left(*)
    `,
    )
    .in('topic_id', selectedTopics)
    .order('created_at', {
      referencedTable: 'student_responses',
      ascending: false,
    });

  // Filter by difficulty
  const difficulties = [];
  if (core) difficulties.push(1);
  if (medium) difficulties.push(2);
  if (hard) difficulties.push(3);

  if (difficulties.length > 0) {
    query = query.in('difficulty', difficulties);
  }

  // Filter by question type
  const questionTypes = [];
  if (mcq) questionTypes.push('mcq');
  if (emq) questionTypes.push('emq');
  if (saq) questionTypes.push('saq');

  if (questionTypes.length > 0) {
    query = query.in('question_type', questionTypes);
  }

  const { data: allQuestions, error } = await query.limit(numberOfQuestions);

  if (error) {
    throw error;
  }

  if (!allQuestions || allQuestions.length === 0) {
    return {
      questions: [],
      message:
        'No questions found matching the selected criteria. Please try adjusting your filters.',
    };
  }

  // Filter based on user's previous performance
  const filteredQuestions = allQuestions.filter((question) => {
    const latestResponse = question.student_responses.find(
      (response) => response.student_id === userId,
    );

    if (notAnswered && !latestResponse) return true;
    if (incorrectlyAnswered && latestResponse && !latestResponse.is_correct)
      return true;
    if (correctlyAnswered && latestResponse && latestResponse.is_correct)
      return true;

    return false;
  });

  return {
    questions: filteredQuestions,
    message: null,
  };
}

export async function appendResponse(
  userId: string,
  question_id: string,
  selected_option: string | null,
  answer_text: string | null,
  is_correct: boolean,
  marks_scored: number,
) {
  const client = getSupabaseServerActionClient();

  console.log('userId', userId);
  console.log('question_id', question_id);
  console.log('selected_option', selected_option);
  console.log('answer_text', answer_text);
  console.log('is_correct', is_correct);
  console.log('marks_scored', marks_scored);

  const { error } = await client.from('student_responses').insert({
    student_id: userId,
    question_id: question_id,
    selected_option: selected_option,
    answer_text: answer_text,
    is_correct: is_correct,
    marks_scored: marks_scored,
  });

  if (error) {
    throw error;
  }
}

export async function fetchTopicStatistics(userId: string) {
  const client = getSupabaseServerActionClient();

  const { data, error } = await client
    .from('questions')
    .select(
      `
      *,
      student_responses!inner(*)
    `,
    )
    .eq('student_responses.student_id', userId)
    .order('created_at', {
      referencedTable: 'student_responses',
      ascending: false,
    });

  if (error) {
    throw error;
  }

  const statistics: {
    [topicId: string]: { correctAnswers: number; incorrectAnswers: number };
  } = {};

  const processedQuestions = new Set();

  data.forEach((question: any) => {
    if (!processedQuestions.has(question.id)) {
      const latestResponse = question.student_responses[0];
      if (latestResponse) {
        if (!statistics[question.topic_id]) {
          statistics[question.topic_id] = {
            correctAnswers: 0,
            incorrectAnswers: 0,
          };
        }
        if (latestResponse.is_correct) {
          statistics[question.topic_id].correctAnswers++;
        } else {
          statistics[question.topic_id].incorrectAnswers++;
        }
      }
      processedQuestions.add(question.id);
    }
  });

  return statistics;
}

export async function fetchTopicTotalQuestionCount() {
  const client = getSupabaseServerActionClient();

  const { data, error } = await client.from('questions').select('topic_id');

  if (error) {
    throw error;
  }

  const topicCounts: { [topicId: string]: number } = {};

  data.forEach((question) => {
    if (question.topic_id) {
      topicCounts[question.topic_id] =
        (topicCounts[question.topic_id] || 0) + 1;
    }
  });

  return topicCounts;
}
