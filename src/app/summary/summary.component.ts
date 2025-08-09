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

/**
 * Interface for Firestore timestamp objects that can be converted to Date.
 * @interface FirestoreTimestamp
 */
interface FirestoreTimestamp {
  /**
   * Converts the Firestore timestamp to a JavaScript Date object.
   * @returns {Date} The converted Date object
   */
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
  /**
   * Array containing all tasks loaded from the task service.
   * @type {Task[]}
   */
  taskList: Task[] = [];
  
  /**
   * Display name of the current user for personalized greeting.
   * @type {string}
   */
  userName: string = '';
  
  /**
   * Current state of the greeting animation ('start' or 'moved').
   * @type {'start' | 'moved'}
   */
  greetingState: 'start' | 'moved' = 'start';
  
  /**
   * Flag controlling the visibility of the greeting message.
   * @type {boolean}
   */
  showGreeting = true;
  
  /**
   * Flag indicating if the current device is mobile (width < 1000px).
   * @type {boolean}
   */
  isMobile = false;
  
  /**
   * The next upcoming deadline date across all tasks.
   * @type {Date | null}
   */
  nextDeadlineDate: Date | null = null;
  
  /**
   * Count of tasks with 'urgent' priority.
   * @type {number}
   */
  nextDeadlineCount: number = 0;
  
  /**
   * Time-based greeting message (e.g., "Good morning,").
   * @type {string}
   */
  greeting: string = '';
  
  /**
   * Count of tasks with 'to-do' status.
   * @type {number}
   */
  todoCount = 0;
  
  /**
   * Count of tasks with 'done' status.
   * @type {number}
   */
  doneCount = 0;
  
  /**
   * Count of tasks with 'in-progress' status.
   * @type {number}
   */
  inProgressCount = 0;
  
  /**
   * Count of tasks with 'await-feedback' status.
   * @type {number}
   */
  awaitingFeedbackCount = 0;

  /**
   * Creates an instance of SummaryComponent.
   * @param {TaskService} taskService - Service for task-related operations and data access
   * @param {Router} router - Angular Router service for navigation
   * @param {AuthService} authService - Service for authentication and user data
   */
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
   * @returns {void}
   */
  goToBoard() {
    this.router.navigate(['/board']);
  }

  /**
   * Initializes the component by determining device type,
   * loading user greeting, and loading tasks with statistics.
   * @returns {void}
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
   * @private
   * @returns {void}
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
   * @private
   * @returns {void}
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
   * @private
   * @returns {void}
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
   * @private
   * @param {Task[]} tasks - Array of task objects to be analyzed
   * @returns {void}
   */
  private setTaskCounts(tasks: Task[]): void {
    this.todoCount = this.countTasksByStatus(tasks, 'to-do');
    this.doneCount = this.countTasksByStatus(tasks, 'done');
    this.inProgressCount = this.countTasksByStatus(tasks, 'in-progress');
    this.awaitingFeedbackCount = this.countTasksByStatus(tasks, 'await-feedback');
    this.nextDeadlineCount = tasks.filter((t) => t.priority === 'urgent').length;
  }

  /**
   * Filters tasks to only include those with a valid future date and not marked as 'done'.
   * Parses the date string into a Date object.
   * @private
   * @param {Task[]} tasks - Array of task objects
   * @param {(date: string) => Date | null} parseDate - A function that parses a date string into a Date object
   * @returns {(Task & { dateObj: Date })[]} An array of tasks with a valid future date, each including a `dateObj` field
   */
  private getFutureTasksWithDateObj(tasks: Task[], parseDate: (date: string) => Date | null): (Task & { dateObj: Date })[] {
    const now = new Date();
    return tasks
    .filter((t) => t.date && t.status !== 'done')
    .map((t) => {
      const dateObj = this.parseDate(t.date!);
      return { ...t, dateObj };
    })
    .filter((t): t is Task & { dateObj: Date } => !!t.dateObj && t.dateObj > now);
  }

  /**
   * Returns the earliest date from an array of tasks with valid date objects.
   * @private
   * @param {(Task & { dateObj: Date })[]} tasks - Array of tasks containing a `dateObj` property
   * @returns {Date | null} The earliest Date object, or null if the array is empty
   */
  private getEarliestDate(tasks: (Task & { dateObj: Date })[]): Date | null {
    if (tasks.length === 0) return null;
    tasks.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    return tasks[0].dateObj;
  }

  /**
   * Determines and sets the next upcoming deadline from the list of tasks.
   * @private
   * @param {Task[]} tasks - Array of task objects
   * @returns {void}
   */
  private setNextDeadline(tasks: Task[]): void {
    const futureTasks = this.getFutureTasksWithDateObj(tasks, this.parseDate.bind(this));
    this.nextDeadlineDate = this.getEarliestDate(futureTasks);
  }

  /**
   * Converts a date value of various possible formats into a JavaScript Date object.
   * @private
   * @param {any} date - Date input which could be a string, number, Date, or Firestore timestamp
   * @returns {Date | null} A valid Date object or null if conversion is not possible
   */
  private parseDate(date: any): Date | null {
    if (date instanceof Date) return date;
    if (this.isFirestoreTimestamp(date)) return date.toDate();
    if (typeof date === 'string' || typeof date === 'number') return new Date(date);
    return null;
  }
}