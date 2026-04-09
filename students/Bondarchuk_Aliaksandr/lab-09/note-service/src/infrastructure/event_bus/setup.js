const EventBus = require('./in_memory_event_bus');
const NoteProjection = require('../projection/note_projection');

function setupProjections(sequelize, eventBus) {
  const projection = new NoteProjection(sequelize);
  
  eventBus.subscribe('NoteCreatedEvent', (event) => {
    projection.onNoteCreated(event);
  });
  
  eventBus.subscribe('NoteContentUpdatedEvent', (event) => {
    projection.onNoteContentUpdated(event);
  });
  
  eventBus.subscribe('NoteDeletedEvent', (event) => {
    projection.onNoteDeleted(event);
  });
  
  console.log('[EventBus] Projections registered');
}

module.exports = setupProjections;