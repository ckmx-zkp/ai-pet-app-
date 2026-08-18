import { defineStore } from 'pinia'
import type { QuizAttempt } from '../api/types'

/** 测验作答结果：提交后跳到独立结果页，不堆在题目底下。 */
export const useQuizSession = defineStore('quizSession', {
  state: (): { attempt: QuizAttempt | null; answers: string[] } => ({
    attempt: null,
    answers: []
  }),
  actions: {
    setAttempt(attempt: QuizAttempt, answers: string[]) {
      this.attempt = attempt
      this.answers = answers
    },
    clear() {
      this.attempt = null
      this.answers = []
    }
  }
})
