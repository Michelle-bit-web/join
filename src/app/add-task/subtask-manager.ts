import { Injectable } from '@angular/core';
import { TaskService, Task } from '../services/task.service';

/**
 * Interface representing a subtask with local state management.
 */
export interface Subtask {
  /** Unique identifier (string for Firestore, number for local) */
  id: string | number;
  /** The subtask description text */
  text: string;
  /** Whether the subtask is completed */
  completed: boolean;
}

/**
 * SubtaskManager handles all subtask-related operations for the AddTaskComponent.
 * Manages local subtask state, editing functionality, and synchronization with Firestore.
 * Provides comprehensive CRUD operations for subtasks with optimistic UI updates.
 * 
 * @example
 * // Inject in component
 * constructor(private subtaskManager: SubtaskManager) {}
 * 
 * // Add a subtask
 * this.subtaskManager.addSubtask();
 * 
 * // Save all subtasks to a task
 * await this.subtaskManager.saveAllSubtasks(taskId, subtasks);
 */
@Injectable({
  providedIn: 'root'
})

export class SubtaskManager {
  /** Array of current subtasks in local state */
  private subtasks: Subtask[] = [];
  
  /** Counter for generating unique local subtask IDs */
  private nextSubtaskId: number = 1;
  
  /** ID of subtask currently being edited */
  private editingSubtaskId: string | number | null = null;
  
  /** Text content of subtask being edited */
  private editingSubtaskText: string = '';
  
  /** Current value of subtask input field */
  private subtaskInput: string = '';
  
  /** Whether subtask confirmation UI is shown */
  private showSubtaskConfirmation: boolean = false;
  
  /** Original subtasks from Firestore for comparison */
  originalSubtasks: Subtask[] = [];

  /**
   * Creates an instance of SubtaskManager.
   * @param taskService - Service for Firestore subtask operations
   */
  constructor( private taskService: TaskService ){}

  /**
   * Gets all current subtasks.
   * @returns Array of all subtasks in local state
   */
  getSubtasks(): Subtask[] {
    return this.subtasks;
  }

  /**
   * Sets the subtasks array and updates ID counter.
   * @param subtasks - Array of subtasks to set as current state
   */
  setSubtasks(subtasks: Subtask[]): void {
    this.subtasks = subtasks;
    this.nextSubtaskId = subtasks.length + 1;
  }

  /**
   * Gets the current subtask input value.
   * @returns Current input field value
   */
  getSubtaskInput(): string {
    return this.subtaskInput;
  }

  /**
   * Sets the subtask input value.
   * @param value - New input field value
   */
  setSubtaskInput(value: string): void {
    this.subtaskInput = value;
  }

  /**
   * Gets the subtask confirmation UI visibility state.
   * @returns True if confirmation buttons are shown
   */
  getShowSubtaskConfirmation(): boolean {
    return this.showSubtaskConfirmation;
  }

  /**
   * Sets the subtask confirmation UI visibility state.
   * @param value - True to show confirmation UI, false to hide
   */
  setShowSubtaskConfirmation(value: boolean): void {
    this.showSubtaskConfirmation = value;
  }

  /**
   * Gets the ID of the subtask currently being edited.
   * @returns ID of editing subtask or null if none
   */
  getEditingSubtaskId(): string | number | null {
    return this.editingSubtaskId;
  }

  /**
   * Gets the text of the subtask currently being edited.
   * @returns Text content of editing subtask
   */
  getEditingSubtaskText(): string {
    return this.editingSubtaskText;
  }

  /**
   * Sets the text of the subtask currently being edited.
   * @param value - New text content for editing subtask
   */
  setEditingSubtaskText(value: string): void {
    this.editingSubtaskText = value;
  }

  /**
   * Handles subtask input click to clear placeholder text.
   * Clears input if confirmation UI is not currently shown.
   */
  onSubtaskInputClick(): void {
    if (!this.showSubtaskConfirmation) {
      this.subtaskInput = '';
    }
  }

  /**
   * Handles Enter key press on subtask input to add the subtask.
   * Prevents default form submission and adds subtask if input has content.
   * 
   * @param event - The keyboard event from Enter key press
   */
  onSubtaskEnter(event: Event): void {
    event.preventDefault();
    if (this.subtaskInput && this.subtaskInput.trim()) {
      this.addSubtask();
    }
  }

  /**
   * Confirms and adds the subtask from current input.
   * Prevents event propagation and adds subtask to local state.
   * 
   * @param event - The event that triggered the confirmation
   */
  confirmSubtask(event: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.addSubtask();
    this.showSubtaskConfirmation = false;
  }

  /**
   * Cancels subtask creation and clears the input.
   * Resets input field and hides confirmation UI.
   */
  cancelSubtask(): void {
    this.subtaskInput = '';
    this.showSubtaskConfirmation = false;
  }

  /**
   * Adds a new subtask to the local task state.
   * Creates subtask with unique ID and adds to subtasks array.
   */
  addSubtask(): void {
    if (this.subtaskInput && this.subtaskInput.trim()) {
      const newSubtask: Subtask = {
        id: this.nextSubtaskId++,
        text: this.subtaskInput.trim(),
        completed: false
      };
      this.subtasks.push(newSubtask);
      this.subtaskInput = '';
      this.showSubtaskConfirmation = false;
    }
  }

  /**
   * Deletes a subtask by its ID from local state.
   * @param id - The ID of the subtask to delete
   */
  deleteSubtask(id: string | number): void {
    this.subtasks = this.subtasks.filter(subtask => subtask.id !== id);
  }

  /**
   * Edits the text of an existing subtask in local state.
   * @param id - The ID of the subtask to edit
   * @param newText - The new text content for the subtask
   */
  editSubtask(id: string | number, newText: string): void {
    const subtask = this.subtasks.find(s => s.id === id);
    if (subtask) {
      subtask.text = newText.trim();
    }
  }

  /**
   * Initiates editing mode for a subtask.
   * Sets editing state and focuses the edit input with current text.
   * 
   * @param id - The ID of the subtask to edit
   * @param currentText - The current text of the subtask
   */
  editSubtaskPrompt(id: string | number, currentText: string): void {
    this.editingSubtaskId = id;
    this.editingSubtaskText = currentText;
    setTimeout(() => {
      const inputElement = document.querySelector('.subtask-edit-input') as HTMLInputElement;
      if (inputElement) {
        inputElement.value = this.editingSubtaskText;
        inputElement.focus();
        inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
      }
    }, 100);
  }

  /**
   * Saves the edited subtask text and exits editing mode.
   * Updates subtask with new text if valid, then clears editing state.
   */
  saveSubtaskEdit(): void {
    if (this.editingSubtaskId !== null) {
      if (this.editingSubtaskText && this.editingSubtaskText.trim()) {
        this.editSubtask(this.editingSubtaskId, this.editingSubtaskText.trim());
      }
      this.cancelSubtaskEdit();
    }
  }

  /**
   * Cancels subtask editing mode without saving changes.
   * Resets editing state without applying changes.
   */
  cancelSubtaskEdit(): void {
    this.editingSubtaskId = null;
    this.editingSubtaskText = '';
  }

  /**
   * Handles keyboard shortcuts for subtask editing.
   * Supports Enter to save and Escape to cancel editing.
   * 
   * @param event - The keyboard event
   */
  onSubtaskEditKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveSubtaskEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelSubtaskEdit();
    }
  }

  /**
   * Toggles the completion state of a subtask.
   * Switches between completed and incomplete status.
   * 
   * @param id - The ID of the subtask to toggle
   */
  toggleSubtaskCompletion(id: string | number): void {
    const subtask = this.subtasks.find(s => s.id === id);
    if (subtask) {
      subtask.completed = !subtask.completed;
    }
  }

  /**
   * Clears all subtask data and resets to default state.
   * Resets all arrays and state variables to initial values.
   */
  clearAll(): void {
    this.subtasks = [];
    this.subtaskInput = '';
    this.nextSubtaskId = 1;
    this.editingSubtaskId = null;
    this.editingSubtaskText = '';
    this.showSubtaskConfirmation = false;
  }

  /**
   * Saves all given subtasks to the task with the specified ID.
   * Persists local subtasks to Firestore as a batch operation.
   * 
   * @param taskId - The ID of the task to add subtasks to
   * @param subtasks - The list of subtasks to be saved
   * @returns Promise that resolves when all subtasks are saved
   */
  public async saveAllSubtasks(taskId: string, subtasks: any[]): Promise<void> {
    for (const subtask of subtasks) {
      await this.taskService.addSubtask(taskId, {
        title: subtask.text,
        isCompleted: subtask.completed
      });
    }
  }

  /**
   * Returns a list of original subtasks that have been deleted.
   * Compares original subtasks with current ones to find deletions.
   * 
   * @param currentSubtasks - The current list of subtasks in the form
   * @returns Array of subtasks that were deleted
   */
  public getDeletedSubtasks(currentSubtasks: any[]): any[] {
    return this.originalSubtasks.filter(original =>
      typeof original.id === 'string' &&
      original.id.length > 0 &&
      !currentSubtasks.some(current => current.id === original.id)
    );
  }

  /**
   * Deletes the given subtasks from the specified task in Firestore.
   * Removes subtasks that exist in Firestore but not in local state.
   * 
   * @param taskId - The ID of the task
   * @param subtasks - The subtasks to delete
   * @returns Promise that resolves when deletion is complete
   */
  public async deleteSubtasks(taskId: string, subtasks: any[]): Promise<void> {
    for (const subtask of subtasks) {
      if (typeof subtask.id === 'string') {
        await this.taskService.deleteSubtask(taskId, subtask.id);
      }
    }
  }

  /**
   * Syncs all current subtasks (add or update) with Firestore.
   * Updates existing subtasks or creates new ones as needed.
   * 
   * @param taskId - The ID of the task to sync with
   * @param subtasks - The current list of subtasks in the form
   * @returns Promise that resolves when synchronization is complete
   */
  public async syncSubtasks(taskId: string, subtasks: any[]): Promise<void> {
    for (const subtask of subtasks) {
      const subtaskData = {
        title: subtask.text,
        isCompleted: subtask.completed
      };
      if (typeof subtask.id === 'string' && subtask.id.length > 0) {
        await this.taskService.updateSubtask(taskId, subtask.id, subtaskData);
      } else {
        await this.taskService.addSubtask(taskId, subtaskData);
      }
    }
  }

  /**
   * Loads subtasks for the given task ID and sets them in local state.
   * Retrieves subtasks from Firestore and converts to local format.
   *
   * @param taskId - The ID of the task whose subtasks should be loaded
   */
  public loadAndSetSubtasks(taskId: string): void {
    this.taskService.getSubtasks(taskId).subscribe(subtasks => {
      const mappedSubtasks = subtasks.map(subtask => ({
        id: subtask.id || '',
        text: subtask.title,
        completed: subtask.isCompleted,
      }));
      this.setSubtasks(mappedSubtasks);
      this.originalSubtasks = [...mappedSubtasks];
    });
  }
}