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
  TextField,
  Tooltip
} from 'monday-ui-react-core';
import { Add, Delete, Settings, Info } from 'monday-ui-react-core/icons';
import RuleEditor from './components/RuleEditor';
import ItemsTable from './components/ItemsTable';
import logoImg from '/logo.png';

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
    if (editingRule) {
      newRules = rules.map(r => r.id === editingRule.id ? rule : r);
    } else {
      newRules = [...rules, { ...rule, id: Date.now().toString() }];
    }
    handleRulesChange(newRules);
    setShowRuleEditor(false);
    setEditingRule(null);
  };

  // Delete rule
  const handleDeleteRule = (ruleId) => {
    const newRules = rules.filter(r => r.id !== ruleId);
    handleRulesChange(newRules);
  };

  // Toggle rule enabled/disabled
  const handleToggleRule = (ruleId) => {
    const newRules = rules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    handleRulesChange(newRules);
  };

  // Move rule up/down (change priority)
  const handleMoveRule = (ruleId, direction) => {
    const index = rules.findIndex(r => r.id === ruleId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rules.length) return;

    const newRules = [...rules];
    [newRules[index], newRules[newIndex]] = [newRules[newIndex], newRules[index]];
    handleRulesChange(newRules);
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
    minHeight: '100vh'
  };

  return (
    <Box padding={Box.paddings.LARGE} style={containerStyle}>
      <Flex direction="Column" gap={Flex.gaps.LARGE}>
        {/* Header */}
        <Flex justify="SpaceBetween" align="Center">
          <Flex align="Center" gap={Flex.gaps.MEDIUM}>
            <img src={logoImg} alt="Smart Row Highlighter" style={{ width: 48, height: 48 }} />
            <Box>
              <Heading type={Heading.types.H1} value="Smart Row Highlighter" />
              <p style={{ color: isDarkMode ? '#c5c7d0' : '#676879', marginTop: 4 }}>
                Highlight rows based on column values
              </p>
            </Box>
          </Flex>
          <Button
            leftIcon={Add}
            onClick={handleAddRule}
          >
            Add Rule
          </Button>
        </Flex>

        {/* Rules List */}
        {rules.length > 0 ? (
          <Box>
            <Heading type={Heading.types.H3} value="Highlighting Rules" />
            <p style={{ color: isDarkMode ? '#c5c7d0' : '#676879', fontSize: 14, marginBottom: 12 }}>
              Rules are applied in order. First matching rule wins.
            </p>
            <Flex direction="Column" gap={Flex.gaps.SMALL}>
              {rules.map((rule, index) => {
                const color = HIGHLIGHT_COLORS.find(c => c.id === rule.colorId);
                const column = columns.find(c => c.id === rule.columnId);

                return (
                  <div
                    key={rule.id}
                    className={`rule-card ${rule.enabled ? 'enabled' : 'disabled'}`}
                    style={{
                      borderLeftColor: color?.value,
                      backgroundColor: isDarkMode ? '#272a4a' : '#f6f7fb'
                    }}
                  >
                    <Flex justify="SpaceBetween" align="Center">
                      <Flex align="Center" gap={Flex.gaps.MEDIUM}>
                        <Toggle
                          isSelected={rule.enabled}
                          onChange={() => handleToggleRule(rule.id)}
                          size="small"
                        />
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            backgroundColor: isDarkMode ? color?.dark : color?.value
                          }}
                        />
                        <span style={{ color: isDarkMode ? '#ffffff' : '#323338' }}>
                          <strong>{rule.name || 'Unnamed Rule'}</strong>
                          <span style={{ color: isDarkMode ? '#c5c7d0' : '#676879', marginLeft: 8 }}>
                            If "{column?.title || rule.columnId}" {rule.operator} {rule.value ? `"${rule.value}"` : ''}
                          </span>
                        </span>
                      </Flex>
                      <Flex gap={Flex.gaps.SMALL}>
                        <IconButton
                          icon={Settings}
                          size={IconButton.sizes.SMALL}
                          kind={IconButton.kinds.TERTIARY}
                          onClick={() => handleEditRule(rule)}
                          ariaLabel="Edit rule"
                        />
                        <IconButton
                          icon={Delete}
                          size={IconButton.sizes.SMALL}
                          kind={IconButton.kinds.TERTIARY}
                          onClick={() => handleDeleteRule(rule.id)}
                          ariaLabel="Delete rule"
                        />
                      </Flex>
                    </Flex>
                  </div>
                );
              })}
            </Flex>
          </Box>
        ) : (
          <div className="empty-state" style={{ backgroundColor: isDarkMode ? '#272a4a' : '#f6f7fb', borderRadius: 8 }}>
            <Heading type={Heading.types.H3} value="No Rules Yet" />
            <p style={{ marginTop: 8, marginBottom: 16 }}>
              Create your first rule to start highlighting rows based on conditions.
            </p>
            <Button leftIcon={Add} onClick={handleAddRule}>
              Create First Rule
            </Button>
          </div>
        )}

        {/* Items Table with Highlighting */}
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
          />
        )}
      </Flex>
    </Box>
  );
}

export default App;
