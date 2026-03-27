// tests/unit/note-service.test.js

const NoteService = require('../../src/application/service/note-service');
const Note = require('../../src/domain/models/note');
const { NoteNotFoundException, UnauthorizedNoteAccessException } = require('../../src/domain/exceptions/domain-exception');
const { CreateNoteCommand } = require('../../src/application/port/in/create-note-use-case');
const { GetNoteQuery } = require('../../src/application/port/in/get-note-use-case');

// Моки для зависимостей
class MockNoteRepository {
  constructor() {
    this.notes = new Map();
    this.save = jest.fn().mockImplementation(async (note) => {
      this.notes.set(note.id, note);
      return note;
    });
    this.findById = jest.fn().mockImplementation(async (id) => {
      return this.notes.get(id) || null;
    });
    this.findByOwner = jest.fn();
    this.delete = jest.fn();
  }
}

class MockFileStorage {
  constructor() {
    this.upload = jest.fn().mockImplementation(async (content, userId) => {
      return `file-${Date.now()}-${userId}.txt`;
    });
    this.download = jest.fn();
    this.delete = jest.fn();
  }
}

describe('NoteService', () => {
  let noteService;
  let mockRepository;
  let mockFileStorage;

  beforeEach(() => {
    mockRepository = new MockNoteRepository();
    mockFileStorage = new MockFileStorage();
    noteService = new NoteService(mockRepository, mockFileStorage);
  });

  test('✅ Успешное создание заметки', async () => {
    // Arrange
    const command = new CreateNoteCommand(
      'user-123',
      'Тестовая заметка',
      Buffer.from('Содержимое файла')
    );

    // Act
    const note = await noteService.execute(command);

    // Assert
    expect(note).toBeDefined();
    expect(note.id).toBeDefined();
    expect(note.ownerId).toBe('user-123');
    expect(note.title).toBe('Тестовая заметка');
    expect(note.version).toBe(1);
    
    // Проверяем вызовы зависимостей
    expect(mockFileStorage.upload).toHaveBeenCalledTimes(1);
    expect(mockFileStorage.upload).toHaveBeenCalledWith(
      Buffer.from('Содержимое файла'),
      'user-123'
    );
    
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveBeenCalledWith(expect.any(Note));
  });

  test('✅ Получение существующей заметки', async () => {
    // Arrange
    const command = new CreateNoteCommand(
      'user-123',
      'Тестовая заметка',
      Buffer.from('Содержимое')
    );
    const createdNote = await noteService.execute(command);
    
    const query = new GetNoteQuery(createdNote.id, 'user-123');

    // Act
    const foundNote = await noteService.execute(query);

    // Assert
    expect(foundNote).toBeDefined();
    expect(foundNote.id).toBe(createdNote.id);
    expect(foundNote.ownerId).toBe('user-123');
    expect(foundNote.title).toBe('Тестовая заметка');
    
    expect(mockRepository.findById).toHaveBeenCalledWith(createdNote.id);
  });

  test('❌ Ошибка при получении несуществующей заметки', async () => {
    // Arrange
    const query = new GetNoteQuery('non-existent-id', 'user-123');

    // Act & Assert
    await expect(noteService.execute(query))
      .rejects
      .toThrow(NoteNotFoundException);
  });

  test('❌ Ошибка при доступе к чужой заметке', async () => {
    // Arrange
    const command = new CreateNoteCommand(
      'user-123',
      'Моя заметка',
      Buffer.from('Содержимое')
    );
    const createdNote = await noteService.execute(command);
    
    const query = new GetNoteQuery(createdNote.id, 'user-456');

    // Act & Assert
    await expect(noteService.execute(query))
      .rejects
      .toThrow(UnauthorizedNoteAccessException);
  });

  test('✅ Вызов FileStorage с корректным содержимым', async () => {
    // Arrange
    const fileContent = Buffer.from('Тестовое содержимое файла');
    const command = new CreateNoteCommand(
      'user-123',
      'Тест',
      fileContent
    );

    // Act
    await noteService.execute(command);

    // Assert
    expect(mockFileStorage.upload).toHaveBeenCalledWith(
      fileContent,
      'user-123'
    );
  });

  test('✅ Сохранение заметки в репозиторий', async () => {
    // Arrange
    const command = new CreateNoteCommand(
      'user-123',
      'Тест',
      Buffer.from('Содержимое')
    );

    // Act
    const note = await noteService.execute(command);

    // Assert
    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: note.id,
        ownerId: 'user-123',
        title: 'Тест',
        version: 1,
        isDeleted: false
      })
    );
  });
});