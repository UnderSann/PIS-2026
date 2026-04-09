const CreateNoteHandler = require('../../../application/handler/create_note_handler');
const UpdateNoteHandler = require('../../../application/handler/update_note_handler');
const DeleteNoteHandler = require('../../../application/handler/delete_note_handler');
const CreateNoteCommand = require('../../../application/command/create_note_command');

describe('Application Handlers - Unit Tests', () => {
  let mockRepository;
  let mockEventBus;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
    };
    mockEventBus = {
      publish: jest.fn(),
    };
  });

  test('CreateNoteHandler should save note and return ID', async () => {
    const handler = new CreateNoteHandler(mockRepository, mockEventBus);
    const command = new CreateNoteCommand('user-123', 'Test', 'Content');

    const noteId = await handler.execute(command);

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    const savedNote = mockRepository.save.mock.calls[0][0];
    expect(savedNote.ownerId.value).toBe('user-123');
    expect(savedNote.title.value).toBe('Test');
    expect(noteId).toBeDefined();
  });

  test('UpdateNoteHandler should load, update and save', async () => {
    const existingNote = new Note(
      new NoteId('note-1'),
      new OwnerId('user-123'),
      new NoteTitle('Old'),
      new NoteContent('Old content')
    );
    mockRepository.findById.mockResolvedValue(existingNote);

    const handler = new UpdateNoteHandler(mockRepository, mockEventBus);
    const command = new UpdateNoteCommand('note-1', 'New content');

    await handler.execute(command);

    expect(existingNote.content.value).toBe('New content');
    expect(mockRepository.save).toHaveBeenCalledWith(existingNote);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });

  test('DeleteNoteHandler should soft delete', async () => {
    const existingNote = new Note(/*...*/);
    mockRepository.findById.mockResolvedValue(existingNote);

    const handler = new DeleteNoteHandler(mockRepository, mockEventBus);
    await handler.execute(new DeleteNoteCommand('note-1'));

    expect(existingNote.isDeleted).toBe(true);
    expect(mockRepository.save).toHaveBeenCalled();
  });
});