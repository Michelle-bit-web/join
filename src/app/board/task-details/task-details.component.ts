/**
 * TaskDetailsComponent displays the detailed view of a selected task.
 * It includes task metadata, assigned contacts, and a list of subtasks.
 * 
 * Features:
 * - Shows task information including title, description, due date, etc.
 * - Displays and manages assigned contacts
 * - Allows toggling and updating subtasks
 * - Emits events to close, edit, or respond to changes in subtasks
 * - Supports task deletion and date formatting
 * 
 * Dependencies:
 * - TaskService for task and subtask management
 * - ContactService for fetching contact details
 * - Angular Router for navigation
 */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Task, TaskService } from '../../services/task.service';
import { Subtask } from '../../services/task.service';
import { Timestamp } from '@angular/fire/firestore';
import { ContactService } from '../../services/contact.service';
import { Contact } from '../../services/contact.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UploadService } from '../../services/upload.service';
import { ImageViewerComponent } from '../../shared/image-viewer/image-viewer.component';

@Component({
  selector: 'app-task-details',
  imports: [
    CommonModule,
    FormsModule,
    ImageViewerComponent
  ],
  templateUrl: './task-details.component.html',
  styleUrl: './task-details.component.scss'
})

export class TaskDetailsComponent implements OnChanges {



  /**
   * Emits an event when the task detail view should be closed.
   */
  @Output() closeTaskDetails = new EventEmitter<string>();

  /**
   * Emits an event when the user wants to edit the task.
   */
  @Output() editTask = new EventEmitter<string>();

  /**
   * Emits the updated subtask list when a subtask is toggled.
   */
  @Output() subtaskChanged = new EventEmitter<Subtask[]>();

  /**
   * The task whose details are being displayed.
   */
  @Input() task!: Task;

  /**
   * The list of contacts assigned to this task.
   */
  @Input() contactList: Contact[] = [];

  /**
   * Controls whether the detail view content is shown.
   */
  showContent = true;

  /**
   * The list of subtasks associated with the task.
   */
  subtasks: Subtask[] = [];

  /**
   * The list of task images loaded from localStorage.
   */
  taskImages: string[] = [];

  /**
 * The list of task image keys for deletion.
 */
  taskImageKeys: string[] = [];

  /**
   * Controls whether the image viewer is shown.
   */
  showImageViewer = false;

  /**
   * The index of the currently viewed image.
   */
  currentImageIndex = 0;

  /**
   * Constructor injects task and contact services, and the Angular Router.
   * 
   * @param taskService Service for handling tasks and subtasks.
   * @param contactService Service for fetching contacts.
   * @param router Angular Router for navigation (currently unused).
   * @param uploadService Service for handling image uploads and storage.
   */
  constructor(
    public taskService: TaskService,
    public contactService: ContactService,
    private router: Router,
    private uploadService: UploadService
  ) { }

  /**
   * Lifecycle hook to load assigned contacts and subtasks on component initialization.
   */
  ngOnInit(): void {
    console.log('Task details initialized with task:', this.task);
    this.loadAssignedContacts();
    this.loadSubtasks();
    this.loadTaskImages();
  }

  /**
 * Lifecycle hook to reload images when task input changes.
 */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && changes['task'].currentValue) {
      console.log('Task changed in task details:', changes['task'].currentValue);
      this.loadTaskImages();
    }
  }

  /**
   * Closes the task detail view and emits the close event.
   */
  onClose() {
    this.showContent = false;
    this.closeTaskDetails.emit('close');
  }

  /**
   * Converts a Firebase Timestamp or Date to a formatted string.
   * 
   * @param date The date or timestamp to convert.
   * @returns A string representation of the date.
   */
  convertDate(date: Timestamp | Date): string {
    return this.taskService.convertDate(date);
  }

  /**
   * Prepares the task for editing and emits the edit event.
   * 
   * @param event Optional event to stop propagation and prevent default behavior.
   */
  openEditTask(event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.taskService.setEditingTask(this.task);
    this.editTask.emit("edit");
  }

  /**
   * Deletes the task (if it has a valid ID), and closes the detail view.
   * 
   * @param event Optional event to stop propagation and prevent default behavior.
   */
  deleteTask(event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.task.id) {
      this.taskService.deleteTask(this.task.id);
      this.onClose();
    }
  }

  /**
   * Toggles a subtask's completion status and updates it in the backend.
   * Emits the updated list of subtasks.
   * 
   * @param subtask The subtask to toggle.
   */
  onSubtaskToggle(subtask: Subtask) {
    if (!this.task.id || !subtask.id) return;
    this.taskService.updateSubtask(this.task.id, subtask.id, subtask)
      .then(() => {
        this.subtaskChanged.emit(this.subtasks);
      })
      .catch(error => {
        console.error('Error updating subtask:', error);
      });
  }

  /**
   * Loads subtasks associated with the current task from the database.
   */
  loadSubtasks() {
    if (this.task?.id) {
      this.taskService.getSubtasks(this.task.id).subscribe((subtasks: Subtask[]) => {
        this.subtasks = subtasks;
      });
    }
  }

  /**
   * Fetches detailed contact information for all assigned contact IDs
   * and updates the contactList accordingly.
   */
  async loadAssignedContacts() {
    this.contactList = [];
    if (this.task?.assignedTo?.length) {
      for (let contactId of this.task.assignedTo) {
        const contact = await this.contactService.getContactById(contactId);
        if (contact) {
          this.contactList.push(contact);
        }
      }
    }
  }

  /**
   * Loads task images from localStorage using the image keys stored in the task.
   */
  loadTaskImages() {
    console.log('Loading task images for task:', this.task);
    console.log('Task images array:', this.task?.images);
    if (this.task?.images && this.task.images.length > 0) {
      this.taskImages = this.uploadService.getTaskImages(this.task.images);
      this.taskImageKeys = this.task.images;
      console.log('Loaded task images:', this.taskImages);
      console.log('Task image keys:', this.taskImageKeys);
    } else {
      console.log('No images found for task');
    }
  }

  /**
   * Opens the image viewer with the specified image index.
   * 
   * @param index The index of the image to view.
   */
  openImageViewer(index: number) {
    this.currentImageIndex = index;
    this.showImageViewer = true;
  }

  /**
   * Closes the image viewer.
   */
  closeImageViewer() {
    this.showImageViewer = false;
  }

  /**
  * Handles image deletion from the image viewer.
  */
  onDeleteImage(event: { index: number, imageKey?: string }) {
    if (event.imageKey && this.task.id) {
      // Remove image from localStorage
      this.uploadService.deleteImage(event.imageKey);

      // Remove image key from task, handling possible undefined
      const updatedImages = this.task.images?.filter(key => key !== event.imageKey) || [];
      this.task.images = updatedImages;

      // Update task in database
      this.taskService.updateTask(this.task.id, this.task);

      // Reload images
      this.loadTaskImages();
    }

    // Close image viewer
    this.closeImageViewer();
  }
}