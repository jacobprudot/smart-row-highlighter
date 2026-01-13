// Highlight colors palette
export const HIGHLIGHT_COLORS = [
  { id: 'red', name: 'Red', value: '#ffccc7', dark: '#5c1a1a' },
  { id: 'orange', name: 'Orange', value: '#ffe7ba', dark: '#5c3d1a' },
  { id: 'yellow', name: 'Yellow', value: '#fffbe6', dark: '#5c5a1a' },
  { id: 'green', name: 'Green', value: '#d9f7be', dark: '#1a5c2e' },
  { id: 'blue', name: 'Blue', value: '#bae7ff', dark: '#1a3d5c' },
  { id: 'purple', name: 'Purple', value: '#efdbff', dark: '#3d1a5c' },
  { id: 'pink', name: 'Pink', value: '#ffd6e7', dark: '#5c1a3d' },
  { id: 'gray', name: 'Gray', value: '#f0f0f0', dark: '#3d3d3d' },
];

// Operators for different column types
export const OPERATORS = {
  text: [
    { id: 'equals', label: 'equals' },
    { id: 'not_equals', label: 'does not equal' },
    { id: 'contains', label: 'contains' },
    { id: 'not_contains', label: 'does not contain' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { id: 'equals', label: 'equals' },
    { id: 'not_equals', label: 'does not equal' },
    { id: 'greater_than', label: 'is greater than' },
    { id: 'less_than', label: 'is less than' },
    { id: 'greater_or_equal', label: 'is greater than or equal' },
    { id: 'less_or_equal', label: 'is less than or equal' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is not empty' },
  ],
  status: [
    { id: 'equals', label: 'is' },
    { id: 'not_equals', label: 'is not' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is not empty' },
  ],
  date: [
    { id: 'equals', label: 'is' },
    { id: 'before', label: 'is before' },
    { id: 'after', label: 'is after' },
    { id: 'is_overdue', label: 'is overdue' },
    { id: 'is_today', label: 'is today' },
    { id: 'is_this_week', label: 'is this week' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is not empty' },
  ],
  checkbox: [
    { id: 'is_checked', label: 'is checked' },
    { id: 'is_not_checked', label: 'is not checked' },
  ],
};

// Get operators for a column type
export function getOperatorsForType(columnType) {
  const typeMap = {
    'status': 'status',
    'color': 'status',
    'text': 'text',
    'long_text': 'text',
    'numbers': 'number',
    'date': 'date',
    'checkbox': 'checkbox',
    'dropdown': 'status',
    'person': 'status',
    'priority': 'status',
    'rating': 'number',
  };

  const mappedType = typeMap[columnType] || 'text';
  return OPERATORS[mappedType] || OPERATORS.text;
}

// Evaluate a single rule against an item
export function evaluateRule(rule, item, columns) {
  const column = columns.find(c => c.id === rule.columnId);
  if (!column) return false;

  const columnValue = item.column_values.find(cv => cv.id === rule.columnId);
  if (!columnValue && rule.operator !== 'is_empty') return false;

  const textValue = columnValue?.text || '';
  const rawValue = columnValue?.value;

  switch (rule.operator) {
    case 'equals':
      return textValue.toLowerCase() === rule.value.toLowerCase();

    case 'not_equals':
      return textValue.toLowerCase() !== rule.value.toLowerCase();

    case 'contains':
      return textValue.toLowerCase().includes(rule.value.toLowerCase());

    case 'not_contains':
      return !textValue.toLowerCase().includes(rule.value.toLowerCase());

    case 'is_empty':
      return !textValue || textValue.trim() === '';

    case 'is_not_empty':
      return textValue && textValue.trim() !== '';

    case 'greater_than':
      return parseFloat(textValue) > parseFloat(rule.value);

    case 'less_than':
      return parseFloat(textValue) < parseFloat(rule.value);

    case 'greater_or_equal':
      return parseFloat(textValue) >= parseFloat(rule.value);

    case 'less_or_equal':
      return parseFloat(textValue) <= parseFloat(rule.value);

    case 'is_checked':
      return rawValue && JSON.parse(rawValue)?.checked === true;

    case 'is_not_checked':
      return !rawValue || JSON.parse(rawValue)?.checked !== true;

    case 'is_overdue': {
      if (!rawValue) return false;
      const dateValue = JSON.parse(rawValue)?.date;
      if (!dateValue) return false;
      return new Date(dateValue) < new Date().setHours(0, 0, 0, 0);
    }

    case 'is_today': {
      if (!rawValue) return false;
      const dateValue = JSON.parse(rawValue)?.date;
      if (!dateValue) return false;
      const today = new Date().toISOString().split('T')[0];
      return dateValue === today;
    }

    case 'is_this_week': {
      if (!rawValue) return false;
      const dateValue = JSON.parse(rawValue)?.date;
      if (!dateValue) return false;
      const date = new Date(dateValue);
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return date >= weekStart && date <= weekEnd;
    }

    case 'before': {
      if (!rawValue) return false;
      const dateValue = JSON.parse(rawValue)?.date;
      if (!dateValue) return false;
      return new Date(dateValue) < new Date(rule.value);
    }

    case 'after': {
      if (!rawValue) return false;
      const dateValue = JSON.parse(rawValue)?.date;
      if (!dateValue) return false;
      return new Date(dateValue) > new Date(rule.value);
    }

    default:
      return false;
  }
}

// Get all matching rules for an item
export function getAllMatchingRules(item, rules, columns) {
  const matchingRules = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (evaluateRule(rule, item, columns)) {
      matchingRules.push(rule);
    }
  }
  return matchingRules;
}

// Get highlight color for an item based on rules (first match wins)
export function getItemHighlight(item, rules, columns, isDarkMode = false) {
  const matchingRules = getAllMatchingRules(item, rules, columns);

  if (matchingRules.length === 0) return null;

  const firstRule = matchingRules[0];
  const color = HIGHLIGHT_COLORS.find(c => c.id === firstRule.colorId);

  return {
    ruleId: firstRule.id,
    ruleName: firstRule.name,
    color: isDarkMode ? color?.dark : color?.value,
    colorId: firstRule.colorId,
    totalMatches: matchingRules.length,
    allMatchingRules: matchingRules,
  };
}
