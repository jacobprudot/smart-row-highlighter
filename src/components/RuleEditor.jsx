import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
  TextField,
  Flex,
  Box,
  IconButton,
} from 'monday-ui-react-core';
import { Add, Delete } from 'monday-ui-react-core/icons';
import { HIGHLIGHT_COLORS, getOperatorsForType } from '../utils/highlightEngine';

// Helper to get column options from settings
function getColumnOptions(column) {
  if (!column?.settings_str) return [];

  try {
    const settings = JSON.parse(column.settings_str);

    if (column.type === 'status' || column.type === 'color') {
      const labels = settings.labels || {};
      return Object.entries(labels).map(([index, label]) => ({
        id: index,
        label: label,
      })).filter(opt => opt.label);
    }

    if (column.type === 'dropdown') {
      const labels = settings.labels || [];
      return labels.map((label, index) => ({
        id: label.id || index.toString(),
        label: label.name || label,
      }));
    }

    if (column.type === 'priority') {
      const labels = settings.labels || {};
      return Object.entries(labels).map(([index, label]) => ({
        id: index,
        label: label,
      })).filter(opt => opt.label);
    }
  } catch (e) {
    // Ignore parse errors
  }

  return [];
}

// Check if operator needs a value
function operatorNeedsValue(operator) {
  return !['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked', 'is_overdue', 'is_today', 'is_this_week'].includes(operator);
}

// Get value input type based on column type
function getValueInputType(column, options) {
  if (!column) return 'text';

  const type = column.type;

  if (['status', 'color', 'dropdown', 'priority'].includes(type) && options.length > 0) {
    return 'select';
  }

  if (type === 'date') return 'date';
  if (type === 'numbers' || type === 'rating') return 'number';

  return 'text';
}

// Single condition row component
function ConditionRow({ condition, columns, onChange, onDelete, canDelete, isDarkMode, selectStyle, inputStyle }) {
  const column = columns.find(c => c.id === condition.columnId);
  const operators = column ? getOperatorsForType(column.type) : [];
  const columnOptions = getColumnOptions(column);
  const valueType = getValueInputType(column, columnOptions);
  const needsValue = operatorNeedsValue(condition.operator);

  const handleColumnChange = (newColumnId) => {
    const newColumn = columns.find(c => c.id === newColumnId);
    const newOperators = newColumn ? getOperatorsForType(newColumn.type) : [];
    onChange({
      ...condition,
      columnId: newColumnId,
      operator: newOperators.length > 0 ? newOperators[0].id : '',
      value: '',
    });
  };

  const renderValueInput = () => {
    if (valueType === 'select' && columnOptions.length > 0) {
      return (
        <select
          style={{ ...selectStyle, flex: 1 }}
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
        >
          <option value="">Select...</option>
          {columnOptions.map(opt => (
            <option key={opt.id} value={opt.label}>{opt.label}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={valueType === 'date' ? 'date' : valueType === 'number' ? 'number' : 'text'}
        style={{ ...inputStyle, flex: 1 }}
        placeholder="Value..."
        value={condition.value}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
      />
    );
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 0',
      borderBottom: `1px solid ${isDarkMode ? '#3d4066' : '#e6e9ef'}`,
    }}>
      <select
        style={{ ...selectStyle, flex: 1.5 }}
        value={condition.columnId}
        onChange={(e) => handleColumnChange(e.target.value)}
      >
        <option value="">Column...</option>
        {columns.map(col => (
          <option key={col.id} value={col.id}>{col.title}</option>
        ))}
      </select>

      {condition.columnId && (
        <select
          style={{ ...selectStyle, flex: 1.2 }}
          value={condition.operator}
          onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        >
          <option value="">Condition...</option>
          {operators.map(op => (
            <option key={op.id} value={op.id}>{op.label}</option>
          ))}
        </select>
      )}

      {condition.operator && needsValue && renderValueInput()}

      {canDelete && (
        <IconButton
          icon={Delete}
          size={IconButton.sizes.XS}
          kind={IconButton.kinds.TERTIARY}
          onClick={onDelete}
          ariaLabel="Remove condition"
        />
      )}
    </div>
  );
}

function RuleEditor({ rule, columns, onSave, onClose, isDarkMode, monday }) {
  const [name, setName] = useState(rule?.name || '');
  const [colorId, setColorId] = useState(rule?.colorId || 'yellow');
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [showConfirm, setShowConfirm] = useState(false);

  // Multi-condition state
  const [conditions, setConditions] = useState(() => {
    if (rule?.conditions && rule.conditions.length > 0) {
      return rule.conditions;
    }
    // Convert legacy single-condition rule to conditions array
    if (rule?.columnId) {
      return [{
        id: '1',
        columnId: rule.columnId,
        operator: rule.operator,
        value: rule.value || '',
      }];
    }
    return [{ id: '1', columnId: '', operator: '', value: '' }];
  });
  const [conditionLogic, setConditionLogic] = useState(rule?.conditionLogic || 'AND');

  const selectStyle = {
    padding: '8px 10px',
    borderRadius: 6,
    border: `1px solid ${isDarkMode ? '#4b4e69' : '#c5c7d0'}`,
    backgroundColor: isDarkMode ? '#30324e' : '#ffffff',
    color: isDarkMode ? '#ffffff' : '#323338',
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none',
  };

  const inputStyle = {
    padding: '8px 10px',
    borderRadius: 6,
    border: `1px solid ${isDarkMode ? '#4b4e69' : '#c5c7d0'}`,
    backgroundColor: isDarkMode ? '#30324e' : '#ffffff',
    color: isDarkMode ? '#ffffff' : '#323338',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const addCondition = () => {
    setConditions([...conditions, {
      id: Date.now().toString(),
      columnId: '',
      operator: '',
      value: '',
    }]);
  };

  const removeCondition = (id) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id, updates) => {
    setConditions(conditions.map(c => c.id === id ? updates : c));
  };

  // Validate all conditions
  const isValid = () => {
    if (!name.trim() && conditions.length === 0) return false;

    return conditions.every(c => {
      if (!c.columnId || !c.operator) return false;
      if (operatorNeedsValue(c.operator) && !c.value) return false;
      return true;
    });
  };

  // Get changes for confirmation dialog
  const getChanges = () => {
    if (!rule) return [];

    const changes = [];
    const getColumnTitle = (id) => columns.find(c => c.id === id)?.title || id;
    const getColorName = (id) => HIGHLIGHT_COLORS.find(c => c.id === id)?.name || id;

    if ((rule.name || '') !== (name || '')) {
      changes.push({ field: 'Name', from: rule.name || '(unnamed)', to: name || `Rule ${Date.now()}` });
    }

    if (rule.colorId !== colorId) {
      changes.push({ field: 'Color', from: getColorName(rule.colorId), to: getColorName(colorId) });
    }

    // Check if conditions changed
    const oldConditions = rule.conditions || (rule.columnId ? [{
      columnId: rule.columnId,
      operator: rule.operator,
      value: rule.value || '',
    }] : []);

    const conditionsChanged = JSON.stringify(oldConditions.map(c => ({
      columnId: c.columnId,
      operator: c.operator,
      value: c.value,
    }))) !== JSON.stringify(conditions.map(c => ({
      columnId: c.columnId,
      operator: c.operator,
      value: c.value,
    })));

    if (conditionsChanged) {
      const oldDesc = oldConditions.map(c => `${getColumnTitle(c.columnId)} ${c.operator} ${c.value || ''}`).join(` ${rule.conditionLogic || 'AND'} `);
      const newDesc = conditions.map(c => `${getColumnTitle(c.columnId)} ${c.operator} ${c.value || ''}`).join(` ${conditionLogic} `);
      changes.push({ field: 'Conditions', from: oldDesc || '(none)', to: newDesc || '(none)' });
    }

    if ((rule.conditionLogic || 'AND') !== conditionLogic && conditions.length > 1) {
      changes.push({ field: 'Logic', from: rule.conditionLogic || 'AND', to: conditionLogic });
    }

    return changes;
  };

  const changes = rule ? getChanges() : [];

  const handleSaveClick = () => {
    if (!isValid()) return;

    if (rule && getChanges().length > 0) {
      setShowConfirm(true);
    } else {
      doSave();
    }
  };

  const doSave = () => {
    const savedRule = {
      id: rule?.id,
      name: name || `Rule ${Date.now()}`,
      colorId,
      enabled,
      conditions: conditions.map(c => ({
        columnId: c.columnId,
        operator: c.operator,
        value: operatorNeedsValue(c.operator) ? c.value : '',
      })),
      conditionLogic: conditions.length > 1 ? conditionLogic : 'AND',
      // Keep legacy fields for backward compatibility
      columnId: conditions[0]?.columnId || '',
      operator: conditions[0]?.operator || '',
      value: conditions[0]?.value || '',
    };

    onSave(savedRule);

    if (monday) {
      monday.execute('notice', {
        message: rule ? `Rule "${savedRule.name}" updated` : `Rule "${savedRule.name}" created`,
        type: 'success',
        timeout: 3000,
      });
    }
  };

  const modalContent = (
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
            <label style={{ display: 'block', marginBottom: 4, color: isDarkMode ? '#c5c7d0' : '#323338', fontSize: 13 }}>
              Rule Name
            </label>
            <input
              type="text"
              style={{ ...inputStyle, width: '100%' }}
              placeholder="e.g., Overdue tasks"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Box>

          <Box>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ color: isDarkMode ? '#c5c7d0' : '#323338', fontSize: 13 }}>
                Conditions
              </label>
              {conditions.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: isDarkMode ? '#c5c7d0' : '#676879' }}>Match:</span>
                  <select
                    style={{ ...selectStyle, padding: '4px 8px', fontSize: 12 }}
                    value={conditionLogic}
                    onChange={(e) => setConditionLogic(e.target.value)}
                  >
                    <option value="AND">ALL conditions (AND)</option>
                    <option value="OR">ANY condition (OR)</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{
              backgroundColor: isDarkMode ? '#272a4a' : '#f6f7fb',
              borderRadius: 8,
              padding: '4px 12px',
            }}>
              {conditions.map((condition, index) => (
                <ConditionRow
                  key={condition.id}
                  condition={condition}
                  columns={columns}
                  onChange={(updates) => updateCondition(condition.id, updates)}
                  onDelete={() => removeCondition(condition.id)}
                  canDelete={conditions.length > 1}
                  isDarkMode={isDarkMode}
                  selectStyle={selectStyle}
                  inputStyle={inputStyle}
                />
              ))}
            </div>

            <Button
              kind={Button.kinds.TERTIARY}
              size={Button.sizes.SMALL}
              leftIcon={Add}
              onClick={addCondition}
              style={{ marginTop: 8 }}
            >
              Add Condition
            </Button>
          </Box>

          <Box>
            <label style={{ display: 'block', marginBottom: 8, color: isDarkMode ? '#c5c7d0' : '#323338', fontSize: 13 }}>
              Highlight Color
            </label>
            <Flex gap={Flex.gaps.SMALL}>
              {HIGHLIGHT_COLORS.map(color => (
                <div
                  key={color.id}
                  onClick={() => setColorId(color.id)}
                  style={{
                    width: 32,
                    height: 32,
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
                    <span style={{ color: '#0073ea', fontWeight: 'bold', fontSize: 12 }}>✓</span>
                  )}
                </div>
              ))}
            </Flex>
          </Box>
        </Flex>
      </ModalContent>
      <ModalFooter>
        <Flex gap={Flex.gaps.SMALL} justify="End">
          <Button kind={Button.kinds.TERTIARY} onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveClick} disabled={!isValid()}>
            {rule ? 'Save Changes' : 'Create Rule'}
          </Button>
        </Flex>
      </ModalFooter>
    </Modal>
  );

  const confirmModal = showConfirm ? ReactDOM.createPortal(
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
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: isDarkMode ? '#1c1f3b' : '#ffffff',
        borderRadius: 8,
        padding: 24,
        maxWidth: 500,
        width: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: isDarkMode ? '#ffffff' : '#323338', fontSize: 18 }}>
          Confirm Changes
        </h3>
        <p style={{ margin: '0 0 16px 0', color: isDarkMode ? '#c5c7d0' : '#676879', fontSize: 14 }}>
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
                minWidth: 80
              }}>
                {change.field}:
              </span>
              <span style={{ color: isDarkMode ? '#c5c7d0' : '#676879', flex: 1 }}>
                <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>
                  {change.from}
                </span>
                <span style={{ margin: '0 6px' }}>→</span>
                <span style={{ color: isDarkMode ? '#00c875' : '#00854d', fontWeight: 500 }}>
                  {change.to}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button kind={Button.kinds.TERTIARY} onClick={() => setShowConfirm(false)}>
            Go Back
          </Button>
          <Button onClick={doSave}>
            Confirm Changes
          </Button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {modalContent}
      {confirmModal}
    </>
  );
}

export default RuleEditor;
