const { Op } = require('sequelize');

class NoteProjection {
  constructor(readModel, eventBus) {
    this.readModel = readModel;
    this.setupEventHandlers(eventBus);
  }

  setupEventHandlers(eventBus) {
    // Подписка на события от Write Model
    eventBus.subscribe('NoteCreatedEvent', this.handleNoteCreated.bind(this));
    eventBus.subscribe('NoteContentUpdatedEvent', this.handleNoteUpdated.bind(this));
    eventBus.subscribe('NoteDeletedEvent', this.handleNoteDeleted.bind(this));
  }

  async handleNoteCreated(event) {
    const { note } = event.payload;
    
    // Денормализация данных для Read Model
    await this.readModel.upsert({
      id: note.id.value,
      owner_id: note.ownerId.value,
      title: note.title.value,
      content_preview: note.content.value.substring(0, 500),
      content_full: note.content.value,
      version: note.version,
      is_deleted: note.isDeleted,
      word_count: this.calculateWordCount(note.content.value),
      last_edited_by: note.ownerId.value,
      tags: this.extractTags(note.content.value),
      sync_status: 'synced',
      created_at: note.createdAt,
      updated_at: note.updatedAt,
    });
    
    console.log(`[Projection] NoteReadView created for note ${note.id.value}`);
  }

  async handleNoteUpdated(event) {
    const { note, newContent } = event.payload;
    
    await this.readModel.update({
      content_preview: newContent.value.substring(0, 500),
      content_full: newContent.value,
      version: note.version,
      word_count: this.calculateWordCount(newContent.value),
      last_edited_by: note.ownerId.value,
      tags: this.extractTags(newContent.value),
      updated_at: new Date(),
      sync_status: 'pending', 
    }, {
      where: { id: note.id.value },
    });
    
    console.log(`[Projection] NoteReadView updated for note ${note.id.value}`);
  }

  async handleNoteDeleted(event) {
    const { note } = event.payload;
    
    // Мягкое удаление в Read Model
    await this.readModel.update({
      is_deleted: true,
      sync_status: 'pending',
      updated_at: new Date(),
    }, {
      where: { id: note.id.value },
    });
    
    console.log(`[Projection] NoteReadView soft-deleted for note ${note.id.value}`);
  }

  calculateWordCount(content) {
    return content.trim().split(/\s+/).length;
  }

  extractTags(content) {
    // Извлечение хештегов #tag из контента
    const hashtagRegex = /#[\w\u0400-\u04FF]+/g;
    const matches = content.match(hashtagRegex);
    return matches ? [...new Set(matches)] : [];
  }
}

module.exports = NoteProjection;