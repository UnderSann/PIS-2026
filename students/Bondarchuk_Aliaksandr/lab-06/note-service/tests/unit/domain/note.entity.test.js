const Note = require('../../../domain/entities/note');
const NoteId = require('../../../domain/value_objects/note_id');
const OwnerId = require('../../../domain/value_objects/owner_id');
const NoteTitle = require('../../../domain/value_objects/note_title');
const NoteContent = require('../../../domain/value_objects/note_content');

describe('Note Aggregate - Unit Tests', () => {
  let note;

  beforeEach(() => {
    note = new Note(
      new NoteId('123e4567-e89b-12d3-a456-426614174000'),
      new OwnerId('user-123'),
      new NoteTitle('My Note'),
      new NoteContent('Initial content')
    );
  });

  test('should create note with initial version 1 and not deleted', () => {
    expect(note.version).toBe(1);
    expect(note.isDeleted).toBe(false);
    expect(note.getEvents()).toHaveLength(1);
  });

  test('should update content and increment version', () => {
    const newContent = new NoteContent('Updated content');
    note.updateContent(newContent);

    expect(note.content.value).toBe('Updated content');
    expect(note.version).toBe(2);
    
    const events = note.getEvents();
    expect(events.some(e => e.type === 'NoteContentUpdatedEvent')).toBe(true);
  });

  test('should not update deleted note (invariant)', () => {
    note.delete();
    expect(() => {
      note.updateContent(new NoteContent('New content'));
    }).toThrow('Cannot update a deleted note');
  });

  test('should soft delete note', () => {
    note.delete();
    expect(note.isDeleted).toBe(true);
    
    const events = note.getEvents();
    expect(events.some(e => e.type === 'NoteDeletedEvent')).toBe(true);
  });

  test('should clear events after dispatching', () => {
    note.clearEvents();
    expect(note.getEvents()).toHaveLength(0);
  });
});