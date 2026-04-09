const { Sequelize } = require('sequelize');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const InMemoryEventBus = require('../../infrastructure/event_bus/in_memory_event_bus');
const NoteProjection = require('../../infrastructure/projection/note_projection');
const NoteReadView = require('../../infrastructure/read_model/note_read_view');

describe('CQRS Projection Tests', () => {
  let container;
  let sequelize;
  let readModel;
  let eventBus;
  let projection;

  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    sequelize = new Sequelize(container.getDatabase(), { dialect: 'postgres' });
    readModel = NoteReadView.initialize(sequelize);
    await sequelize.sync({ force: true });
    
    eventBus = new InMemoryEventBus();
    projection = new NoteProjection(readModel, eventBus);
  });

  afterAll(async () => {
    await sequelize.close();
    await container.stop();
  });

  test('NoteCreated event should create NoteReadView', async () => {
    const note = createTestNote();
    const event = new NoteCreatedEvent(note);
    
    await eventBus.publish(event);
    
    // Даем время на асинхронную обработку
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const view = await readModel.findByPk(note.id.value);
    expect(view).not.toBeNull();
    expect(view.title).toBe(note.title.value);
    expect(view.word_count).toBe(2);
  });

  test('NoteUpdated event should update NoteReadView', async () => {
    const note = createTestNote();
    await readModel.create({ id: note.id.value, /* ... */ });
    
    const newContent = 'Updated content with #test';
    const event = new NoteContentUpdatedEvent(note, newContent);
    
    await eventBus.publish(event);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const view = await readModel.findByPk(note.id.value);
    expect(view.content_full).toBe(newContent);
    expect(view.tags).toContain('#test');
    expect(view.sync_status).toBe('pending');
  });

  test('NoteDeleted event should soft delete NoteReadView', async () => {
    const note = createTestNote();
    await readModel.create({ id: note.id.value, is_deleted: false });
    
    const event = new NoteDeletedEvent(note);
    await eventBus.publish(event);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const view = await readModel.findByPk(note.id.value);
    expect(view.is_deleted).toBe(true);
  });
});