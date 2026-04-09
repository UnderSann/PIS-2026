const NoteProjection = require('../../../infrastructure/projection/note_projection');

describe('NoteProjection', () => {
  let mockModel;
  let projection;

  beforeEach(() => {
    mockModel = {
      upsert: jest.fn().mockResolvedValue([true]),
      update: jest.fn().mockResolvedValue([1]),
    };
    
    const mockSequelize = {
      define: jest.fn().mockReturnValue(mockModel),
    };
    
    projection = new NoteProjection(mockSequelize);
    projection.model = mockModel;
  });

  test('onNoteCreated should upsert NoteView', async () => {
    const event = {
      data: {
        noteId: 'note-1',
        ownerId: 'user-1',
        title: 'Test',
        content: 'Content',
        version: 1,
        createdAt: new Date(),
      },
    };

    await projection.onNoteCreated(event);

    expect(mockModel.upsert).toHaveBeenCalledWith({
      id: 'note-1',
      ownerId: 'user-1',
      title: 'Test',
      content: 'Content',
      version: 1,
      isDeleted: false,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  test('onNoteContentUpdated should update existing NoteView', async () => {
    const event = {
      data: {
        noteId: 'note-1',
        newContent: 'Updated',
        version: 2,
        updatedAt: new Date(),
      },
    };

    await projection.onNoteContentUpdated(event);

    expect(mockModel.update).toHaveBeenCalledWith(
      {
        content: 'Updated',
        version: 2,
        updatedAt: expect.any(Date),
      },
      { where: { id: 'note-1' } }
    );
  });

  test('onNoteDeleted should mark as deleted', async () => {
    const event = { data: { noteId: 'note-1' } };

    await projection.onNoteDeleted(event);

    expect(mockModel.update).toHaveBeenCalledWith(
      { isDeleted: true, updatedAt: expect.any(Date) },
      { where: { id: 'note-1' } }
    );
  });
});