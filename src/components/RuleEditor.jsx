import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
  TextField,
  Flex,
  Box,
} from 'monday-ui-react-core';
import { HIGHLIGHT_COLORS, getOperatorsForType } from '../utils/highlightEngine';

function RuleEditor({ rule, columns, onSave, onClose, isDarkMode }) {
  const [name, setName] = useState(rule?.name || '');
  const [columnId, setColumnId] = useState(rule?.columnId || '');
  const [operator, setOperator] = useState(rule?.operator || '');
  const [value, setValue] = useState(rule?.value || '');
  const [colorId, setColorId] = useState(rule?.colorId || 'yellow');
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [showConfirm, setShowConfirm] = useState(false);

  // Track the previous column to detect actual user changes
  const prevColumnId = useRef(rule?.columnId || '');

  const selectedColumn = columns.find(c => c.id === columnId);
  const operators = selectedColumn ? getOperatorsForType(selectedColumn.type) : [];

  // Parse column settings to get status/dropdown options
  const columnOptions = useMemo(() => {
    if (!selectedColumn?.settings_str) return [];

    try {
      const settings = JSON.parse(selectedColumn.settings_str);

      // Status column
      if (selectedColumn.type === 'status' || selectedColumn.type === 'color') {
        const labels = settings.labels || {};
        return Object.entries(labels).map(([index, label]) => ({
          id: index,
          label: label,
        })).filter(opt => opt.label); // Filter out empty labels
      }

      // Dropdown column
      if (selectedColumn.type === 'dropdown') {
        const labels = settings.labels || [];
        return labels.map((label, index) => ({
          id: label.id || index.toString(),
          label: label.name || label,
        }));
      }

      // Priority column (similar to status)
      if (selectedColumn.type === 'priority') {
        const labels = settings.labels || {};
        return Object.entries(labels).map(([index, label]) => ({
          id: index,
          label: label,
        })).filter(opt => opt.label);
      }
    } catch (e) {
      console.error('Error parsing column settings:', e);
    }

    return [];
  }, [selectedColumn]);

  // Reset operator and value only when user changes the column (not on initial render)
  useEffect(() => {
    // Skip if this is the initial value or if column hasn't actually changed
    if (!columnId || columnId === prevColumnId.current) {
      return;
    }

    // Column actually changed by user, reset value
    setValue('');
    prevColumnId.current = columnId;

    if (operators.length > 0) {
      const currentOperatorValid = operators.some(op => op.id === operator);
      if (!currentOperatorValid) {
        setOperator(operators[0].id);
      }
    }
  }, [columnId, operators, operator]);

  // Check if value is required for the operator
  const operatorNeedsValue = !['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked', 'is_overdue', 'is_today', 'is_this_week'].includes(operator);

  // Determine the type of value input to show
  const getValueInputType = () => {
    if (!selectedColumn) return 'text';

    const type = selectedColumn.type;

    // Status, dropdown, priority - show select with options
    if (['status', 'color', 'dropdown', 'priority'].includes(type) && columnOptions.length > 0) {
      return 'select';
    }

    // Date columns
    if (type === 'date') {
      return 'date';
    }

    // Number columns
    if (type === 'numbers' || type === 'rating') {
      return 'number';
    }

    // Default to text
    return 'text';
  };

  const valueInputType = getValueInputType();

  // Get changes for confirmation dialog
  const getChanges = () => {
    if (!rule) return []; // New rule, no changes to show

    const changes = [];
    const getColumnTitle = (id) => columns.find(c => c.id === id)?.title || id;
    const getColorName = (id) => HIGHLIGHT_COLORS.find(c => c.id === id)?.name || id;
    const getOperatorLabel = (opId, colId) => {
      const col = columns.find(c => c.id === colId);
      if (!col) return opId;
      const ops = getOperatorsForType(col.type);
      return ops.find(o => o.id === opId)?.label || opId;
    };

    // Compare values - normalize to strings for comparison
    const originalName = rule.name || '';
    const currentName = name || '';
    const originalValue = rule.value || '';
    const currentValue = operatorNeedsValue ? (value || '') : '';

    if (originalName !== currentName) {
      changes.push({ field: 'Name', from: originalName || '(unnamed)', to: currentName || `Rule ${Date.now()}` });
    }
    if (rule.columnId !== columnId) {
      changes.push({ field: 'Column', from: getColumnTitle(rule.columnId), to: getColumnTitle(columnId) });
    }
    if (rule.operator !== operator) {
      changes.push({ field: 'Condition', from: getOperatorLabel(rule.operator, rule.columnId), to: getOperatorLabel(operator, columnId) });
    }
    if (originalValue !== currentValue) {
      changes.push({ field: 'Value', from: originalValue || '(empty)', to: currentValue || '(empty)' });
    }
    if (rule.colorId !== colorId) {
      changes.push({ field: 'Color', from: getColorName(rule.colorId), to: getColorName(colorId) });
    }

    return changes;
  };

  const changes = rule ? getChanges() : [];
  const hasChanges = changes.length > 0;

  const handleSaveClick = () => {
    console.log('handleSaveClick called');
    console.log('columnId:', columnId, 'operator:', operator, 'value:', value);
    console.log('operatorNeedsValue:', operatorNeedsValue);

    if (!columnId || !operator) {
      console.log('Missing columnId or operator');
      return;
    }
    if (operatorNeedsValue && !value) {
      console.log('Missing value when required');
      return;
    }

    // If editing an existing rule, show confirmation if there are changes
    if (rule) {
      const currentChanges = getChanges();
      console.log('Changes detected:', currentChanges);
      if (currentChanges.length > 0) {
        setShowConfirm(true);
      } else {
        // No changes, just save anyway (keeps same values)
        console.log('No changes, saving directly');
        doSave();
      }
    } else {
      // New rule, save directly
      console.log('New rule, saving directly');
      doSave();
    }
  };

  const doSave = () => {
    onSave({
      id: rule?.id,
      name: name || `Rule ${Date.now()}`,
      columnId,
      operator,
      value: operatorNeedsValue ? value : '',
      colorId,
      enabled,
    });
  };

  const selectStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${isDarkMode ? '#4b4e69' : '#c5c7d0'}`,
    backgroundColor: isDarkMode ? '#30324e' : '#ffffff',
    color: isDarkMode ? '#ffffff' : '#323338',
    fontSize: 14,
    cursor: 'pointer',
    outline: 'none',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${isDarkMode ? '#4b4e69' : '#c5c7d0'}`,
    backgroundColor: isDarkMode ? '#30324e' : '#ffffff',
    color: isDarkMode ? '#ffffff' : '#323338',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  // Render value input based on column type
  const renderValueInput = () => {
    if (valueInputType === 'select' && columnOptions.length > 0) {
      return (
        <select
          style={selectStyle}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="">Select value...</option>
          {columnOptions.map(opt => (
            <option key={opt.id} value={opt.label}>{opt.label}</option>
          ))}
        </select>
      );
    }

    if (valueInputType === 'date') {
      return (
        <input
          type="date"
          style={inputStyle}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      );
    }

    if (valueInputType === 'number') {
      return (
        <input
          type="number"
          style={inputStyle}
          placeholder="Enter number..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      );
    }

    // Default text input
    return (
      <input
        type="text"
        style={inputStyle}
        placeholder="Enter value..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  };

  return (
    <Modal
      show={true}
      onClose={onClose}
      title={rule ? 'Edit Rule' : 'Create Rule'}
      width={Modal.width.DEFAULT}
    >
      <ModalHeader title={rule ? 'Edit Highlighting Rule' : 'Create Highlighting Rule'} />
      <ModalContent>
        <Flex direction="Column" gap={Flex.gaps.MEDIUM}>
          <Box>
            <label style={{ display: 'block', marginBottom: 4, color: isDarkMode ? '#c5c7d0' : '#323338' }}>
              Rule Name
            </label>
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g., Overdue tasks"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Box>

          <Box>
            <label style={{ display: 'block', marginBottom: 4, color: isDarkMode ? '#c5c7d0' : '#323338' }}>
              When Column
            </label>
            <select
              style={selectStyle}
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
            >
              <option value="">Select column...</option>
              {columns.map(col => (
                <option key={col.id} value={col.id}>{col.title}</option>
              ))}
            </select>
          </Box>

          {columnId && (
            <Box>
              <label style={{ display: 'block', marginBottom: 4, color: isDarkMode ? '#c5c7d0' : '#323338' }}>
                Condition
              </label>
              <select
                style={selectStyle}
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
              >
                <option value="">Select condition...</option>
                {operators.map(op => (
                  <option key={op.id} value={op.id}>{op.label}</option>
                ))}
              </select>
            </Box>
          )}

          {operator && operatorNeedsValue && (
            <Box>
              <label style={{ display: 'block', marginBottom: 4, color: isDarkMode ? '#c5c7d0' : '#323338' }}>
                Value
              </label>
              {renderValueInput()}
            </Box>
          )}

          <Box>
            <label style={{ display: 'block', marginBottom: 8, color: isDarkMode ? '#c5c7d0' : '#323338' }}>
              Highlight Color
            </label>
            <Flex gap={Flex.gaps.SMALL}>
              {HIGHLIGHT_COLORS.map(color => (
                <div
                  key={color.id}
                  onClick={() => setColorId(color.id)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    backgroundColor: isDarkMode ? color.dark : color.value,
                    cursor: 'pointer',
                    border: colorId === color.id ? '3px solid #0073ea' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={color.name}
                >
                  {colorId === color.id && (
                    <span style={{ color: '#0073ea', fontWeight: 'bold' }}>✓</span>
                  )}
                </div>
              ))}
            </Flex>
          </Box>
        </Flex>
      </ModalContent>
      <ModalFooter>
        <Flex gap={Flex.gaps.SMALL} justify="End">
          <Button
            kind={Button.kinds.TERTIARY}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveClick}
            disabled={!columnId || !operator || (operatorNeedsValue && !value)}
          >
            {rule ? 'Save Changes' : 'Create Rule'}
          </Button>
        </Flex>
      </ModalFooter>

      {/* Confirmation Modal for Changes */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: isDarkMode ? '#1c1f3b' : '#ffffff',
            borderRadius: 8,
            padding: 24,
            maxWidth: 450,
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: isDarkMode ? '#ffffff' : '#323338',
              fontSize: 18
            }}>
              Confirm Changes
            </h3>
            <p style={{
              margin: '0 0 16px 0',
              color: isDarkMode ? '#c5c7d0' : '#676879',
              fontSize: 14
            }}>
              You are about to make the following changes:
            </p>
            <div style={{
              backgroundColor: isDarkMode ? '#272a4a' : '#f6f7fb',
              borderRadius: 6,
              padding: 12,
              marginBottom: 20
            }}>
              {changes.map((change, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: idx < changes.length - 1 ? 10 : 0,
                  fontSize: 13
                }}>
                  <span style={{
                    fontWeight: 600,
                    color: isDarkMode ? '#ffffff' : '#323338',
                    minWidth: 70
                  }}>
                    {change.field}:
                  </span>
                  <span style={{ color: isDarkMode ? '#c5c7d0' : '#676879' }}>
                    <span style={{
                      textDecoration: 'line-through',
                      opacity: 0.7
                    }}>
                      {change.from}
                    </span>
                    <span style={{ margin: '0 6px' }}>→</span>
                    <span style={{
                      color: isDarkMode ? '#00c875' : '#00854d',
                      fontWeight: 500
                    }}>
                      {change.to}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                kind={Button.kinds.TERTIARY}
                onClick={() => setShowConfirm(false)}
              >
                Go Back
              </Button>
              <Button onClick={doSave}>
                Confirm Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default RuleEditor;
