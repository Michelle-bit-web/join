import { Injectable } from '@angular/core';
import { CategoryManager } from './category-manager';

/**
 * Interface representing form data for task creation/editing.
 */
export interface FormData {
  /** Task title */
  title: string;
  /** Task description */
  description: string;
  /** Due date in string format */
  dueDate: string;
}

/**
 * Interface representing validation error states.
 */
export interface ValidationErrors {
  /** Whether to show title validation error */
  showTitleError: boolean;
  /** Whether to show date validation error */
  showDateError: boolean;
}

/**
 * Service for validating task form data and managing validation errors.
 * Provides comprehensive validation logic for the AddTask component.
 * Handles validation of required fields and provides helper methods for date validation.
 * 
 * @example
 * // Inject in component
 * constructor(private formValidator: FormValidatorService) {}
 * 
 * // Validate form
 * if (this.formValidator.hasFormErrors(formData, categoryManager)) {
 *   this.validationErrors = this.formValidator.validateForm(formData, categoryManager);
 * }
 */
@Injectable({
  providedIn: 'root'
})

export class FormValidatorService {
  
  /**
   * Creates an instance of FormValidatorService.
   */
  constructor() { }

  /**
   * Validates all form fields and returns validation errors.
   * Performs comprehensive validation of title and due date fields.
   * 
   * @param formData - The form data object to validate
   * @param categoryManager - Manager for category validation
   * @returns Object containing validation error flags
   */
  validateForm(formData: FormData, categoryManager: CategoryManager): ValidationErrors {
    return {
      showTitleError: this.validateTitle(formData.title),
      showDateError: this.validateDueDate(formData.dueDate)
    };
  }

  /**
   * Checks if form has any validation errors.
   * Performs validation and updates category manager error state.
   * 
   * @param formData - The form data object to validate
   * @param categoryManager - Manager for category validation and error state
   * @returns True if any validation errors exist, false otherwise
   */
  hasFormErrors(formData: FormData, categoryManager: CategoryManager): boolean {
    const titleError = this.validateTitle(formData.title);
    const categoryError = this.validateCategory(categoryManager);
    const dateError = this.validateDueDate(formData.dueDate);
    categoryManager.showCategoryError = categoryError;
    return titleError || categoryError || dateError;
  }

  /**
   * Validates the task title field.
   * Checks if title is provided and not just whitespace.
   * 
   * @param title - The title string to validate
   * @returns True if title is invalid (empty or whitespace), false if valid
   * @private
   */
  private validateTitle(title: string): boolean {
    return !title.trim();
  }

  /**
   * Validates the task category selection.
   * Checks if a category has been selected through the category manager.
   * 
   * @param categoryManager - The category manager to check for selection
   * @returns True if no category is selected, false if category is selected
   * @private
   */
  private validateCategory(categoryManager: CategoryManager): boolean {
    return !categoryManager.hasSelectedCategory();
  }

  /**
   * Validates the due date field.
   * Checks if a due date has been provided.
   * 
   * @param dueDate - The due date string to validate
   * @returns True if due date is empty, false if provided
   * @private
   */
  private validateDueDate(dueDate: string): boolean {
    return !dueDate;
  }

  /**
   * Returns today's date in ISO format for date input validation.
   * Provides the minimum date that can be selected for task due dates.
   * 
   * @returns Today's date in ISO format (YYYY-MM-DD)
   */
  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
}