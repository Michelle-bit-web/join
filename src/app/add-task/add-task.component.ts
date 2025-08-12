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
import { AddTaskService } from './add-task.service';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * AddTaskComponent provides a comprehensive form for creating and editing tasks.
 * It supports task creation with priority, category, assigned contacts, due dates, subtasks and images.
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
  /**
   * Emits the ID of a newly created task to the parent component.
   */
  @Output() taskAdded = new EventEmitter<string>();

  /**
   * Emits an event to close the overlay in the parent component.
   */
  @Output() closeOverlay = new EventEmitter<void>();

  /**
   * Sets the default task status when creating a new task.
   */
  @Input() defaultStatus = '';

  /**
   * Determines if the component is displayed in overlay mode.
   */
  @Input() isOverlayMode = false;

  /**
   * Reference to the child UploadsComponent instance used for image uploads.
   */
  @ViewChild(UploadsComponent) uploadsComponent!: UploadsComponent;

  /**
   * List of all available contacts that can be assigned to tasks.
   */
  contacts: Contact[] = [];

  /**
   * Indicates whether the subtask input field is currently focused.
   */
  subtaskInputFocused = false;

  /**
   * True while a new task is being created.
   */
  isCreatingTask: boolean = false;

  /**
   * Controls whether a success message is displayed after an operation.
   */
  showSuccessMessage: boolean = false;

  /**
   * Stores the original status of the task before editing.
   */
  originalTaskStatus: 'to-do' | 'in-progress' | 'await-feedback' | 'done' = 'to-do';

  /**
   * True if the component is currently in task editing mode.
   */
  isEditingMode: boolean = false;

  /**
   * ID of the task being edited, if any.
   */
  editingTaskId: string | undefined;

  /**
   * The full task object being edited, if any.
   */
  editingTask: Task | undefined;

  /**
   * Array of image URLs/paths associated with the task.
   */
  taskImages: string[] = [];

  /**
   * Array of uploaded image objects with metadata.
   */
  uploadedImages: UploadedImage[] = [];
  existingImages: UploadedImage[] = [];

  subscriptions: Subscription | undefined;

  /**
   * Object containing validation error flags for the form.
   */
  validationErrors: ValidationErrors = { showTitleError: false, showDateError: false };

  /**
   * Form input data for creating or editing a task.
   */
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
    private addTaskService: AddTaskService
  ) { }

  /**
   * Initializes the component by loading the status and contacts.
   */
  async ngOnInit() {
    this.loadStatus();
    await this.loadContacts();
    await this.loadEditingTask();
    await this.loadImages();
  }

  /**
   * Lifecycle hook that runs when the component is destroyed.
   * Clears all form data and manager states to prevent state leaking.
   */
  ngOnDestroy() {
    this.clearForm();
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
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
  private async loadContacts(): Promise<void> {
    this.contactService.getContacts().subscribe(async contacts => {
      this.contacts = contacts;
      // await this.loadEditingTask();
    });
  }

  /**
   * Handles changes to the uploaded images.
   */
  onImagesChanged(images: UploadedImage[]) {
    this.uploadedImages = images;
    console.log('Uploaded images after choosing:', this.uploadedImages);
  }

  /**
   * Loads all images for the currently editing task.
   */
  async loadImages() {
    if (this.editingTask?.id) {
      this.subscriptions?.unsubscribe();
      this.subscriptions = this.uploadService.getImages('tasks', this.editingTask.id).subscribe(images => {
        this.existingImages = images;
        // if (this.uploadsComponent) {
        //   // Set preloaded images in the uploads component
        //   this.uploadsComponent.preloadedImages = [...images];
        //   this.uploadsComponent.images = [...images];
        // }
      });
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
    if (editingTask && editingTask.id) {
      // await this.addTaskService.setupEditMode(this, editingTask);
      await this.loadTaskById(editingTask.id);
    } else {
      this.clearAllManagers();
    }
  }

  /**
   * Loads task data fresh from the database by ID
   */
  private async loadTaskById(taskId: string): Promise<void> {
    try {
      const freshTask = await this.taskService.getTaskById(taskId);
      if (!freshTask) return;
      this.isEditingMode = true;
      this.editingTaskId = taskId;
      this.editingTask = freshTask;
      await Promise.all([
        this.loadFreshTaskData(freshTask),
        this.loadFreshSubtasks(taskId),
        this.loadImages(),
      ]);
    } catch (error) {
      console.error('Error loading task for editing:', error);
      this.clearAllManagers();
    }
  }

  /**
   * Loads task basic data into form
   */
  private async loadFreshTaskData(task: Task): Promise<void> {
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
   * Loads fresh subtasks from database
   */
  private async loadFreshSubtasks(taskId: string): Promise<void> {
    this.subtaskManager.clearAll();
    await this.subtaskManager.loadAndSetSubtasks(taskId);
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
    this.addTaskService.resetFormData(this);
    this.addTaskService.resetTaskState(this);
    this.addTaskService.resetManagers(this);
    this.addTaskService.clearUploadedImages(this);
    this.resetValidationErrors();
  }

  /**
   * Handles task creation or editing after form validation.
   */
  async createTask(event: Event): Promise<void> {
    event.preventDefault();
    this.resetValidationErrors();
    if (this.addTaskService.validateForm(this)) {
      return;
    }
    await this.addTaskService.processTaskCreation(this);
  }

  /**
   * Resets validation error flags.
   */
  private resetValidationErrors(): void {
    this.validationErrors = { showTitleError: false, showDateError: false };
    this.categoryManager.showCategoryError = false;
  }

  /**
   * Handles title input changes and clears error state.
   */
  onTitleInput() {
    if (this.formData.title.trim()) { this.validationErrors.showTitleError = false; }
  }

  /**
   * Handles date selection and clears error state.
   */
  onDateSelect() {
    if (this.formData.dueDate) { this.validationErrors.showDateError = false; }
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
    this.addTaskService.cleanupOnClose(this);
    this.clearForm();
    this.closeOverlay.emit();
  }

  /**
   * Gets the contact's profile image from localStorage using their imageKey.
   * Returns null if no image is associated with the contact.
   * 
   * @param contact - The contact object containing the imageKey
   * @returns Base64 encoded image string or null if no image exists
   */
  // getContactImage(contact: Contact): Observable<string | null> {
  //   if (contact.id && contact.image) {
  //     return this.uploadService.getImages('contacts', contact.id as string).pipe(
  //       map(images => images.length > 0 ? images[0].base64 : null)
  //     );
  //   } else {
  //     return new Observable(observer => observer.next(null));
  //   }
  // };
}