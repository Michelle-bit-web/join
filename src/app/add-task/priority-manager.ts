import { Injectable } from '@angular/core';
import { CategoryManager } from './category-manager';

/**
 * PriorityManager handles all priority-related operations for the AddTaskComponent.
 * This includes setting priority management.
 */
@Injectable({
  providedIn: 'root'
})

export class PriorityManager {
  selectedPriority: string = 'medium';

  constructor(
    public categoryManager: CategoryManager
  ) { }

   /**
   * Sets the task priority.
   * @param priority - The priority level to set ('low', 'medium', 'urgent').
   */
  setPriority(priority: string) {
    this.selectedPriority = priority;
  }
  
  /**
   * Sets the selected priority and category in their respective managers.
   *
   * @param task - The task object.
   */
  public setPriorityAndCategory(task: any): void {
    this.selectedPriority = task.priority || 'medium';
    this.categoryManager.setSelectedCategory(task.category || '');
  }

}
