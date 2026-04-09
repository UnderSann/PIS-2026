// application/command/handlers/create_note_handler.js
const Note = require('../../../domain/entities/note');
const NoteId = require('../../../domain/value_objects/note_id');
const NoteTitle = require('../../../domain/value_objects/note_title');
const NoteContent = require('../../../domain/value_objects/note_content');
const OwnerId = require('../../../domain/value_objects/owner_id');

class CreateNoteHandler {
  #noteRepository;
  #eventBus;

  constructor(noteRepository, eventBus) {
    this.#noteRepository = noteRepository;
    this.#eventBus = eventBus;
  }

  async handle(command) {
    // 1. Создание Value Objects из примитивов команды
    const noteId = new NoteId(crypto.randomUUID()); // Генерация ID
    const ownerId = new OwnerId(command.ownerId);
    const title = new NoteTitle(command.title);
    const content = new NoteContent(command.content);

    // 2. Создание агрегата
    const note = new Note(noteId, ownerId, title, content);

    // 3. Сохранение через репозиторий
    await this.#noteRepository.save(note);

    // 4. Публикация доменных событий
    const events = note.pullEvents();
    for (const event of events) {
      await this.#eventBus.publish(event);
    }

    // 5. Возврат ID заметки (следуя CQRS)
    return noteId.value;
  }
}

module.exports = CreateNoteHandler;