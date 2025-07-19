import { Component, OnInit } from '@angular/core';
import { TaskService, Task } from '../services/task.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';

interface FirestoreTimestamp {
  toDate(): Date;
}

@Component({
  selector: 'app-summary',
  imports: [CommonModule],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.scss',
  animations: [
    trigger('fadeOutGreeting', [
      state('start', style({ opacity: 1 })),
      state('moved', style({ opacity: 0 })),
      transition('start => moved', [animate('1.5s 0.5s ease-in-out')]),
    ]),
  ],
})
export class SummaryComponent implements OnInit {
  taskList: Task[] = [];
  userName: string = '';

  greetingState: 'start' | 'moved' = 'start';
  showGreeting = true;
  isMobile = false;

  nextDeadlineDate: Date | null = null;
  nextDeadlineCount: number = 0;
  greeting: string = '';

  todoCount = 0;
  doneCount = 0;
  inProgressCount = 0;
  awaitingFeedbackCount = 0;

  constructor(
    private taskService: TaskService,
    private router: Router,
    private authService: AuthService
  ) {}

  /**
   * Counts the number of tasks with a specific status.
   *
   * @private
   * @param {Task[]} tasks - The list of tasks.
   * @param {string} status - The status to count.
   * @returns {number} The number of tasks with the given status.
   */
  private countTasksByStatus(tasks: Task[], status: string): number {
    return tasks.filter((t) => t.status === status).length;
  }

  /**
   * Checks if the given object is a FirestoreTimestamp.
   *
   * @private
   * @param {any} obj - The object to check.
   * @returns {obj is FirestoreTimestamp} True if the object is a FirestoreTimestamp.
   */
  private isFirestoreTimestamp(obj: any): obj is FirestoreTimestamp {
    return obj && typeof obj.toDate === 'function';
  }

  /**
   * Returns the total number of all tasks.
   *
   * @readonly
   * @returns {number} The total number of tasks.
   */
  get totalTaskCount(): number {
    return (
      this.todoCount +
      this.inProgressCount +
      this.awaitingFeedbackCount +
      this.doneCount
    );
  }

  /**
   * Returns a greeting depending on the current time.
   *
   * @returns {string} The greeting (e.g., "Good morning,").
   */
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good morning,';
    } else if (hour >= 12 && hour < 18) {
      return 'Good afternoon,';
    } else if (hour >= 18 && hour < 23) {
      return 'Good evening,';
    } else {
      return 'Good night,';
    }
  }

  /**
   * Navigates to the board view.
   */
  goToBoard() {
    this.router.navigate(['/board']);
  }

 /**
 * Initializes the component by determining device type,
 * loading user greeting, and loading tasks with statistics.
 */
ngOnInit() {
  this.isMobile = window.innerWidth < 1000;

  this.loadUserGreeting();
  this.loadAndProcessTasks();
}

  /**
   * Loads current user data and sets a personalized greeting.
   * If on mobile and greeting hasn't been shown in this session,
   * triggers an animated greeting display.
   */
  private loadUserGreeting(): void {
    this.authService.getCurrentUserData().then((userData) => {
      this.userName = userData?.displayName?.trim()
        ? userData.displayName
        : 'Nice to see you!';
      this.greeting = this.getGreeting();

      const greetingShown = sessionStorage.getItem('greetingShown');
      if (this.isMobile && !greetingShown) {
        this.showAnimatedGreeting();
      } else {
        this.showGreeting = false;
      }
    });
  }

  /**
   * Animates a greeting sequence for mobile devices.
   * Hides the greeting after the animation and stores the display state in sessionStorage.
   */
  private showAnimatedGreeting(): void {
    this.showGreeting = true;
    this.greetingState = 'start';
    setTimeout(() => {
      this.greetingState = 'moved';
      setTimeout(() => {
        this.showGreeting = false;
        sessionStorage.setItem('greetingShown', 'true');
      }, 2000);
    }, 500);
  }

  /**
   * Subscribes to task data and processes statistics and deadline information.
   */
  private loadAndProcessTasks(): void {
    this.taskService.getTasks().subscribe((tasks: Task[]) => {
      this.taskList = tasks;
      this.setTaskCounts(tasks);
      this.setNextDeadline(tasks);
    });
  }

  /**
   * Sets the count of tasks by specific statuses and urgency.
   * 
   * @param tasks - Array of task objects to be analyzed.
   */
  private setTaskCounts(tasks: Task[]): void {
    this.todoCount = this.countTasksByStatus(tasks, 'to-do');
    this.doneCount = this.countTasksByStatus(tasks, 'done');
    this.inProgressCount = this.countTasksByStatus(tasks, 'in-progress');
    this.awaitingFeedbackCount = this.countTasksByStatus(tasks, 'await-feedback');
    this.nextDeadlineCount = tasks.filter((t) => t.priority === 'urgent').length;
  }

  /**
   * Determines the next upcoming deadline from the list of tasks.
   * 
   * @param tasks - Array of task objects containing dates.
   */
  private setNextDeadline(tasks: Task[]): void {
    const now = new Date();
    const futureTasks = tasks
      .filter((t) => t.date && t.status !== 'done')
      .map((t) => {
        const dateObj = this.parseDate(t.date);
        return { ...t, dateObj };
      })
      .filter((t) => t.dateObj && t.dateObj > now);

    if (futureTasks.length > 0) {
      futureTasks.sort((a, b) => a.dateObj!.getTime() - b.dateObj!.getTime());
      this.nextDeadlineDate = futureTasks[0].dateObj!;
    } else {
      this.nextDeadlineDate = null;
    }
  }

  /**
   * Converts a date value of various possible formats into a JavaScript Date object.
   * 
   * @param date - Date input which could be a string, number, Date, or Firestore timestamp.
   * @returns A valid Date object or null if conversion is not possible.
   */
  private parseDate(date: any): Date | null {
    if (date instanceof Date) return date;
    if (this.isFirestoreTimestamp(date)) return date.toDate();
    if (typeof date === 'string' || typeof date === 'number') return new Date(date);
    return null;
  }
}
