import { Injectable } from '@angular/core';
import { Task, TaskService, Subtask } from '../services/task.service';
import { Subscription } from 'rxjs';

/**
 * TaskListManager handles all task list operations for the BoardComponent.
 * This includes loading, filtering, sorting, and managing task lists by status.
 */
@Injectable({
  providedIn: 'root'
})

export class TaskListManager {
  /**
   * Complete list of all tasks loaded from the service.
   * @private
   * @type {Task[]}
   */
  private taskList: Task[] = [];
  
  /**
   * Lookup table storing subtasks organized by their parent task ID.
   * @private
   * @type {{ [taskId: string]: Subtask[] }}
   */
  private subtasksByTaskId: { [taskId: string]: Subtask[] } = {};
  
  /**
   * Subscription to the task service observable for cleanup purposes.
   * @private
   * @type {Subscription}
   */
  private unsubTask!: Subscription;
  
  /**
   * Array of tasks with 'to-do' status.
   * @private
   * @type {Task[]}
   */
  private todo: Task[] = [];
  
  /**
   * Array of tasks with 'in-progress' status.
   * @private
   * @type {Task[]}
   */
  private inprogress: Task[] = [];
  
  /**
   * Array of tasks with 'await-feedback' status.
   * @private
   * @type {Task[]}
   */
  private awaitfeedback: Task[] = [];
  
  /**
   * Array of tasks with 'done' status.
   * @private
   * @type {Task[]}
   */
  private done: Task[] = [];

  /**
   * Creates an instance of TaskListManager.
   * @param {TaskService} taskService - Service for task-related operations and data access
   */
  constructor(private taskService: TaskService) { }

  /**
   * Gets all tasks
   * @returns {Task[]} Complete array of all loaded tasks
   */
  getTaskList(): Task[] {
    return this.taskList;
  }

  /**
   * Gets task lists by status
   * @returns {Task[]} Array of tasks with 'to-do' status
   */
  getTodoTasks(): Task[] {
    return this.todo;
  }
  
  /**
   * Gets tasks with 'in-progress' status.
   * @returns {Task[]} Array of tasks with 'in-progress' status
   */
  getInProgressTasks(): Task[] {
    return this.inprogress;
  }

  /**
   * Gets tasks with 'await-feedback' status.
   * @returns {Task[]} Array of tasks with 'await-feedback' status
   */
  getAwaitFeedbackTasks(): Task[] {
    return this.awaitfeedback;
  }

  /**
   * Gets tasks with 'done' status.
   * @returns {Task[]} Array of tasks with 'done' status
   */
  getDoneTasks(): Task[] {
    return this.done;
  }

  /**
   * Gets subtasks by task ID
   * @returns {{ [taskId: string]: Subtask[] }} Lookup object with task IDs as keys and subtask arrays as values
   */
  getSubtasksByTaskId(): { [taskId: string]: Subtask[] } {
    return this.subtasksByTaskId;
  }

  /**
   * Filters tasks by given status and search term (case-insensitive).
   * @param {string} status - Task status to filter by ('to-do', 'in-progress', 'await-feedback', 'done')
   * @param {string} searchTerm - Search term to filter by
   * @returns {Task[]} Filtered list of tasks
   */
    getFilteredTasks(status: string, searchTerm: string): Task[] {
      const tasksForStatus = this.getTasksByStatus(status);
      return this.filterTasksBySearchTerm(tasksForStatus, searchTerm);
    }

  /**
   * Returns tasks from the internal status arrays based on status key.
   * @private
   * @param {string} status - Status key
   * @returns {Task[]} Array of tasks matching the given status
   */
  private getTasksByStatus(status: string): Task[] {
    const statusArrayMap: Record<string, Task[]> = {
      'to-do': this.todo,
      'in-progress': this.inprogress,
      'await-feedback': this.awaitfeedback,
      'done': this.done,
    };
    return statusArrayMap[status] || [];
  }

  /**
   * Filters a list of tasks by the provided search term (case-insensitive).
   * @private
   * @param {Task[]} tasks - The array of tasks to filter
   * @param {string} searchTerm - The term to filter by
   * @returns {Task[]} Filtered tasks array
   */
  private filterTasksBySearchTerm(tasks: Task[], searchTerm: string): Task[] {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) return tasks;
    return tasks.filter(task =>
      task.title.toLowerCase().includes(trimmed) ||
      task.description?.toLowerCase().includes(trimmed)
    );
  }

  /**
   * Sorts a list of tasks by their due date.
   * @param {Task[]} tasks - Array of tasks to be sorted
   * @param {boolean} ascending - Whether to sort in ascending order (default: true)
   * @returns {Task[]} Sorted task array
   */
  sortTasksByDueDate(tasks: Task[], ascending: boolean = true): Task[] {
    return [...tasks].sort((a, b) =>
      ascending
        ? this.getDateValue(a.date) - this.getDateValue(b.date)
        : this.getDateValue(b.date) - this.getDateValue(a.date)
    );
  }

  /**
   * Converts different date formats (Date, Firestore Timestamp, string) into a timestamp.
   * @private
   * @param {Date | any} date - Date input to convert
   * @returns {number} Numeric timestamp, or Number.MAX_SAFE_INTEGER if invalid
   */
  private getDateValue(date: Date | any): number {
    if (date?.toDate instanceof Function) {
      return date.toDate().getTime();
    } else if (date instanceof Date) {
      return date.getTime();
    } else if (typeof date === 'string') {
      return new Date(date).getTime();
    }
    return Number.MAX_SAFE_INTEGER;
  }

  /**
   * TrackBy function for use with ngFor to optimize rendering of tasks.
   * @param {number} index - The index of the item in the array
   * @param {Task} task - The task object
   * @returns {string | undefined} The unique task ID
   */
  trackByTaskId(index: number, task: Task): string | undefined {
    return task.id;
  }

  /**
   * Loads tasks from the task service and distributes them into status-based lists.
   * Also sorts tasks by due date and loads their subtasks.
   * @returns {() => void} A function to unsubscribe from the task observable
   */
  loadTasks(): () => void {
    this.unsubTask = this.taskService.getTasks().subscribe((tasks) => {
      this.taskList = tasks;
      this.distributeTasksByStatus(tasks);
      this.sortAllStatusArrays();
      this.loadSubtasks();
    });
    return () => this.unsubTask.unsubscribe();
  }

  /**
   * Clears all status arrays and distributes tasks into the appropriate lists.
   * @private
   * @param {Task[]} tasks - The full list of tasks to distribute
   * @returns {void}
   */
  private distributeTasksByStatus(tasks: Task[]): void {
    this.emptyArrays();
    for (const task of tasks) {
      switch (task.status) {
        case 'to-do': this.todo.push(task); break;
        case 'in-progress': this.inprogress.push(task); break;
        case 'await-feedback': this.awaitfeedback.push(task); break;
        case 'done': this.done.push(task); break;
        default:
          console.warn(`Unknown status in task ${task.title}:`, task.status);
      }
    }
  }

  /**
   * Sorts all status-based task arrays by due date.
   * @private
   * @returns {void}
   */
  private sortAllStatusArrays(): void {
    this.todo = this.sortTasksByDueDate(this.todo);
    this.inprogress = this.sortTasksByDueDate(this.inprogress);
    this.awaitfeedback = this.sortTasksByDueDate(this.awaitfeedback);
    this.done = this.sortTasksByDueDate(this.done);
  }

  /**
   * Empties all task lists (to-do, in-progress, await-feedback, done).
   * @private
   * @returns {void}
   */
  private emptyArrays(): void {
    this.todo = [];
    this.inprogress = [];
    this.awaitfeedback = [];
    this.done = [];
  }

  /**
   * Loads subtasks for each task and stores them in a lookup table by task ID.
   * @private
   * @returns {void}
   */
  private loadSubtasks(): void {
    for (const task of this.taskList) {
      if (task.id) {
        this.taskService.getSubtasks(task.id).subscribe((subtasks) => {
          this.subtasksByTaskId[task.id!] = subtasks;
        });
      }
    }
  }

  /**
   * Returns the subtasks for a given task ID.
   * @param {string | undefined} taskId - The ID of the task to retrieve subtasks for
   * @returns {Subtask[]} Array of subtasks, or an empty array if none exist
   */
  getSubtasksForTask(taskId: string | undefined): Subtask[] {
    if (!taskId) {
      return [];
    }
    return this.subtasksByTaskId[taskId] || [];
  }

  /**
   * Returns the subtasks assigned to the currently selected task.
   * @param {Task | undefined} selectedTask - The currently selected task
   * @returns {Subtask[]} Array of subtasks, or an empty array if none are found
   */
  getSubtasksForSelectedTask(selectedTask: Task | undefined): Subtask[] {
    if (selectedTask?.id) {
      return this.subtasksByTaskId[selectedTask.id] || [];
    }
    return [];
  }

  /**
   * Updates task lists after status changes
   * @returns {void}
   */
  updateTaskLists(): void {
    this.todo = this.sortTasksByDueDate(this.todo);
    this.inprogress = this.sortTasksByDueDate(this.inprogress);
    this.awaitfeedback = this.sortTasksByDueDate(this.awaitfeedback);
    this.done = this.sortTasksByDueDate(this.done);
  }

  /**
   * Clears all data and unsubscribes
   * @returns {void}
   */
  destroy(): void {
    if (this.unsubTask) {
      this.unsubTask.unsubscribe();
    }
    this.emptyArrays();
    this.taskList = [];
    this.subtasksByTaskId = {};
  }
}