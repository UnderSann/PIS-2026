class NoteApplicationService {
  #createNoteHandler;
  #updateNoteContentHandler;
  #deleteNoteHandler;
  #getNoteByIdHandler;
  #listNotesByOwnerHandler;
  #getSyncStatusHandler;

  constructor(
    createNoteHandler,
    updateNoteContentHandler,
    deleteNoteHandler,
    getNoteByIdHandler,
    listNotesByOwnerHandler,
    getSyncStatusHandler
  ) {
    this.#createNoteHandler = createNoteHandler;
    this.#updateNoteContentHandler = updateNoteContentHandler;
    this.#deleteNoteHandler = deleteNoteHandler;
    this.#getNoteByIdHandler = getNoteByIdHandler;
    this.#listNotesByOwnerHandler = listNotesByOwnerHandler;
    this.#getSyncStatusHandler = getSyncStatusHandler;
  }

  // Команды
  async createNote(command) {
    return this.#createNoteHandler.handle(command);
  }

  async updateNoteContent(command) {
    return this.#updateNoteContentHandler.handle(command);
  }

  async deleteNote(command) {
    return this.#deleteNoteHandler.handle(command);
  }

  // Запросы
  async getNoteById(query) {
    return this.#getNoteByIdHandler.handle(query);
  }

  async listNotesByOwner(query) {
    return this.#listNotesByOwnerHandler.handle(query);
  }

  async getSyncStatus(query) {
    return this.#getSyncStatusHandler.handle(query);
  }
}

module.exports = NoteApplicationService;