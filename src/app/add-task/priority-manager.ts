import { Injectable } from '@angular/core';
import { CategoryManager } from './category-manager';

/**
 * PriorityManager handles all priority-related operations for the AddTaskComponent.
 * Manages priority selection and provides integration with category management.
 * Supports three priority levels: low, medium, and urgent.
 * 
 * @example
 * // Inject in component
 * constructor(private priorityManager: PriorityManager) {}
 * 
 * // Set priority
 * this.priorityManager.setPriority('urgent');
 * 
 * // Access selected priority
 * const priority = this.priorityManager.selectedPriority;
 */
@Injectable({
  providedIn: 'root'
})

export class PriorityManager {
  /** Currently selected priority level, defaults to medium */
  selectedPriority: string = 'medium';

  /**
   * Creates an instance of PriorityManager.
   * @param categoryManager - Category manager for coordinated operations
   */
  constructor(
    public categoryManager: CategoryManager
  ) { }

  /**
   * Sets the task priority level.
   * Updates the currently selected priority for the task.
   * 
   * @param priority - The priority level to set ('low', 'medium', 'urgent')
   */
  setPriority(priority: string) {
    this.selectedPriority = priority;
  }
  
  /**
   * Sets the selected priority and category from a task object.
   * Used when editing existing tasks to populate both priority and category.
   * Coordinates with category manager to ensure consistent state.
   *
   * @param task - The task object containing priority and category data
   */
  public setPriorityAndCategory(task: any): void {
    this.selectedPriority = task.priority || 'medium';
    this.categoryManager.setSelectedCategory(task.category);
  }
}