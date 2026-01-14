import React, { useState, useMemo, useCallback } from 'react';
import { Flex, Box, Heading, Tooltip, Button, IconButton } from 'monday-ui-react-core';
import { NavigationChevronLeft, NavigationChevronRight } from 'monday-ui-react-core/icons';
import { getItemHighlight } from '../utils/highlightEngine';

const ITEMS_PER_PAGE = 20;

// Memoize highlight calculations for performance
function useHighlightCache(items, rules, columns, isDarkMode) {
  return useMemo(() => {
    const cache = new Map();
    items.forEach(item => {
      cache.set(item.id, getItemHighlight(item, rules, columns, isDarkMode));
    });
    return cache;
  }, [items, rules, columns, isDarkMode]);
}

function ItemsTable({ items, columns, rules, isDarkMode }) {
  const [currentPage, setCurrentPage] = useState(1);

  // Memoized highlight cache for performance
  const highlightCache = useHighlightCache(items, rules, columns, isDarkMode);

  // Get columns to display (limit to first 5 for readability)
  const displayColumns = columns.slice(0, 5);

  // Pagination
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [items, currentPage]);

  // Reset to page 1 when items change
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [items.length]);

  if (items.length === 0) {
    return (
      <Box padding={Box.paddings.LARGE}>
        <div className="empty-state" style={{ backgroundColor: isDarkMode ? '#272a4a' : '#f6f7fb', borderRadius: 8 }}>
          <Heading type={Heading.types.H3} value="No Items Found" />
          <p style={{ marginTop: 8, color: isDarkMode ? '#c5c7d0' : '#676879' }}>
            This board doesn't have any items yet.
          </p>
        </div>
      </Box>
    );
  }

  return (
    <Box>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <Heading type={Heading.types.H3} value="Board Preview" />
          <p style={{ color: isDarkMode ? '#c5c7d0' : '#676879', fontSize: 14, margin: 0 }}>
            Showing {paginatedItems.length} of {items.length} items
            {totalPages > 1 && ` (page ${currentPage} of ${totalPages})`}
          </p>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconButton
              icon={NavigationChevronLeft}
              size={IconButton.sizes.SMALL}
              kind={IconButton.kinds.TERTIARY}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              ariaLabel="Previous page"
            />
            <span style={{
              fontSize: 13,
              color: isDarkMode ? '#c5c7d0' : '#676879',
              minWidth: 60,
              textAlign: 'center',
            }}>
              {currentPage} / {totalPages}
            </span>
            <IconButton
              icon={NavigationChevronRight}
              size={IconButton.sizes.SMALL}
              kind={IconButton.kinds.TERTIARY}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              ariaLabel="Next page"
            />
          </div>
        )}
      </div>

      <div className="items-table-container" style={{ overflowX: 'auto' }}>
        <table className="items-table" style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: isDarkMode ? '#272a4a' : '#ffffff',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <thead>
            <tr style={{
              backgroundColor: isDarkMode ? '#1c1f3b' : '#f6f7fb',
              borderBottom: `1px solid ${isDarkMode ? '#3d4066' : '#e6e9ef'}`,
            }}>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontWeight: 600,
                color: isDarkMode ? '#ffffff' : '#323338',
              }}>
                Item
              </th>
              {displayColumns.map(col => (
                <th
                  key={col.id}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: isDarkMode ? '#ffffff' : '#323338',
                  }}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map(item => {
              const highlight = highlightCache.get(item.id);

              return (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: highlight?.color || 'transparent',
                    borderBottom: `1px solid ${isDarkMode ? '#3d4066' : '#e6e9ef'}`,
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <td style={{
                    padding: '12px 16px',
                    color: isDarkMode ? '#ffffff' : '#323338',
                    fontWeight: 500,
                  }}>
                    <Flex align="Center" gap={Flex.gaps.SMALL}>
                      {item.name}
                      {highlight && (
                        <Tooltip
                          content={
                            highlight.totalMatches > 1
                              ? `Rules: ${highlight.allMatchingRules.map(r => r.name).join(', ')}`
                              : `Rule: ${highlight.ruleName}`
                          }
                        >
                          <span style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            {highlight.ruleName}
                            {highlight.totalMatches > 1 && (
                              <span style={{
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                                padding: '1px 4px',
                                borderRadius: 3,
                                fontSize: 9,
                                fontWeight: 600,
                              }}>
                                +{highlight.totalMatches - 1}
                              </span>
                            )}
                          </span>
                        </Tooltip>
                      )}
                    </Flex>
                  </td>
                  {displayColumns.map(col => {
                    const colValue = item.column_values.find(cv => cv.id === col.id);
                    return (
                      <td
                        key={col.id}
                        style={{
                          padding: '12px 16px',
                          color: isDarkMode ? '#c5c7d0' : '#676879',
                        }}
                      >
                        {renderColumnValue(colValue, col.type, isDarkMode)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Box>
  );
}

function renderColumnValue(colValue, columnType, isDarkMode) {
  if (!colValue || !colValue.text) {
    return <span style={{ opacity: 0.5 }}>-</span>;
  }

  const text = colValue.text;

  // Special rendering for status columns
  if (columnType === 'status' || columnType === 'color') {
    let bgColor = '#c4c4c4';
    try {
      const parsed = JSON.parse(colValue.value);
      if (parsed?.index !== undefined) {
        // Status colors from Monday.com palette
        const statusColors = [
          '#c4c4c4', '#fdab3d', '#00c875', '#e2445c', '#0086c0',
          '#a25ddc', '#037f4c', '#579bfc', '#caa35e', '#9cd326'
        ];
        bgColor = statusColors[parsed.index % statusColors.length] || '#c4c4c4';
      }
    } catch (e) {}

    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 12,
        backgroundColor: bgColor,
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 500,
      }}>
        {text}
      </span>
    );
  }

  // Special rendering for checkbox
  if (columnType === 'checkbox') {
    let isChecked = false;
    try {
      const parsed = JSON.parse(colValue.value);
      isChecked = parsed?.checked === true;
    } catch (e) {}

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: isChecked ? '#00c875' : (isDarkMode ? '#3d4066' : '#e6e9ef'),
        color: '#ffffff',
      }}>
        {isChecked ? '✓' : ''}
      </span>
    );
  }

  // Default text rendering
  return text;
}

export default ItemsTable;
