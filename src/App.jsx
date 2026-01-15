import React, { useState, useEffect, useCallback } from 'react';
import { useMonday } from './hooks/useMonday';
import { getBoardItems, getBoardColumns, saveRules, loadRules } from './services/mondayService';
import { getItemHighlight, HIGHLIGHT_COLORS, getOperatorsForType } from './utils/highlightEngine';
import {
  Button,
  Loader,
  Heading,
  Flex,
  Box,
  IconButton,
  Toggle,
  Tooltip
} from 'monday-ui-react-core';
import { Add, Delete, Settings, Drag, Duplicate, Search, CloseSmall, Download, Upload } from 'monday-ui-react-core/icons';
import RuleEditor from './components/RuleEditor';
import ItemsTable from './components/ItemsTable';
import Onboarding from './components/Onboarding';
import logoImg from '/logo.png';

const ONBOARDING_KEY = 'smart-row-highlighter-onboarding-seen';
const FREE_RULE_LIMIT = 5;
const IS_PRO = false; // TODO: Integrate with Monday.com subscription API

function App() {
  const { monday, context, loading: sdkLoading } = useMonday();
  const [theme, setTheme] = useState('light');

  // Listen for theme changes
  useEffect(() => {
    if (monday) {
      monday.listen('context', (res) => {
        if (res?.data?.theme) {
          setTheme(res.data.theme);
        }
      });
      monday.get('context').then((res) => {
        if (res?.data?.theme) {
          setTheme(res.data.theme);
        }
      }).catch((err) => {
        console.error('Error getting theme:', err);
      });
    }
  }, [monday]);

  // Apply theme class
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    if (theme === 'dark' || theme === 'black') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [theme]);

  const isDarkMode = theme === 'dark' || theme === 'black';

  // Data state
  const [items, setItems] = useState([]);
  const [columns, setColumns] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  // UI state
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [ruleSearchQuery, setRuleSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_KEY);
  });

  // Drag and drop state
  const [draggedRuleId, setDraggedRuleId] = useState(null);
  const [dragOverRuleId, setDragOverRuleId] = useState(null);

  // Load board data
  useEffect(() => {
    if (context?.boardId) {
      loadBoardData();
    }
  }, [context]);

  const loadBoardData = async () => {
    setLoading(true);
    try {
      const [boardItems, boardColumns, savedRules] = await Promise.all([
        getBoardItems(context.boardId),
        getBoardColumns(context.boardId),
        loadRules(context.boardId)
      ]);

      setItems(boardItems);
      setColumns(boardColumns.filter(c => c.type !== 'name'));
      setRules(savedRules || []);
    } catch (error) {
      console.error('Error loading board data:', error);
      monday.execute('notice', {
        message: 'Error loading board data',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Save rules when they change
  const handleRulesChange = useCallback(async (newRules) => {
    setRules(newRules);
    if (context?.boardId) {
      await saveRules(context.boardId, newRules);
    }
  }, [context]);

  // Add new rule
  const handleAddRule = () => {
    setEditingRule(null);
    setShowRuleEditor(true);
  };

  // Edit existing rule
  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setShowRuleEditor(true);
  };

  // Save rule (new or edited)
  const handleSaveRule = (rule) => {
    let newRules;
    const isFirstRule = rules.length === 0 && !editingRule;

    if (editingRule) {
      newRules = rules.map(r => r.id === editingRule.id ? rule : r);
    } else {
      newRules = [...rules, { ...rule, id: Date.now().toString() }];
    }
    handleRulesChange(newRules);
    setShowRuleEditor(false);
    setEditingRule(null);

    // Track first value created for monday.com analytics
    if (isFirstRule) {
      monday.execute('valueCreatedForUser');
    }
  };

  // Duplicate rule
  const handleDuplicateRule = (rule) => {
    const duplicatedRule = {
      ...rule,
      id: Date.now().toString(),
      name: `${rule.name} (copy)`,
    };
    const newRules = [...rules, duplicatedRule];
    handleRulesChange(newRules);

    monday.execute('notice', {
      message: `Rule "${rule.name}" duplicated`,
      type: 'success',
      timeout: 3000,
    });
  };

  // Delete rule with confirmation
  const handleDeleteRule = (ruleId) => {
    setDeleteConfirm(ruleId);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      const deletedRule = rules.find(r => r.id === deleteConfirm);
      const newRules = rules.filter(r => r.id !== deleteConfirm);
      handleRulesChange(newRules);
      setDeleteConfirm(null);

      // Show toast notification
      monday.execute('notice', {
        message: `Rule "${deletedRule?.name || 'Unnamed'}" deleted`,
        type: 'success',
        timeout: 3000,
      });
    }
  };

  // Toggle rule enabled/disabled
  const handleToggleRule = (ruleId) => {
    const newRules = rules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    handleRulesChange(newRules);
  };

  // Drag and drop handlers
  const handleDragStart = (e, ruleId) => {
    setDraggedRuleId(ruleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, ruleId) => {
    e.preventDefault();
    if (ruleId !== draggedRuleId) {
      setDragOverRuleId(ruleId);
    }
  };

  const handleDragLeave = () => {
    setDragOverRuleId(null);
  };

  const handleDrop = (e, targetRuleId) => {
    e.preventDefault();
    if (draggedRuleId && targetRuleId && draggedRuleId !== targetRuleId) {
      const draggedIndex = rules.findIndex(r => r.id === draggedRuleId);
      const targetIndex = rules.findIndex(r => r.id === targetRuleId);

      const newRules = [...rules];
      const [draggedRule] = newRules.splice(draggedIndex, 1);
      newRules.splice(targetIndex, 0, draggedRule);

      handleRulesChange(newRules);
    }
    setDraggedRuleId(null);
    setDragOverRuleId(null);
  };

  const handleDragEnd = () => {
    setDraggedRuleId(null);
    setDragOverRuleId(null);
  };

  // Export rules to JSON file
  const handleExportRules = () => {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      rules: rules.map(r => ({
        name: r.name,
        colorId: r.colorId,
        enabled: r.enabled,
        conditions: r.conditions || [{ columnId: r.columnId, operator: r.operator, value: r.value }],
        conditionLogic: r.conditionLogic || 'AND',
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `highlight-rules-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    monday.execute('notice', {
      message: `${rules.length} rules exported successfully`,
      type: 'success',
      timeout: 3000,
    });
  };

  // Import rules from JSON
  const handleImportRules = () => {
    try {
      const data = JSON.parse(importData);

      if (!data.rules || !Array.isArray(data.rules)) {
        throw new Error('Invalid format');
      }

      const importedRules = data.rules.map(r => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: r.name,
        colorId: r.colorId || 'yellow',
        enabled: r.enabled ?? true,
        conditions: r.conditions || [],
        conditionLogic: r.conditionLogic || 'AND',
        // Legacy fields
        columnId: r.conditions?.[0]?.columnId || '',
        operator: r.conditions?.[0]?.operator || '',
        value: r.conditions?.[0]?.value || '',
      }));

      const newRules = [...rules, ...importedRules];
      handleRulesChange(newRules);
      setShowImportModal(false);
      setImportData('');

      monday.execute('notice', {
        message: `${importedRules.length} rules imported successfully`,
        type: 'success',
        timeout: 3000,
      });
    } catch (e) {
      monday.execute('notice', {
        message: 'Invalid JSON format. Please check your data.',
        type: 'error',
        timeout: 5000,
      });
    }
  };

  // Loading state
  if (sdkLoading || loading) {
    return (
      <Flex justify="Center" align="Center" style={{ height: '100vh' }}>
        <Loader size={40} />
      </Flex>
    );
  }

  // No board context
  if (!context?.boardId) {
    return (
      <Box padding={Box.paddings.LARGE}>
        <div className="empty-state">
          <Heading type={Heading.types.H2} value="No Board Selected" />
          <p>Please add this view to a board to get started.</p>
        </div>
      </Box>
    );
  }

  const containerStyle = {
    backgroundColor: isDarkMode ? '#1c1f3b' : '#ffffff',
    minHeight: '100vh',
    padding: 24
  };

  const ruleCardStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: 8,
    backgroundColor: isDarkMode ? '#272a4a' : '#f6f7fb',
    minWidth: 0,
  };

  return (
    <div style={containerStyle}>
      {/* Header - Compact */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logoImg} alt="Smart Row Highlighter" style={{ width: 48, height: 48 }} />
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              color: isDarkMode ? '#ffffff' : '#323338'
            }}>
              Smart Row Highlighter
            </h1>
            <p style={{
              margin: 0,
              fontSize: 13,
              color: isDarkMode ? '#c5c7d0' : '#676879'
            }}>
              Highlight rows based on column values
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {rules.length > 0 && (
            <>
              <Tooltip content="Export rules">
                <IconButton
                  icon={Download}
                  size={IconButton.sizes.SMALL}
                  kind={IconButton.kinds.TERTIARY}
                  onClick={handleExportRules}
                  ariaLabel="Export rules"
                />
              </Tooltip>
              <Tooltip content="Import rules">
                <IconButton
                  icon={Upload}
                  size={IconButton.sizes.SMALL}
                  kind={IconButton.kinds.TERTIARY}
                  onClick={() => setShowImportModal(true)}
                  ariaLabel="Import rules"
                />
              </Tooltip>
            </>
          )}
          <Tooltip
            content={!IS_PRO && rules.length >= FREE_RULE_LIMIT ? `Free plan limit: ${FREE_RULE_LIMIT} rules. Upgrade to Pro for unlimited rules.` : ''}
          >
            <Button
              leftIcon={Add}
              onClick={handleAddRule}
              size={Button.sizes.SMALL}
              disabled={!IS_PRO && rules.length >= FREE_RULE_LIMIT}
            >
              Add Rule {!IS_PRO && `(${rules.length}/${FREE_RULE_LIMIT})`}
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Upgrade Banner */}
      {!IS_PRO && rules.length >= FREE_RULE_LIMIT - 1 && (
        <div style={{
          backgroundColor: isDarkMode ? '#2a3a5c' : '#e7f3ff',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          border: `1px solid ${isDarkMode ? '#3d5a80' : '#b3d7ff'}`,
        }}>
          <div>
            <span style={{
              fontWeight: 600,
              color: isDarkMode ? '#ffffff' : '#323338',
              fontSize: 14,
            }}>
              {rules.length >= FREE_RULE_LIMIT ? 'Rule limit reached!' : 'Almost at your limit!'}
            </span>
            <span style={{
              color: isDarkMode ? '#c5c7d0' : '#676879',
              fontSize: 13,
              marginLeft: 8,
            }}>
              Upgrade to Pro for unlimited rules, priority support, and more.
            </span>
          </div>
          <Button
            size={Button.sizes.SMALL}
            onClick={() => {
              monday.execute('openPlanSelection');
            }}
          >
            Upgrade
          </Button>
        </div>
      )}

      {/* Rules Section - Compact Grid */}
      {rules.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            flexWrap: 'wrap',
            gap: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: isDarkMode ? '#ffffff' : '#323338'
              }}>
                Rules ({rules.length})
              </h3>
              <span style={{
                fontSize: 12,
                color: isDarkMode ? '#c5c7d0' : '#676879'
              }}>
                First match wins
              </span>
            </div>
            {/* Search Rules */}
            {rules.length > 3 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                backgroundColor: isDarkMode ? '#30324e' : '#f6f7fb',
                borderRadius: 6,
                padding: '4px 8px',
              }}>
                <Search size={14} style={{ color: isDarkMode ? '#c5c7d0' : '#676879' }} />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={ruleSearchQuery}
                  onChange={(e) => setRuleSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: 12,
                    color: isDarkMode ? '#ffffff' : '#323338',
                    width: 120,
                  }}
                />
                {ruleSearchQuery && (
                  <IconButton
                    icon={CloseSmall}
                    size={IconButton.sizes.XXS}
                    kind={IconButton.kinds.TERTIARY}
                    onClick={() => setRuleSearchQuery('')}
                    ariaLabel="Clear search"
                  />
                )}
              </div>
            )}
          </div>

          {/* Rules Grid - 2 columns on larger screens */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 8
          }}>
            {rules
              .filter(rule => {
                if (!ruleSearchQuery) return true;
                const searchLower = ruleSearchQuery.toLowerCase();
                const column = columns.find(c => c.id === rule.columnId);
                return (
                  rule.name?.toLowerCase().includes(searchLower) ||
                  column?.title?.toLowerCase().includes(searchLower) ||
                  rule.value?.toLowerCase().includes(searchLower)
                );
              })
              .map((rule, index) => {
              const color = HIGHLIGHT_COLORS.find(c => c.id === rule.colorId);
              const column = columns.find(c => c.id === rule.columnId);
              const isDragging = draggedRuleId === rule.id;
              const isDragOver = dragOverRuleId === rule.id;

              return (
                <div
                  key={rule.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, rule.id)}
                  onDragOver={(e) => handleDragOver(e, rule.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, rule.id)}
                  onDragEnd={handleDragEnd}
                  style={{
                    ...ruleCardStyle,
                    borderLeft: `4px solid ${color?.value || '#ccc'}`,
                    opacity: isDragging ? 0.5 : (rule.enabled ? 1 : 0.6),
                    transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isDragOver ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                    cursor: 'grab',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minWidth: 0,
                    flex: 1
                  }}>
                    <div style={{
                      cursor: 'grab',
                      color: isDarkMode ? '#676879' : '#c5c7d0',
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                      <Drag size={16} />
                    </div>
                    <Toggle
                      isSelected={rule.enabled}
                      onChange={() => handleToggleRule(rule.id)}
                      size="small"
                      offOverrideText=""
                      onOverrideText=""
                    />
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        backgroundColor: isDarkMode ? color?.dark : color?.value,
                        flexShrink: 0
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: isDarkMode ? '#ffffff' : '#323338',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {rule.name || 'Unnamed'}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: isDarkMode ? '#c5c7d0' : '#676879',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {column?.title || rule.columnId} {rule.operator} {rule.value ? `"${rule.value}"` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <IconButton
                      icon={Settings}
                      size={IconButton.sizes.XS}
                      kind={IconButton.kinds.TERTIARY}
                      onClick={() => handleEditRule(rule)}
                      ariaLabel="Edit rule"
                    />
                    <IconButton
                      icon={Duplicate}
                      size={IconButton.sizes.XS}
                      kind={IconButton.kinds.TERTIARY}
                      onClick={() => handleDuplicateRule(rule)}
                      ariaLabel="Duplicate rule"
                    />
                    <IconButton
                      icon={Delete}
                      size={IconButton.sizes.XS}
                      kind={IconButton.kinds.TERTIARY}
                      onClick={() => handleDeleteRule(rule.id)}
                      ariaLabel="Delete rule"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {rules.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 32,
          backgroundColor: isDarkMode ? '#272a4a' : '#f6f7fb',
          borderRadius: 8,
          marginBottom: 20
        }}>
          <h3 style={{
            margin: '0 0 8px 0',
            color: isDarkMode ? '#ffffff' : '#323338'
          }}>
            No Rules Yet
          </h3>
          <p style={{
            margin: '0 0 16px 0',
            color: isDarkMode ? '#c5c7d0' : '#676879'
          }}>
            Create your first rule to start highlighting rows.
          </p>
          <Button leftIcon={Add} onClick={handleAddRule}>
            Create First Rule
          </Button>
        </div>
      )}

      {/* Items Table */}
      <ItemsTable
        items={items}
        columns={columns}
        rules={rules}
        isDarkMode={isDarkMode}
      />

      {/* Rule Editor Modal */}
      {showRuleEditor && (
        <RuleEditor
          rule={editingRule}
          columns={columns}
          onSave={handleSaveRule}
          onClose={() => {
            setShowRuleEditor(false);
            setEditingRule(null);
          }}
          isDarkMode={isDarkMode}
          monday={monday}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: isDarkMode ? '#1c1f3b' : '#ffffff',
            borderRadius: 8,
            padding: 24,
            maxWidth: 400,
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              color: isDarkMode ? '#ffffff' : '#323338'
            }}>
              Delete Rule?
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              color: isDarkMode ? '#c5c7d0' : '#676879'
            }}>
              Are you sure you want to delete this rule? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                kind={Button.kinds.TERTIARY}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                color={Button.colors.NEGATIVE}
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding */}
      {showOnboarding && (
        <Onboarding
          isDarkMode={isDarkMode}
          onComplete={() => {
            localStorage.setItem(ONBOARDING_KEY, 'true');
            setShowOnboarding(false);
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: isDarkMode ? '#1c1f3b' : '#ffffff',
            borderRadius: 8,
            padding: 24,
            maxWidth: 500,
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              color: isDarkMode ? '#ffffff' : '#323338'
            }}>
              Import Rules
            </h3>
            <p style={{
              margin: '0 0 16px 0',
              color: isDarkMode ? '#c5c7d0' : '#676879',
              fontSize: 14
            }}>
              Paste JSON data exported from another board. Rules will be added to your existing rules.
            </p>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder='{"version": "1.0", "rules": [...]}'
              style={{
                width: '100%',
                height: 150,
                padding: 12,
                borderRadius: 6,
                border: `1px solid ${isDarkMode ? '#4b4e69' : '#c5c7d0'}`,
                backgroundColor: isDarkMode ? '#30324e' : '#ffffff',
                color: isDarkMode ? '#ffffff' : '#323338',
                fontSize: 13,
                fontFamily: 'monospace',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <Button
                kind={Button.kinds.TERTIARY}
                onClick={() => {
                  setShowImportModal(false);
                  setImportData('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportRules}
                disabled={!importData.trim()}
              >
                Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
