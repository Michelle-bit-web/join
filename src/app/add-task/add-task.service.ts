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

  constructor(
    private taskService: TaskService,
    private uploadService: UploadService,
    private formValidator: FormValidatorService,
    private taskDataService: TaskDataService,
    private router: Router
  ) { }

  /**
   * Sets up edit mode with task data.
   */
  async setupEditMode(component: any, task: Task): Promise<void> {
    this.enterEditMode(component, task);
    await this.populateFormWithTaskData(component, task);
    this.loadImagesIfAvailable(component, task);
    this.taskService.clearEditingTask();
  }

  private enterEditMode(component: any, task: Task): void {
    component.isEditingMode = true;
    component.editingTaskId = task.id;
    component.editingTask = task;
  }

  private async populateFormWithTaskData(component: any, task: Task): Promise<void> {
    component.originalTaskStatus = await this.taskDataService.populateFromTask(
      task, component.formData, component.priorityManager,
      component.contactManager, component.subtaskManager, component.contacts
    ) as 'to-do' | 'in-progress' | 'await-feedback' | 'done';
    if (task.category) {
      component.categoryManager.setSelectedCategory(task.category);
    }
  }

  private loadImagesIfAvailable(component: any, task: Task): void {
    if (task.imageKey && task.imageKey.length > 0) {
      component.loadImages();
    }
  }

  /**
   * Resets form data to default state.
   */
  resetFormData(component: any): void {
    component.formData = { title: '', description: '', dueDate: '' };
    component.priorityManager.selectedPriority = 'medium';
    component.showSuccessMessage = false;
  }

  /**
   * Resets task-related flags and IDs.
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
   */
  resetManagers(component: any): void {
    component.contactManager.clearAll();
    component.categoryManager.clearAll();
    component.subtaskManager.clearAll();
  }

  /**
   * Clears uploaded images from task and component.
   */
  clearUploadedImages(component: any): void {
    component.taskImages = [];
    if (component.uploadsComponent) {
      component.uploadsComponent.clearImages();
    }
  }

  /**
   * Validates form and sets validation errors.
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

  private async saveTaskWithSuccessFeedback(component: any): Promise<void> {
    await this.saveTask(component);
    component.taskAdded.emit('added');
    component.showSuccessMessage = true;
    setTimeout(() => {
      component.clearForm();
      this.router.navigate(['/board']);
    }, 2000);
  }

  private async saveTask(component: any): Promise<void> {
    if (component.isEditingMode && component.editingTaskId) {
      await this.updateTask(component);
    } else {
      await this.addNewTask(component);
    }
  }

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

  private async saveUploadedImages(component: any): Promise<void> {
    for (const img of component.uploadsComponent.uploadedImages) {
      await this.uploadService.saveImage(img);
    }
    component.uploadsComponent.uploadedImages = [];
  }

  private buildNewTask(component: any): Task {
    return this.taskDataService.buildTask(
      component.formData, component.defaultStatus, component.priorityManager,
      component.contactManager, component.categoryManager, undefined
    );
  }

  async updateTask(component: any): Promise<void> {
    const previousImageKeys = component.editingTask?.imageKey ?? [];
    const currentImages = component.uploadsComponent.allImages();
    const currentImageKeys = currentImages.map((img: any) => img.imageKey);
    await this.handleImageUpdates(previousImageKeys, currentImages, currentImageKeys);
    await this.updateTaskData(component, currentImageKeys);
  }

  private async handleImageUpdates(previousKeys: string[], currentImages: any[], currentKeys: string[]): Promise<void> {
    const removedKeys = previousKeys.filter(key => !currentKeys.includes(key));
    if (removedKeys.length > 0) {
      this.uploadService.deleteImages(removedKeys);
    }
    this.uploadService.saveImages(currentImages);
  }

  private async updateTaskData(component: any, currentImageKeys: string[]): Promise<void> {
    (component.formData as any).images = currentImageKeys;
    component.taskImages = currentImageKeys;
    const updatedTask = this.buildUpdatedTask(component);
    await this.taskService.updateTask(component.editingTask!.id!, updatedTask);
    await this.updateSubtasks(component);
    this.taskService.clearEditingTask();
  }

  private buildUpdatedTask(component: any): Task {
    return this.taskDataService.buildTask(
      component.formData, component.originalTaskStatus, component.priorityManager,
      component.contactManager, component.categoryManager, component.editingTaskId
    );
  }

  private async updateSubtasks(component: any): Promise<void> {
    const currentSubtasks = component.subtaskManager.getSubtasks();
    const deleted = component.subtaskManager.getDeletedSubtasks(currentSubtasks);
    await component.subtaskManager.deleteSubtasks(component.editingTaskId!, deleted);
    await component.subtaskManager.syncSubtasks(component.editingTaskId!, currentSubtasks);
  }

  /**
   * Cleans up resources when closing overlay.
   */
  cleanupOnClose(component: any): void {
    if (component.uploadsComponent) {
      component.uploadsComponent.uploadedImages.forEach((image: any) => {
        this.uploadService.deleteImage(image.imageKey);
      });
    }
  }
}
