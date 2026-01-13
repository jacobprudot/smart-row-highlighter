import mondaySdk from 'monday-sdk-js';

const monday = mondaySdk();
monday.setApiVersion("2024-10");

// Get board items with column values
export async function getBoardItems(boardId) {
  const query = `
    query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        items_page(limit: 500) {
          items {
            id
            name
            group {
              id
              title
              color
            }
            column_values {
              id
              type
              text
              value
            }
          }
        }
      }
    }
  `;

  const response = await monday.api(query, {
    variables: { boardId: [boardId] }
  });

  return response.data.boards[0]?.items_page?.items || [];
}

// Get board columns
export async function getBoardColumns(boardId) {
  const query = `
    query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;

  const response = await monday.api(query, {
    variables: { boardId: [boardId] }
  });

  return response.data.boards[0]?.columns || [];
}

// Storage API - Save rules
export async function saveRules(boardId, rules) {
  const key = `srh_rules_${boardId}`;
  const value = JSON.stringify(rules);

  await monday.storage.instance.setItem(key, value);
}

// Storage API - Load rules
export async function loadRules(boardId) {
  const key = `srh_rules_${boardId}`;

  const response = await monday.storage.instance.getItem(key);

  if (response.data?.value) {
    try {
      return JSON.parse(response.data.value);
    } catch (e) {
      console.error('Error parsing rules:', e);
      return [];
    }
  }

  return [];
}
