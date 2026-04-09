const { Sequelize } = require('sequelize');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const NoteRepositoryImpl = require('../../../infrastructure/adapter/out/note_repository_impl');
const { NoteModel } = require('../../../infrastructure/orm/models/note_model');

describe('NoteRepository Integration Tests', () => {
  let container;
  let sequelize;
  let repository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    sequelize = new Sequelize(container.getDatabase(), {
      dialect: 'postgres',
      logging: false,
    });
    await NoteModel.initialize(sequelize);
    await sequelize.sync({ force: true });
    repository = new NoteRepositoryImpl();
  });

  afterAll(async () => {
    await sequelize.close();
    await container.stop();
  });

  test('should save and retrieve note by ID', async () => {
    const note = new Note(
      new NoteId('550e8400-e29b-41d4-a716-446655440000'),
      new OwnerId('user-int-1'),
      new NoteTitle('Integration Test'),
      new NoteContent('Saved in real DB')
    );

    await repository.save(note);
    const found = await repository.findById(note.id);

    expect(found).not.toBeNull();
    expect(found.title.value).toBe('Integration Test');
    expect(found.version).toBe(1);
  });

  test('should update note and increment version', async () => {
    const note = new Note();
    await repository.save(note);
    
    note.updateContent(new NoteContent('Updated text'));
    await repository.save(note);

    const found = await repository.findById(note.id);
    expect(found.version).toBe(2);
    expect(found.content.value).toBe('Updated text');
  });

  test('findByOwnerId should exclude deleted notes by default', async () => {
    const ownerId = new OwnerId('user-owner');
    const activeNote = new Note();
    const deletedNote = new Note();
    deletedNote.delete();
    
    await repository.save(activeNote);
    await repository.save(deletedNote);

    const notes = await repository.findByOwnerId(ownerId, false);
    expect(notes).toHaveLength(1);
    expect(notes[0].isDeleted).toBe(false);
  });
});