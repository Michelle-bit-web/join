import { Injectable, ElementRef } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDragMove } from '@angular/cdk/drag-drop';
import { Task, TaskService } from '../services/task.service';

/**
 * DragDropManager handles all drag-and-drop operations for the BoardComponent.
 * This includes drag delays, drop handling, auto-scrolling, and task status updates.
 */
@Injectable({
  providedIn: 'root'
})

export class DragDropManager {
  constructor(private taskService: TaskService) { }

  /**
   * Returns the delay for starting a drag action based on screen width.
   * Prevents accidental drags on small screens.
   *
   * @returns Drag delay in milliseconds.
   */
  getDragDelay(): number {
    return window.innerWidth < 1000 ? 250 : 0;
  }

  /**
   * Handles drag-and-drop actions for tasks using the Angular CDK.
   * Updates the task's status and reorders task lists accordingly.
   *
   * @param event - The CdkDragDrop event containing task data and drop context.
   * @param updateCallback - Callback function to update task lists after drop.
   */
  handleDrop(event: CdkDragDrop<Task[]>, updateCallback: () => void): void {
    const task = event.item.data as Task;
    const newStatus = this.getDropTargetStatus(event.container.id);
    if (!newStatus) return;
    this.reorderTasks(event);
    if (task.id && task.status !== newStatus) {
      this.updateTaskStatus(task, newStatus);
    }
    updateCallback();
  }

  /**
   * Determines the new task status based on the drop container ID.
   *
   * @param containerId - The ID of the container where the task was dropped.
   * @returns The corresponding task status, or undefined if not found.
   */
  private getDropTargetStatus(containerId: string): Task['status'] | undefined {
    const statusMap: Record<string, Task['status']> = {
      todoList: 'to-do',
      inprogressList: 'in-progress',
      awaitfeedbackList: 'await-feedback',
      doneList: 'done',
    };
    return statusMap[containerId];
  }

  /**
   * Reorders tasks in the same or across different containers.
   *
   * @param event - The CdkDragDrop event object.
   */
  private reorderTasks(event: CdkDragDrop<Task[]>): void {
    const sameContainer = event.previousContainer === event.container;
    if (sameContainer) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  /**
   * Updates the status of a given task and persists the change.
   *
   * @param task - The task object to update.
   * @param newStatus - The new status to assign.
   */
  private updateTaskStatus(task: Task, newStatus: Task['status']): void {
    const updatedTask: Task = { ...task, status: newStatus };
    this.taskService.updateTask(task.id!, updatedTask).catch((error) => {
      console.error('Error updating task status:', error);
    });
  }

  /**
   * Handles automatic scrolling while dragging near the top or bottom edge
   * of the scrollable task section.
   *
   * @param event - The CdkDragMove event containing the pointer position.
   * @param scrollSection - The scrollable section element reference.
   */
  handleDragMove(event: CdkDragMove, scrollSection: ElementRef<HTMLElement>): void {
    const mouseY = event.pointerPosition.y;
    const section = scrollSection?.nativeElement;
    if (!section) return;
    const { top, bottom } = section.getBoundingClientRect();
    const threshold = 100;
    const scrollStep = 30;
    if (mouseY < top + threshold) {
      section.scrollBy({ top: -scrollStep, behavior: 'auto' });
    } else if (bottom - mouseY < threshold) {
      section.scrollBy({ top: scrollStep, behavior: 'auto' });
    }
  }

  /**
   * Updates the status of a task and persists the change via the task service.
   *
   * @param taskId - The ID of the task to update.
   * @param status - The new status for the task.
   * @param taskList - The current task list to find the task in.
   * @param reloadCallback - Callback function to reload tasks after update.
   */
  changeTaskStatus(
    taskId: string,
    status: Task['status'],
    taskList: Task[],
    reloadCallback: () => void
  ): void {
    const task = taskList.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    const updatedTask = { ...task, status };
    this.taskService.updateTask(taskId, updatedTask).then(reloadCallback);
  }
}
