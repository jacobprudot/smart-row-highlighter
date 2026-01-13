import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
  TextField,
  Dropdown,
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

  const selectedColumn = columns.find(c => c.id === columnId);
  const operators = selectedColumn ? getOperatorsForType(selectedColumn.type) : [];

  // Reset operator when column changes
  useEffect(() => {
    if (columnId && operators.length > 0) {
      const currentOperatorValid = operators.some(op => op.id === operator);
      if (!currentOperatorValid) {
        setOperator(operators[0].id);
      }
    }
  }, [columnId, operators]);

  // Check if value is required for the operator
  const operatorNeedsValue = !['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked', 'is_overdue', 'is_today', 'is_this_week'].includes(operator);

  const handleSave = () => {
    if (!columnId || !operator) return;
    if (operatorNeedsValue && !value) return;

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

  const columnOptions = columns.map(col => ({
    value: col.id,
    label: col.title,
  }));

  const operatorOptions = operators.map(op => ({
    value: op.id,
    label: op.label,
  }));

  const colorOptions = HIGHLIGHT_COLORS.map(color => ({
    value: color.id,
    label: color.name,
    leftAvatar: (
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          backgroundColor: isDarkMode ? color.dark : color.value,
        }}
      />
    ),
  }));

  const modalStyle = {
    backgroundColor: isDarkMode ? '#1c1f3b' : '#ffffff',
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
            <TextField
              placeholder="e.g., Overdue tasks"
              value={name}
              onChange={setName}
              size={TextField.sizes.MEDIUM}
            />
          </Box>

          <Box>
            <label style={{ display: 'block', marginBottom: 4, color: isDarkMode ? '#c5c7d0' : '#323338' }}>
              When Column
            </label>
            <Dropdown
              placeholder="Select column"
              options={columnOptions}
              value={columnOptions.find(opt => opt.value === columnId)}
              onChange={(option) => setColumnId(option?.value || '')}
              size={Dropdown.sizes.MEDIUM}
            />
          </Box>

          {columnId && (
            <Box>
              <label style={{ display: 'block', marginBottom: 4, color: isDarkMode ? '#c5c7d0' : '#323338' }}>
                Condition
              </label>
              <Dropdown
                placeholder="Select condition"
                options={operatorOptions}
                value={operatorOptions.find(opt => opt.value === operator)}
                onChange={(option) => setOperator(option?.value || '')}
                size={Dropdown.sizes.MEDIUM}
              />
            </Box>
          )}

          {operator && operatorNeedsValue && (
            <Box>
              <label style={{ display: 'block', marginBottom: 4, color: isDarkMode ? '#c5c7d0' : '#323338' }}>
                Value
              </label>
              <TextField
                placeholder="Enter value"
                value={value}
                onChange={setValue}
                size={TextField.sizes.MEDIUM}
                type={selectedColumn?.type === 'numbers' ? 'number' : selectedColumn?.type === 'date' ? 'date' : 'text'}
              />
            </Box>
          )}

          <Box>
            <label style={{ display: 'block', marginBottom: 4, color: isDarkMode ? '#c5c7d0' : '#323338' }}>
              Highlight Color
            </label>
            <Dropdown
              placeholder="Select color"
              options={colorOptions}
              value={colorOptions.find(opt => opt.value === colorId)}
              onChange={(option) => setColorId(option?.value || 'yellow')}
              size={Dropdown.sizes.MEDIUM}
            />
            <Flex gap={Flex.gaps.SMALL} style={{ marginTop: 8 }}>
              {HIGHLIGHT_COLORS.map(color => (
                <div
                  key={color.id}
                  onClick={() => setColorId(color.id)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    backgroundColor: isDarkMode ? color.dark : color.value,
                    cursor: 'pointer',
                    border: colorId === color.id ? '2px solid #0073ea' : '2px solid transparent',
                  }}
                  title={color.name}
                />
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
            onClick={handleSave}
            disabled={!columnId || !operator || (operatorNeedsValue && !value)}
          >
            {rule ? 'Save Changes' : 'Create Rule'}
          </Button>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}

export default RuleEditor;
