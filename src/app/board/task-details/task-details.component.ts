import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Input } from '@angular/core';
import { Task, TaskService } from '../../services/task.service';
import { Subtask } from '../../services/task.service';
import { Timestamp } from '@angular/fire/firestore';
import { ContactService } from '../../services/contact.service';
import { Contact } from '../../services/contact.service';

@Component({
  selector: 'app-task-details',
  imports: [
    CommonModule
  ],
  templateUrl: './task-details.component.html',
  styleUrl: './task-details.component.scss'
})
export class TaskDetailsComponent {
  @Output() closeTaskDetails = new EventEmitter<string>();
  @Input() task!: Task;
  @Input() subtask!: Subtask[];
  @Input() contactList: Contact[] = [];
  showContent = true;
  
  constructor(private taskService: TaskService, public contactService: ContactService ) {}

  onClose() {
    console.log('Close button clicked');
    this.showContent = false;
    this.closeTaskDetails.emit('close');
  }

  convertDate(date: Timestamp | Date): string {
    return this.taskService.convertDate(date);
 }

}
