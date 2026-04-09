// application/query/handlers/get_note_by_id_handler.js
const NoteId = require('../../../domain/value_objects/note_id');
const NoteDto = require('../dto/note_dto');

class GetNoteByIdHandler {
  #noteRepository;

  constructor(noteRepository) {
    this.#noteRepository = noteRepository;
  }

  async handle(query) {
    // 1. Преобразование в Value Object
    const noteId = new NoteId(query.noteId);

    // 2. Поиск в репозитории
    const note = await this.#noteRepository.findById(noteId);
    if (!note) {
      return null; // Или throw new NotFoundError('Note not found')
    }

    // 3. Преобразование в DTO для чтения
    return new NoteDto(
      note.id.value,
      note.ownerId.value,
      note.title.value,
      note.content.value,
      note.version,
      note.isDeleted,
      note.createdAt,
      note.updatedAt
    );
  }
}

module.exports = GetNoteByIdHandler;