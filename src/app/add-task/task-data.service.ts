import { Injectable } from '@angular/core';
import { Contact } from '../services/contact.service';
import { Task } from '../services/task.service';
import { ContactManager } from './contact-manager';
import { CategoryManager } from './category-manager';
import { PriorityManager } from './priority-manager';
import { SubtaskManager } from './subtask-manager';

/**
 * Extended interface for form data including optional images array.
 */
export interface FormData {
  /** Task title */
  title: string;
  /** Task description */
  description: string;
  /** Due date in string format */
  dueDate: string;
  /** Optional array of image keys */
  images?: string[];
}

/**
 * Service for managing task data operations and form population.
 * Handles conversion between form data and task objects, manages date formatting,
 * and coordinates with various manager services for complete task data handling.
 *
 * @example
 * // Inject in component
 * constructor(private taskDataService: TaskDataService) {}
 *
 * // Build task from form
 * const task = this.taskDataService.buildTask(formData, status, managers...);
 *
 * // Populate form from task
 * await this.taskDataService.populateFromTask(task, formData, managers...);
 */
@Injectable({
  providedIn: 'root'
})

export class TaskDataService {

  /**
   * Creates an instance of TaskDataService.
   */
  constructor() { }

  /**
   * Populates form and managers with data from an existing task.
   * Converts task data to form-compatible format and updates all managers.
   *
   * @param task - The task object to populate from
   * @param formData - The form data object to populate
   * @param priorityManager - Manager for priority settings
   * @param contactManager - Manager for assigned contacts
   * @param subtaskManager - Manager for subtasks
   * @param contacts - Array of all available contacts
   * @returns Promise resolving to the original task status
   */
  async populateFromTask(
    task: any,
    formData: FormData,
    priorityManager: PriorityManager,
    contactManager: ContactManager,
    subtaskManager: SubtaskManager,
    contacts: Contact[]
  ): Promise<string> {
    this.setBasicFormData(task, formData);
    this.setDueDate(task.date, formData);
    priorityManager.setPriorityAndCategory(task);
    this.setAssignedContacts(task.assignedTo, contactManager, contacts);
    if (task.id) {
      subtaskManager.loadAndSetSubtasks(task.id);
    }
    return task.status || 'to-do';
  }

  /**
   * Builds a task object from current form and manager states.
   * Creates a complete Task object with all necessary properties.
   *
   * @param formData - The current form data
   * @param status - The task status
   * @param priorityManager - Manager containing priority selection
   * @param contactManager - Manager containing assigned contacts
   * @param categoryManager - Manager containing category selection
   * @param id - Optional existing task ID for updates
   * @returns Complete Task object ready for storage
   */
  buildTask(
    formData: FormData,
    status: string,
    priorityManager: PriorityManager,
    contactManager: ContactManager,
    categoryManager: CategoryManager,
    id?: string
  ): Task {
    const uniqueContactIds = this.getUniqueAssignedContactIds(contactManager);
    const task: any = {
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      date: new Date(formData.dueDate),
      priority: priorityManager.selectedPriority as 'low' | 'medium' | 'urgent',
      status,
      assignedTo: uniqueContactIds,
      category: categoryManager.getSelectedCategory() as 'technical' | 'user story',
      imageKey: formData.images || [],
    };
    if (id) {
      task.id = id;
    }
    return task as Task;
  }

  /**
   * Sets basic form data fields from task object.
   * Populates title and description from task data.
   *
   * @param task - The task object containing basic data
   * @param formData - The form data object to update
   * @private
   */
  private setBasicFormData(task: any, formData: FormData): void {
    formData.title = task.title || '';
    formData.description = task.description || '';
  }

  /**
   * Sets the due date in form data from various date formats.
   * Handles Firestore Timestamp, Date objects, and string dates.
   *
   * @param date - The date in various possible formats
   * @param formData - The form data object to update
   * @private
   */
  private setDueDate(date: any, formData: FormData): void {
    if (!date) return;
    let dateValue: Date;
    if (date.toDate) {
      dateValue = date.toDate();
    } else if (date instanceof Date) {
      dateValue = date;
    } else {
      dateValue = new Date(date);
    }
    formData.dueDate = dateValue.toISOString().split('T')[0];
  }

  /**
   * Sets assigned contacts in the contact manager from task data.
   * Filters and matches contact IDs with available contacts.
   *
   * @param assignedToIds - Array of contact IDs assigned to task
   * @param contactManager - Manager to update with selected contacts
   * @param contacts - Array of all available contacts
   * @private
   */
  private setAssignedContacts(assignedToIds: string[], contactManager: ContactManager, contacts: Contact[]): void {
    if (!assignedToIds || assignedToIds.length === 0) return;
    const selectedContacts = contacts
      .filter(contact => contact.id !== undefined)
      .filter(contact => assignedToIds.includes(contact.id as string));
    contactManager.setSelectedContacts(selectedContacts);
  }

  /**
   * Gets unique contact IDs from the contact manager.
   * Filters out undefined IDs and removes duplicates.
   *
   * @param contactManager - Manager containing selected contacts
   * @returns Array of unique contact ID strings
   * @private
   */
  private getUniqueAssignedContactIds(contactManager: ContactManager): string[] {
    const contacts = contactManager.getSelectedContacts();
    return [...new Set(contacts.map(c => c.id).filter(id => id !== undefined))] as string[];
  }
}