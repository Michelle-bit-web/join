import { Component, ViewChild, OnInit, OnDestroy, HostListener, Output, Input, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService, Contact } from '../services/contact.service';
import { TaskService, Task } from '../services/task.service';
import { Router, ActivatedRoute } from '@angular/router';
import { SubtaskManager } from './subtask-manager';
import { ContactManager } from './contact-manager';
import { CategoryManager } from './category-manager';
import { PriorityManager } from './priority-manager';
import { FormValidatorService, FormData, ValidationErrors } from './form-validator.service';
import { TaskDataService } from './task-data.service';
import { UploadsComponent } from './uploads/uploads.component';
import { UploadedImage, UploadService } from '../services/upload.service';

/**
 * AddTaskComponent provides a comprehensive form for creating and editing tasks.
 * It supports task creation with priority, category, assigned contacts, due dates and subtasks.
 * The component can operate in both standalone mode and overlay mode, and handles both creating new tasks and editing existing ones.
 *
 * @example
 * <app-add-task 
 *   [defaultStatus]="'to-do'" 
 *   [isOverlayMode]="true"
 *   (taskAdded)="handleTaskAdded($event)"
 *   (closeOverlay)="handleClose()">
 * </app-add-task>
 */
@Component({
  selector: 'app-add-task',
  imports: [CommonModule, FormsModule, UploadsComponent],
  templateUrl: './add-task.component.html',
  styleUrl: './add-task.component.scss'
})

export class AddTaskComponent implements OnInit, OnDestroy {
  @Output() taskAdded = new EventEmitter<string>;
  @Output() closeOverlay = new EventEmitter<void>();
  @Input() defaultStatus = '';
  @Input() isOverlayMode = false;
  @ViewChild(UploadsComponent) uploadsComponent!: UploadsComponent;

  contacts: Contact[] = [];
  subtaskInputFocused = false;
  isCreatingTask: boolean = false;
  showSuccessMessage: boolean = false;
  originalTaskStatus: 'to-do' | 'in-progress' | 'await-feedback' | 'done' = 'to-do';
  isEditingMode: boolean = false;
  editingTaskId: string | undefined;
  editingTask: Task | undefined;
  taskImages: string[] = [];
  uploadedImages: UploadedImage[] = [];
  validationErrors: ValidationErrors = { showTitleError: false, showDateError: false };
  formCleared = false;

  formData: FormData = {
    title: '',
    description: '',
    dueDate: ''
  };

  /**
   * Constructor injecting required services for task management.
   * @param contactService - Service for managing contact operations.
   * @param taskService - Service for managing task operations.
   * @param router - Angular Router for navigation.
   * @param route - ActivatedRoute for accessing route parameters.
   * @param subtaskManager - Service for managing subtask operations.
   * @param contactManager - Service for managing contact operations.
   * @param categoryManager - Service for managing category operations.
   */
  constructor(
    private contactService: ContactService,
    private taskService: TaskService,
    private router: Router,
    private route: ActivatedRoute,
    private formValidator: FormValidatorService,
    private taskDataService: TaskDataService,
    public subtaskManager: SubtaskManager,
    public contactManager: ContactManager,
    public categoryManager: CategoryManager,
    public priorityManager: PriorityManager,
    private uploadService: UploadService,
  ) { }

  /**
   * Initializes the component by loading the status and contacts.
   */
  ngOnInit() {
    this.loadStatus();
    this.loadContacts();
  }

  /**
   * Lifecycle hook that runs when the component is destroyed.
   * Clears all form data and manager states to prevent state leaking.
   */
  ngOnDestroy() {
    this.clearForm();
  }

  /**
   * Loads the default status from route query parameters.
   */
  loadStatus() {
    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.defaultStatus = params['status'];
      }
    });
  }

  /**
   * Loads all contacts from the ContactService and then loads any task being edited.
   */
  async loadContacts() {
    this.contactService.getContacts().subscribe(async contacts => {
      this.contacts = contacts;
      await this.loadEditingTask();
    });
  }

  onImagesChanged(images: UploadedImage[]) {
    this.taskImages = images.map(img => img.imageKey);
  }

  async loadImages() {
    if (this.editingTask && this.editingTask.images) {
      this.taskImages = [...this.editingTask.images];
      this.uploadedImages = this.uploadService.getImagesByKeys(this.taskImages);
      console.log('[AddTask] Uploaded images', this.uploadedImages);
    }
  }

  /**
   * Clears all internal managers (contact, category, subtask)
   * to prevent leaking state between tasks.
   */
  public clearAllManagers(): void {
    this.contactManager.clearAll();
    this.categoryManager.clearAll();
    this.subtaskManager.clearAll();
  }

  /**
 * Loads a task currently being edited from the TaskService and initializes the form.
 */
  async loadEditingTask(): Promise<void> {
    const editingTask = this.taskService.getEditingTask();
    if (editingTask) {
      this.enterEditMode(editingTask);
      await this.populateFormWithTaskData(editingTask);
      this.loadImagesIfAvailable(editingTask);
      this.taskService.clearEditingTask();
    } else {
      this.clearAllManagers();
    }
  }

  /**
   * Activates edit mode and stores relevant metadata from the task.
   * @param task The task being edited
   */
  private enterEditMode(task: Task): void {
    this.isEditingMode = true;
    this.editingTaskId = task.id;
    this.editingTask = task;
  }

  /**
   * Populates the form and managers with values from the given task.
   * @param task The task to populate the form with
   */
  private async populateFormWithTaskData(task: Task): Promise<void> {
    this.originalTaskStatus = await this.taskDataService.populateFromTask(
      task,
      this.formData,
      this.priorityManager,
      this.contactManager,
      this.subtaskManager,
      this.contacts
    ) as 'to-do' | 'in-progress' | 'await-feedback' | 'done';
  }

  /**
   * Loads associated images from the task into the component state if available.
   * @param task The task containing potential images
   */
  private loadImagesIfAvailable(task: Task): void {
    if (task.images && task.images.length > 0) {
      this.loadImages();
    }
  }

  /**
   * Handles clicks outside of dropdowns to close them.
   * @param event - The click event.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown') && !target.closest('.subtask-input')) {
      this.contactManager.setShowContactDropdown(false);
      this.categoryManager.setShowCategoryDropdown(false);
    }
  }

  /**
   * Toggles the contact dropdown visibility.
   */
  toggleContactDropdown() {
    this.contactManager.toggleDropdown();
    this.categoryManager.setShowCategoryDropdown(false);
  }

  /**
   * Toggles the category dropdown visibility.
   */
  toggleCategoryDropdown() {
    this.categoryManager.toggleCategoryDropdown();
    this.contactManager.setShowContactDropdown(false);
  }

  /**
   * Selects a category and closes the dropdown.
   * @param category - The category to select.
   */
  selectCategory(category: any) {
    this.categoryManager.selectCategory(category);
    this.categoryManager.onCategorySelect();
  }

  /**
 * Resets the task creation form to its default state.
 */
  clearForm(): void {
    this.resetFormData();
    this.resetTaskState();
    this.resetManagers();
    this.clearUploadedImages();
    this.resetValidationErrors();
  }

  /**
   * Clears basic task form fields such as title, description, and due date.
   */
  private resetFormData(): void {
    this.formData = { title: '', description: '', dueDate: '' };
    this.priorityManager.selectedPriority = 'medium';
    this.showSuccessMessage = false;
  }

  /**
   * Resets task-related flags and IDs to their default state.
   */
  private resetTaskState(): void {
    this.isCreatingTask = false;
    this.isEditingMode = false;
    this.editingTaskId = undefined;
    this.originalTaskStatus = 'to-do';
    this.subtaskManager.originalSubtasks = [];
  }

  /**
   * Clears all manager-related selections (contacts, categories, subtasks).
   */
  private resetManagers(): void {
    this.contactManager.clearAll();
    this.categoryManager.clearAll();
    this.subtaskManager.clearAll();
  }

  /**
   * Clears uploaded images from both task and upload component.
   */
  private clearUploadedImages(): void {
    this.taskImages = [];
    if (this.uploadsComponent) {
      this.uploadsComponent.clearImages();
    }
  }

  private setCreatingState(state: boolean): void {
    this.isCreatingTask = state;
  }

  /**
   * Handles task creation or editing after form validation.
   */
  async createTask(event: Event): Promise<void> {
    event.preventDefault();
    this.resetValidationErrors();
    if (this.formValidator.hasFormErrors(this.formData, this.categoryManager)) {
      this.validationErrors = this.formValidator.validateForm(this.formData, this.categoryManager);
      return;
    }
    this.setCreatingState(true);
    try {
      this.taskImages = this.uploadsComponent.getImageKeys();
      await this.saveTaskWithSuccessFeedback();
    } catch (error) {
      console.error('Error while creating/updating task:', error);
    } finally {
      this.setCreatingState(false);
    }
  }

  /**
   * Resets validation error flags.
   */
  private resetValidationErrors(): void {
    this.validationErrors = { showTitleError: false, showDateError: false };
    this.categoryManager.showCategoryError = false;
  }

  /**
   * Emits event, shows success message and navigates after saving the task.
   */
  private async saveTaskWithSuccessFeedback(): Promise<void> {
    await this.saveTask();
    this.taskAdded.emit('added');
    this.showSuccessMessage = true;
    setTimeout(() => {
      this.clearForm();
      this.router.navigate(['/board']);
    }, 2000);
  }

  /**
   * Creates or updates the task depending on the mode.
   */
  private async saveTask(): Promise<void> {
    if (this.isEditingMode && this.editingTaskId) {
      await this.updateTask();
    } else {
      await this.addNewTask();
    }
  }

  /**
   * Adds a new task with optional subtasks.
   */
  async addNewTask(): Promise<void> {
    if (!this.defaultStatus) this.defaultStatus = 'to-do';
    (this.formData as any).images = this.taskImages;

    // Save all pending images before creating the task
    for (const img of this.uploadsComponent.uploadedImages) {
      await this.uploadService.saveImage(img);
    }
    this.uploadsComponent.uploadedImages = [];

    const newTask: Task = this.taskDataService.buildTask(
      this.formData,
      this.defaultStatus,
      this.priorityManager,
      this.contactManager,
      this.categoryManager,
      undefined
    );
    const savedTask = await this.taskService.addTask(newTask);
    if (savedTask?.id) {
      await this.subtaskManager.saveAllSubtasks(savedTask.id, this.subtaskManager.getSubtasks())
    }
  }

  /**
 * Updates an existing task, including its details and associated subtasks.
 */
  async updateTask(): Promise<void> {
    this.attachImagesToFormData();
    const existingImageKeys = this.editingTask?.images ?? [];

    // 2. Get new image keys from uploadsComponent
    const newImageKeys = this.uploadsComponent.getImageKeys();

    // 3. Merge and deduplicate
    const allImageKeys = Array.from(new Set([...existingImageKeys, ...newImageKeys]));

    // 4. Assign to formData
    (this.formData as any).images = allImageKeys;
    this.taskImages = allImageKeys;
    // Save all pending images before creating the task
    for (const img of this.uploadsComponent.uploadedImages) {
      await this.uploadService.saveImage(img);
    }
    this.uploadsComponent.uploadedImages = [];

    const updatedTask = this.buildUpdatedTask();
    await this.saveUpdatedTask(updatedTask);
    await this.updateSubtasks();
    this.taskService.clearEditingTask();
  }

  /**
   * Assigns the current image list to the form data before task construction.
   */
  private attachImagesToFormData(): void {
    (this.formData as any).images = this.taskImages;
  }

  /**
   * Constructs an updated Task object from form inputs and managers.
   * @returns The constructed Task object.
   */
  private buildUpdatedTask(): Task {
    return this.taskDataService.buildTask(
      this.formData,
      this.originalTaskStatus,
      this.priorityManager,
      this.contactManager,
      this.categoryManager,
      this.editingTaskId
    );
  }

  /**
   * Persists the updated task using the TaskService.
   * @param task - The task to be saved.
   */
  private async saveUpdatedTask(task: Task): Promise<void> {
    await this.taskService.updateTask(this.editingTaskId!, task);
  }

  /**
   * Synchronizes current and deleted subtasks in Firestore.
   */
  private async updateSubtasks(): Promise<void> {
    const currentSubtasks = this.subtaskManager.getSubtasks();
    const deleted = this.subtaskManager.getDeletedSubtasks(currentSubtasks);
    await this.subtaskManager.deleteSubtasks(this.editingTaskId!, deleted);
    await this.subtaskManager.syncSubtasks(this.editingTaskId!, currentSubtasks);
  }

  /**
   * Handles title input changes and clears error state.
   */
  onTitleInput() {
    if (this.formData.title.trim()) {
      this.validationErrors.showTitleError = false;
    }
  }

  /**
   * Handles date selection and clears error state.
   */
  onDateSelect() {
    if (this.formData.dueDate) {
      this.validationErrors.showDateError = false;
    }
  }

  /**
   * Returns today's date in ISO format for date input validation.
   */
  getTodayDate(): string {
    return this.formValidator.getTodayDate();
  }

  /**
   * Closes the overlay mode by emitting the close event.
   * Also clears form data to prevent state leaking.
   */
  closeOverlayMode() {
    if (this.uploadsComponent) {
      this.uploadsComponent.uploadedImages.forEach(image => {
        this.uploadService.deleteImage(image.imageKey);
      });
    }
    this.clearForm();
    this.closeOverlay.emit();
  }
}