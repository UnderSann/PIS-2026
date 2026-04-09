const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const USER_ID = 'e2e-user-42';

test.describe('Notes Sync E2E Flow', () => {
  test('complete lifecycle of a note', async ({ request }) => {
    // 1. CREATE
    const createResponse = await request.post(`${BASE_URL}/api/notes`, {
      headers: { 'X-User-Id': USER_ID, 'Content-Type': 'application/json' },
      data: { title: 'E2E Test Note', content: 'Initial content' },
    });
    expect(createResponse.status()).toBe(201);
    const { id: noteId } = await createResponse.json();
    expect(noteId).toBeDefined();

    // 2. READ - verify creation
    const getResponse = await request.get(`${BASE_URL}/api/notes/${noteId}`, {
      headers: { 'X-User-Id': USER_ID },
    });
    expect(getResponse.status()).toBe(200);
    const note = await getResponse.json();
    expect(note.title).toBe('E2E Test Note');
    expect(note.version).toBe(1);

    // 3. UPDATE
    const updateResponse = await request.put(`${BASE_URL}/api/notes/${noteId}`, {
      headers: { 'X-User-Id': USER_ID, 'Content-Type': 'application/json' },
      data: { content: 'Updated E2E content' },
    });
    expect(updateResponse.status()).toBe(204);

    // 4. VERIFY UPDATE
    const getUpdatedResponse = await request.get(`${BASE_URL}/api/notes/${noteId}`, {
      headers: { 'X-User-Id': USER_ID },
    });
    const updatedNote = await getUpdatedResponse.json();
    expect(updatedNote.content).toBe('Updated E2E content');
    expect(updatedNote.version).toBe(2);

    // 5. DELETE (soft delete)
    const deleteResponse = await request.delete(`${BASE_URL}/api/notes/${noteId}`, {
      headers: { 'X-User-Id': USER_ID },
    });
    expect(deleteResponse.status()).toBe(204);

    // 6. VERIFY DELETED - should NOT appear in listing (includeDeleted=false)
    const listResponse = await request.get(`${BASE_URL}/api/notes`, {
      headers: { 'X-User-Id': USER_ID },
    });
    const notes = await listResponse.json();
    const found = notes.find(n => n.id === noteId);
    expect(found).toBeUndefined();

    // 7. OPTIONAL: verify can be retrieved with includeDeleted flag
    const listWithDeleted = await request.get(`${BASE_URL}/api/notes?includeDeleted=true`, {
      headers: { 'X-User-Id': USER_ID },
    });
    const allNotes = await listWithDeleted.json();
    const deletedNote = allNotes.find(n => n.id === noteId);
    expect(deletedNote).toBeDefined();
    expect(deletedNote.isDeleted).toBe(true);
  });
});