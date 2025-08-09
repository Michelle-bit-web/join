import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Task, TaskService } from '../services/task.service';
import { UploadService } from '../services/upload.service';
import { FormValidatorService } from './form-validator.service';
import { TaskDataService } from './task-data.service';

/**
 * Service for handling complex AddTask component operations.
 */
@Injectable({
  providedIn: 'root'
})
export class AddTaskService {

  /**
   * Creates an instance of AddTaskService.
   * @param {TaskService} taskService - Service for task-related operations and data access
   * @param {UploadService} uploadService - Service for handling image uploads and storage
   * @param {FormValidatorService} formValidator - Service for validating form data
   * @param {TaskDataService} taskDataService - Service for building and populating task objects
   * @param {Router} router - Angular Router service for navigation
   */
  constructor(
    private taskService: TaskService,
    private uploadService: UploadService,
    private formValidator: FormValidatorService,
    private taskDataService: TaskDataService,
    private router: Router
  ) { }

  /**
   * Sets up edit mode with task data.
   * @param {any} component - The AddTask component instance
   * @param {Task} task - The task to edit
   * @returns {Promise<void>} Promise that resolves when setup is complete
   */
  async setupEditMode(component: any, task: Task): Promise<void> {
    this.enterEditMode(component, task);
    await this.populateFormWithTaskData(component, task);
    this.loadImagesIfAvailable(component, task);
    this.taskService.clearEditingTask();
  }

  /**
   * Enters edit mode by setting component flags and task reference.
   * @private
   * @param {any} component - The AddTask component instance
   * @param {Task} task - The task being edited
   * @returns {void}
   */
  private enterEditMode(component: any, task: Task): void {
    component.isEditingMode = true;
    component.editingTaskId = task.id;
    component.editingTask = task;
  }

  /**
   * Populates the form with existing task data.
   * @private
   * @param {any} component - The AddTask component instance
   * @param {Task} task - The task data to populate from
   * @returns {Promise<void>} Promise that resolves when form is populated
   */
  private async populateFormWithTaskData(component: any, task: Task): Promise<void> {
    component.originalTaskStatus = await this.taskDataService.populateFromTask(
      task, component.formData, component.priorityManager,
      component.contactManager, component.subtaskManager, component.contacts
    ) as 'to-do' | 'in-progress' | 'await-feedback' | 'done';
    if (task.category) {
      component.categoryManager.setSelectedCategory(task.category);
    }
  }

  /**
   * Loads images if the task has associated image keys.
   * @private
   * @param {any} component - The AddTask component instance
   * @param {Task} task - The task that may contain images
   * @returns {void}
   */
  private loadImagesIfAvailable(component: any, task: Task): void {
    if (task.imageKey && task.imageKey.length > 0) {
      component.loadImages();
    }
  }

  /**
   * Resets form data to default state.
   * @param {any} component - The AddTask component instance
   * @returns {void}
   */
  resetFormData(component: any): void {
    component.formData = { title: '', description: '', dueDate: '' };
    component.priorityManager.selectedPriority = 'medium';
    component.showSuccessMessage = false;
  }

  /**
   * Resets task-related flags and IDs.
   * @param {any} component - The AddTask component instance
   * @returns {void}
   */
  resetTaskState(component: any): void {
    component.isCreatingTask = false;
    component.isEditingMode = false;
    component.editingTaskId = undefined;
    component.originalTaskStatus = 'to-do';
    component.subtaskManager.originalSubtasks = [];
  }

  /**
   * Clears all manager selections.
   * @param {any} component - The AddTask component instance
   * @returns {void}
   */
  resetManagers(component: any): void {
    component.contactManager.clearAll();
    component.categoryManager.clearAll();
    component.subtaskManager.clearAll();
  }

  /**
   * Clears uploaded images from task and component.
   * @param {any} component - The AddTask component instance
   * @returns {void}
   */
  clearUploadedImages(component: any): void {
    component.taskImages = [];
    if (component.uploadsComponent) {
      component.uploadsComponent.clearImages();
    }
  }

  /**
   * Validates form and sets validation errors.
   * @param {any} component - The AddTask component instance
   * @returns {boolean} True if validation errors exist, false otherwise
   */
  validateForm(component: any): boolean {
    if (this.formValidator.hasFormErrors(component.formData, component.categoryManager)) {
      component.validationErrors = this.formValidator.validateForm(
        component.formData, component.categoryManager
      );
      return true;
    }
    return false;
  }

  /**
   * Processes task creation with error handling.
   * @param {any} component - The AddTask component instance
   * @returns {Promise<void>} Promise that resolves when task processing is complete
   */
  async processTaskCreation(component: any): Promise<void> {
    component.isCreatingTask = true;
    try {
      component.taskImages = component.uploadsComponent.getImageKeys();
      await this.saveTaskWithSuccessFeedback(component);
    } catch (error) {
      console.error('Error while creating/updating task:', error);
    } finally {
      component.isCreatingTask = false;
    }
  }

  /**
   * Saves task and provides success feedback to user.
   * @private
   * @param {any} component - The AddTask component instance
   * @returns {Promise<void>} Promise that resolves when task is saved and feedback shown
   */
  private async saveTaskWithSuccessFeedback(component: any): Promise<void> {
    await this.saveTask(component);
    component.taskAdded.emit('added');
    component.showSuccessMessage = true;
    setTimeout(() => {
      component.clearForm();
      this.router.navigate(['/board']);
    }, 2000);
  }

  /**
   * Determines whether to update existing task or create new one.
   * @private
   * @param {any} component - The AddTask component instance
   * @returns {Promise<void>} Promise that resolves when task is saved
   */
  private async saveTask(component: any): Promise<void> {
    if (component.isEditingMode && component.editingTaskId) {
      await this.updateTask(component);
    } else {
      await this.addNewTask(component);
    }
  }

  /**
   * Creates and saves a new task with subtasks.
   * @private
   * @param {any} component - The AddTask component instance
   * @returns {Promise<void>} Promise that resolves when new task is created
   */
  private async addNewTask(component: any): Promise<void> {
    if (!component.defaultStatus) component.defaultStatus = 'to-do';
    (component.formData as any).images = component.taskImages;
    await this.saveUploadedImages(component);
    const newTask: Task = this.buildNewTask(component);
    const savedTask = await this.taskService.addTask(newTask);
    if (savedTask?.id) {
      await component.subtaskManager.saveAllSubtasks(
        savedTask.id, component.subtaskManager.getSubtasks()
      );
    }
  }

  /**
   * Saves all uploaded images to the upload service.
   * @private
   * @param {any} component - The AddTask component instance
   * @returns {Promise<void>} Promise that resolves when all images are saved
   */
  private async saveUploadedImages(component: any): Promise<void> {
    for (const img of component.uploadsComponent.uploadedImages) {
      await this.uploadService.saveImage(img);
    }
    component.uploadsComponent.uploadedImages = [];
  }

  /**
   * Builds a new task object from component data.
   * @private
   * @param {any} component - The AddTask component instance
   * @returns {Task} The newly built task object
   */
  private buildNewTask(component: any): Task {
    return this.taskDataService.buildTask(
      component.formData, component.defaultStatus, component.priorityManager,
      component.contactManager, component.categoryManager, undefined
    );
  }

  /**
   * Updates an existing task with new data and handles image changes.
   * @param {any} component - The AddTask component instance
   * @returns {Promise<void>} Promise that resolves when task is updated
   */
  async updateTask(component: any): Promise<void> {
    const previousImageKeys = component.editingTask?.imageKey ?? [];
    const currentImages = component.uploadsComponent.allImages();
    const currentImageKeys = currentImages.map((img: any) => img.imageKey);
    await this.handleImageUpdates(previousImageKeys, currentImages, currentImageKeys);
    await this.updateTaskData(component, currentImageKeys);
  }

  /**
   * Handles adding new images and removing deleted images.
   * @private
   * @param {string[]} previousKeys - Array of previous image keys
   * @param {any[]} currentImages - Array of current image objects
   * @param {string[]} currentKeys - Array of current image keys
   * @returns {Promise<void>} Promise that resolves when image updates are complete
   */
  private async handleImageUpdates(previousKeys: string[], currentImages: any[], currentKeys: string[]): Promise<void> {
    const removedKeys = previousKeys.filter(key => !currentKeys.includes(key));
    if (removedKeys.length > 0) {
      this.uploadService.deleteImages(removedKeys);
    }
    this.uploadService.saveImages(currentImages);
  }

  /**
   * Updates task data with new information and image keys.
   * @private
   * @param {any} component - The AddTask component instance
   * @param {string[]} currentImageKeys - Array of current image keys
   * @returns {Promise<void>} Promise that resolves when task data is updated
   */
  private async updateTaskData(component: any, currentImageKeys: string[]): Promise<void> {
    (component.formData as any).images = currentImageKeys;
    component.taskImages = currentImageKeys;
    const updatedTask = this.buildUpdatedTask(component);
    await this.taskService.updateTask(component.editingTask!.id!, updatedTask);
    await this.updateSubtasks(component);
    this.taskService.clearEditingTask();
  }

  /**
   * Builds an updated task object for existing task modification.
   * @private
   * @param {any} component - The AddTask component instance
   * @returns {Task} The updated task object
   */
  private buildUpdatedTask(component: any): Task {
    return this.taskDataService.buildTask(
      component.formData, component.originalTaskStatus, component.priorityManager,
      component.contactManager, component.categoryManager, component.editingTaskId
    );
  }

  /**
   * Synchronizes subtasks by deleting removed ones and updating existing ones.
   * @private
   * @param {any} component - The AddTask component instance
   * @returns {Promise<void>} Promise that resolves when subtasks are synchronized
   */
  private async updateSubtasks(component: any): Promise<void> {
    const currentSubtasks = component.subtaskManager.getSubtasks();
    const deleted = component.subtaskManager.getDeletedSubtasks(currentSubtasks);
    await component.subtaskManager.deleteSubtasks(component.editingTaskId!, deleted);
    await component.subtaskManager.syncSubtasks(component.editingTaskId!, currentSubtasks);
  }

  /**
   * Cleans up resources when closing overlay.
   * @param {any} component - The AddTask component instance
   * @returns {void}
   */
  cleanupOnClose(component: any): void {
    if (component.uploadsComponent) {
      component.uploadsComponent.uploadedImages.forEach((image: any) => {
        this.uploadService.deleteImage(image.imageKey);
      });
    }
  }
}