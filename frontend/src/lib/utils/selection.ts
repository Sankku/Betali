/**
 * Utility functions for table row selection behavior
 */

export interface SelectionOptions<T> {
  currentSelection: T[];
  clickedItem: T;
  allItems: T[];
  lastSelectedItem: T | null;
  isCtrlKey: boolean;
  getItemId: (item: T) => string;
}

/**
 * Handles table row selection logic with support for:
 * - Single click: Selects only the clicked item (deselects others)
 * - Ctrl/Cmd + Click: Toggles the clicked item in the selection (multi-select)
 *
 * @returns New selection array
 */
export function handleTableRowSelection<T>({
  currentSelection,
  clickedItem,
  allItems,
  lastSelectedItem,
  isCtrlKey,
  getItemId,
}: SelectionOptions<T>): T[] {
  const clickedId = getItemId(clickedItem);
  const isCurrentlySelected = currentSelection.some(item => getItemId(item) === clickedId);

  // If Ctrl/Cmd key is pressed, toggle the item in the selection (multi-select mode)
  if (isCtrlKey) {
    if (isCurrentlySelected) {
      // Remove from selection
      return currentSelection.filter(item => getItemId(item) !== clickedId);
    } else {
      // Add to selection
      return [...currentSelection, clickedItem];
    }
  }

  // Single click behavior: select only this item (deselect all others)
  if (isCurrentlySelected && currentSelection.length === 1) {
    // If it's the only one selected, deselect it
    return [];
  } else {
    // Select only the clicked item (deselect all others)
    return [clickedItem];
  }
}

/**
 * Gets the last selected item from the current selection
 */
export function getLastSelectedItem<T>(selection: T[]): T | null {
  return selection.length > 0 ? selection[selection.length - 1] : null;
}
