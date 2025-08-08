import { Injectable } from '@angular/core';

/**
 * Interface representing a task category with display properties.
 */
export interface Category {
  /** The internal value used for form submission and data storage */
  value: string;
  /** The user-friendly label displayed in the UI */
  label: string;
  /** The color associated with this category for visual distinction */
  color: string;
}

/**
 * CategoryManager handles all category-related operations for the AddTaskComponent.
 * Manages category selection, display, dropdown state, and provides category metadata.
 * Supports two predefined categories: Technical Task and User Story.
 * 
 * @example
 * // Inject and use in component
 * constructor(private categoryManager: CategoryManager) {}
 * 
 * // Select a category
 * this.categoryManager.selectCategory(category);
 * 
 * // Check if category is selected
 * if (this.categoryManager.hasSelectedCategory()) { ... }
 */
@Injectable({
  providedIn: 'root'
})

export class CategoryManager {
  /** Flag indicating whether to show category validation error */
  showCategoryError: boolean = false;
  
  /** Currently selected category value */
  private selectedCategory: string = '';
  
  /** Current state of the category dropdown visibility */
  private showCategoryDropdown: boolean = false;
  
  /** Predefined categories available for task assignment */
  private categories: Category[] = [
    { value: 'technical', label: 'Technical Task', color: '#1FD7C1' },
    { value: 'user story', label: 'User Story', color: '#0038FF' }
  ];

  /**
   * Gets the currently selected category value.
   * @returns The selected category value or empty string if none selected
   */
  getSelectedCategory(): string {
    return this.selectedCategory;
  }

  /**
   * Sets the selected category value.
   * @param category - The category value to set as selected
   */
  setSelectedCategory(category: string): void {
    this.selectedCategory = category;
  }

  /**
   * Gets the current category dropdown visibility state.
   * @returns True if dropdown is visible, false otherwise
   */
  getShowCategoryDropdown(): boolean {
    return this.showCategoryDropdown;
  }

  /**
   * Sets the category dropdown visibility state.
   * @param value - True to show dropdown, false to hide it
   */
  setShowCategoryDropdown(value: boolean): void {
    this.showCategoryDropdown = value;
  }

  /**
   * Gets all available categories for selection.
   * @returns Array of category objects with value, label, and color properties
   */
  getCategories(): Category[] {
    return this.categories;
  }

  /**
   * Toggles the category dropdown visibility state.
   * Opens dropdown if closed, closes if open.
   */
  toggleCategoryDropdown(): void {
    this.showCategoryDropdown = !this.showCategoryDropdown;
  }

  /**
   * Selects a category and automatically closes the dropdown.
   * @param category - The category object to select
   */
  selectCategory(category: Category): void {
    this.selectedCategory = category.value;
    this.showCategoryDropdown = false;
  }

  /**
   * Returns the appropriate display text for the category selector.
   * Shows category label if selected, placeholder text if none selected.
   * 
   * @returns The category label or default placeholder text
   */
  getCategoryText(): string {
    if (!this.selectedCategory) {
      return 'Select task category';
    }
    const category = this.categories.find(c => c.value === this.selectedCategory);
    return category ? category.label : 'Select task category';
  }

  /**
   * Returns the color associated with the currently selected category.
   * Used for visual styling and category identification.
   * 
   * @returns Hex color code for selected category, or default gray if none selected
   */
  getCategoryColor(): string {
    if (!this.selectedCategory) {
      return '#ccc';
    }
    const category = this.categories.find(c => c.value === this.selectedCategory);
    return category ? category.color : '#ccc';
  }

  /**
   * Checks if any category is currently selected.
   * Useful for form validation and conditional display logic.
   * 
   * @returns True if a category is selected, false otherwise
   */
  hasSelectedCategory(): boolean {
    return !!this.selectedCategory;
  }

  /**
   * Clears the selected category and resets dropdown state to defaults.
   * Used when resetting the form or clearing all selections.
   */
  clearAll(): void {
    this.selectedCategory = '';
    this.showCategoryDropdown = false;
  }

  /**
   * Handles category selection and clears any existing error state.
   * Called after successful category selection to remove validation errors.
   */
  onCategorySelect() {
    if (this.hasSelectedCategory()) {
      this.showCategoryError = false;
    }
  }
}